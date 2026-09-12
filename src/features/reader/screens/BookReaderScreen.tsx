import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import type { RootStackParamList } from '@/app/navigation/types';
import { useSheet } from '@/components/ui';
import type { BookPdfSource } from '@/constants/books';
import { ROUTES } from '@/constants/routes';
import { BookPageFlip, type BookPageFlipHandle } from '@/features/reader/components/BookPageFlip';
import { ReaderBoundary } from '@/features/reader/components/ReaderBoundary';
import { ReaderChrome } from '@/features/reader/components/ReaderChrome';
import { ReaderError } from '@/features/reader/components/ReaderError';
import { ReaderLocked } from '@/features/reader/components/ReaderLocked';
import { ReaderSettingsSheet } from '@/features/reader/components/ReaderSettingsSheet';
import { ReaderStageSkeleton } from '@/features/reader/components/ReaderStageSkeleton';
import { MAX_SCALE, MIN_SCALE, SCALE_STEP } from '@/features/reader/constants';
import { useBookmarkToggle, useHighlights } from '@/hooks/useAccount';
import { useBook } from '@/hooks/useCatalog';
import { downloadPdf, resolvePdfSource } from '@/services/pdf';
import {
  flushPositions,
  getPosition,
  pullPosition,
  recordPosition,
} from '@/services/readingPosition';
import { useAccess } from '@/lib/access';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { useReaderSurface } from '@/features/reader/useReaderSurface';

/** How close two reported taps have to be before the second is a duplicate. */
const TOGGLE_GUARD_MS = 220;

/**
 * How long the reader has to stay on a page before it counts as *their* page.
 *
 * Not every page in view is the one the reader is on. Flicking back three
 * leaves to find a name and closing the book should not reopen it three
 * leaves back; neither should a glance at the last page to see how long the
 * book is mark it finished. So a page only becomes the saved position once
 * the reader has settled on it — and a page arrived at by a jump (go-to, or a
 * run of turns) has to earn it for longer than the next page over, because a
 * single turn is almost always reading and a jump is almost always looking.
 *
 * The page on screen and the progress rule follow every turn instantly; only
 * what is *remembered* waits. Closing the book mid-wait remembers nothing
 * new, which is exactly the point.
 */
const SETTLE_TURN_MS = 2500;
const SETTLE_JUMP_MS = 8000;

type BookReaderRouteProp = RouteProp<RootStackParamList, 'BookReader'>;
type BookReaderNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BookReader'>;

/**
 * The reading screen, behind a boundary.
 *
 * Nothing that happens to one book should be able to close the app, so a throw
 * anywhere in here lands on the reader's own failure screen and "Try again"
 * rebuilds the screen from scratch.
 */
type PdfError = {
  code?: string;
  message?: string;
  name?: string;
  status?: number;
};

/**
 * What to tell the reader when a book will not open.
 *
 * `PREMIUM_REQUIRED` is the paywall — every book needs a membership, so this is
 * the ordinary refusal rather than an edge case.
 *
 * The two file codes are emphatically *not* paywalls, and saying "subscribe" to
 * a member whose book is simply missing from storage would be both wrong and
 * insulting. `PDF_NOT_AVAILABLE` means no file has been attached to the book;
 * `PDF_NOT_IN_STORAGE` means the row points at an object that is not there.
 * Either way the reader has done nothing wrong and nothing they do will fix it,
 * so the copy says so and points at support.
 *
 * A 404 `NOT_FOUND` covers a book that has been removed *and* an unpublished
 * draft — the gate deliberately answers the same way for both, so that asking
 * for a draft's id cannot confirm it exists. One message serves both.
 *
 * A 401 is matched on the *status*, never on the code. A session that has
 * expired or been mangled is rejected by the functions gateway before
 * `get-signed-pdf` runs, so it answers with codes of its own
 * (`UNAUTHORIZED_INVALID_JWT_FORMAT`, `UNAUTHORIZED_NO_AUTH_HEADER`) and a
 * message — "Invalid JWT" — that would be shown to a reader verbatim. Only the
 * signed-out path actually reaches the function and answers `AUTH_REQUIRED`,
 * so the status is the one thing common to all of them.
 */
function pdfErrorMessage(error: PdfError): string {
  if (error?.code === 'PREMIUM_REQUIRED') {
    return 'An active subscription is required to open this book.';
  }
  if (error?.code === 'PDF_NOT_AVAILABLE' || error?.code === 'PDF_NOT_IN_STORAGE') {
    return 'This book’s file is missing from our library. Nothing is wrong with your membership — please report it and we will restore it.';
  }
  if (error?.status === 401) {
    return 'Your session has expired. Sign in again to keep reading.';
  }
  if (error?.status === 404) {
    return 'This book is no longer available.';
  }
  return error?.message || 'Unable to open this book.';
}

export function BookReaderScreen() {
  return (
    <ReaderBoundary>
      <BookReader />
    </ReaderBoundary>
  );
}

function BookReader() {
  const navigation = useNavigation<BookReaderNavigationProp>();
  const route = useRoute<BookReaderRouteProp>();
  const bookId = route.params.bookId;
  const { data: book } = useBook(bookId);
  const userId = useAuthStore(state => state.userId);

  const [pdfSource, setPdfSource] = useState<BookPdfSource | null>(null);
  const [sourceError, setSourceError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  // The zoom the reader asked for. The document view follows it, never the
  // other way round, so the controls can never end up describing a zoom that
  // is not the one on screen.
  const [controlScale, setControlScale] = useState(MIN_SCALE);
  /**
   * Where the book opens: the page on disk from the last sitting, read before
   * the first render so the document never shows page 1 on its way there.
   * The server is asked behind it — see `pullPosition` below — and a newer
   * answer moves the book once it is up.
   */
  const [startPage, setStartPage] = useState(
    () => (userId ? getPosition(userId, bookId)?.page : undefined) ?? 1,
  );
  const [page, setPage] = useState(startPage);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loaderVisible, setLoaderVisible] = useState(true);
  const [hasError, setHasError] = useState(false);
  // Chrome starts hidden — the page is what the reader came for.
  const [chromeVisible, setChromeVisible] = useState(false);
  // The flip reader's one line of instruction, which leaves the first time the
  // reader touches the page and does not come back for the rest of the sitting.
  const [pageTouched, setPageTouched] = useState(false);
  const [brightness, setBrightness] = useState(1);
  // Bumping this token re-runs the source effect; that is the retry path.
  const [retryToken, setRetryToken] = useState(0);
  /**
   * The screen has finished sliding in, and is not on its way out.
   *
   * The heavy things wait for this. A native document view created mid-slide
   * and a blur sampling the window on every frame of it are the difference
   * between a screen that glides in and one that stutters in; the skeleton
   * is on stage from the first frame regardless, so nothing is seen to wait.
   */
  const [settled, setSettled] = useState(false);
  /** Set once the screen has settled, and kept: the book stays up on the way out. */
  const [entered, setEntered] = useState(false);
  const settingsSheet = useSheet();
  // The stage follows the app's theme; only the page itself follows the tone.
  const surface = useReaderSurface();
  // Page tone is a reading default, shared with the Appearance screen.
  const pageTone = useThemeStore(state => state.pageTone);
  const setPageTone = useThemeStore(state => state.setPageTone);
  const readingMode = useThemeStore(state => state.readingMode);
  const setReadingMode = useThemeStore(state => state.setReadingMode);
  /** Set once a download completes, so the error state can offer it. */
  const downloadedUri = useRef<string | null>(null);
  const { canOpenBooks, isAuthenticated, isSubscriptionLoading, reason } = useAccess();
  /** True once a page has actually been on screen for this book. */
  const hasOpened = useRef(false);
  /** The membership ended with the book open, rather than before it opened. */
  const [lockedMidRead, setLockedMidRead] = useState(false);
  // Only the stable `mutate` is kept: the mutation object itself is new on
  // every render, and anything keyed on it would be rebuilt on every render.
  const { mutate: toggleBookmark } = useBookmarkToggle(bookId);
  // `highlights-list` filters to this book server-side, and starts from the
  // on-disk mirror so the button knows the page's state on the first frame.
  const { data: highlights } = useHighlights(bookId);
  const lastToggle = useRef(0);
  /** The wait for the page in view to become the page remembered. */
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The last page that was remembered, so the next can tell a turn from a jump. */
  const settledPage = useRef(startPage);
  /** True once the document has loaded, so a late server position jumps rather than seeds. */
  const documentReady = useRef(false);
  /** `page`, readable from an effect without being a dependency of it. */
  const pageRef = useRef(startPage);
  const flipRef = useRef<BookPageFlipHandle>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigation.replace(ROUTES.LOGIN, { returnTo: { bookId } });
      return;
    }
    if (isSubscriptionLoading) {
      return;
    }
    if (!canOpenBooks) {
      // Only on the way in. A membership that ends mid-read is not a wrong turn
      // to be undone — it is handled below, after the page is saved.
      if (!hasOpened.current) {
        navigation.replace(ROUTES.BOOK_DETAIL, { bookId });
      }
      return;
    }

    let active = true;
    const abort = new AbortController();
    setPdfSource(null);
    setSourceError(false);
    setErrorMessage(null);
    documentReady.current = false;
    const cached = (userId ? getPosition(userId, bookId)?.page : undefined) ?? 1;
    pageRef.current = cached;
    settledPage.current = cached;
    setStartPage(cached);
    setPage(cached);
    setTotalPages(0);
    setIsLoading(true);
    setLoadProgress(0);
    setLoaderVisible(true);
    setHasError(false);
    setControlScale(MIN_SCALE);
    void resolvePdfSource(bookId, {
      signal: abort.signal,
      onProgress: ({ percent }) => {
        if (active) {
          setLoadProgress(prev => (prev != null && percent < prev ? prev : percent));
        }
      },
    })
      .then(source => {
        if (active) {
          hasOpened.current = true;
          setPdfSource(source);
        }
      })
      .catch((error: PdfError) => {
        if (!active || error?.name === 'AbortError') {
          return;
        }
        setSourceError(true);
        setErrorMessage(pdfErrorMessage(error));
        setIsLoading(false);
        setLoaderVisible(false);
      });
    return () => {
      active = false;
      abort.abort();
    };
  }, [bookId, canOpenBooks, isAuthenticated, isSubscriptionLoading, navigation, retryToken, userId]);

  /**
   * Asks the server where this book was left, behind the page already up.
   *
   * The cache answered first; this is the correction. A newer position — from
   * another device, or a sitting this device never got to send — either
   * re-seeds the start page if the document is still loading, or turns the
   * book to it if it is not. The same page, or an older one, changes nothing:
   * `pullPosition` has already merged it and handed back whichever won.
   */
  useEffect(() => {
    if (!userId || !canOpenBooks) {
      return;
    }
    let active = true;
    void pullPosition(userId, bookId).then(position => {
      if (!active || !position) {
        return;
      }
      if (position.page === pageRef.current) {
        return;
      }
      if (documentReady.current) {
        flipRef.current?.goTo(position.page);
        return;
      }
      // Still loading: re-seed. The stage is keyed on the start page, so the
      // document view comes back up on the new one rather than page 1.
      pageRef.current = position.page;
      settledPage.current = position.page;
      setStartPage(position.page);
      setPage(position.page);
    });
    return () => {
      active = false;
    };
  }, [bookId, canOpenBooks, userId, retryToken]);

  /** Plans live in the profile stack, which the reader sits above. */
  const openPaywall = useCallback(() => {
    navigation.navigate(ROUTES.MAIN_TABS, {
      screen: ROUTES.PROFILE,
      params: { screen: 'Subscription' },
    });
  }, [navigation]);

  /**
   * Sends whatever has been remembered to the server. A page still waiting to
   * settle is abandoned, not hurried: the reader left before it was theirs.
   */
  const flushProgress = useCallback(() => {
    if (settleTimer.current) {
      clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
    if (userId) {
      void flushPositions(userId);
    }
  }, [userId]);

  useEffect(() => () => flushProgress(), [flushProgress]);

  /**
   * The membership ending while the book is open.
   *
   * The countdown in `accessStore` fires to the second, offline included, so
   * this runs whether or not anything reached the device. The order matters:
   * the page is flushed first, then the book is closed, so a reader who renews
   * a minute later opens on the page they were on. Nothing is deleted — not
   * progress, not highlights, not downloads.
   *
   * Regaining access clears the lock in place, which is what lets a renewal
   * recover the screen without restarting the app.
   */
  useEffect(() => {
    if (canOpenBooks) {
      setLockedMidRead(false);
      return;
    }
    if (!hasOpened.current) {
      return;
    }
    flushProgress();
    setLockedMidRead(true);
    setPdfSource(null);
  }, [canOpenBooks, flushProgress]);

  const handleLoadComplete = useCallback((numberOfPages: number) => {
    documentReady.current = true;
    setTotalPages(numberOfPages);
    setLoadProgress(100);
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleLoadProgress = useCallback((percent: number) => {
    const value = percent <= 1 ? percent * 100 : percent;
    const next = Math.round(Math.max(0, Math.min(100, value)));
    setLoadProgress(prev => Math.max(prev ?? 0, next));
  }, []);

  /**
   * A page turned. The screen follows it now; the saved position follows it
   * once the reader has stayed — see `SETTLE_TURN_MS`. Every turn restarts
   * the wait, so a run of turns only ever remembers the page it ends on.
   */
  const handlePageChanged = useCallback(
    (currentPage: number, numberOfPages: number) => {
      const landed =
        numberOfPages > 0 ? Math.min(Math.max(1, currentPage), numberOfPages) : currentPage;
      pageRef.current = landed;
      setPage(landed);
      setTotalPages(numberOfPages);
      if (settleTimer.current) {
        clearTimeout(settleTimer.current);
        settleTimer.current = null;
      }
      if (!userId || numberOfPages <= 0) {
        return;
      }
      // The page the book opened on is already the remembered one; it only
      // needs its timestamp refreshed, and that can happen at once.
      const distance = Math.abs(landed - settledPage.current);
      const wait = distance === 0 ? 0 : distance === 1 ? SETTLE_TURN_MS : SETTLE_JUMP_MS;
      settleTimer.current = setTimeout(() => {
        settleTimer.current = null;
        settledPage.current = landed;
        recordPosition(userId, bookId, landed, numberOfPages);
        void flushPositions(userId);
      }, wait);
    },
    [bookId, userId],
  );

  const handleError = useCallback((message?: string) => {
    setHasError(true);
    setErrorMessage(message || 'This PDF could not be displayed.');
    setIsLoading(false);
    setLoaderVisible(false);
  }, []);

  const hideLoader = useCallback(() => {
    setLoaderVisible(false);
  }, []);

  useEffect(() => {
    const onEnd = navigation.addListener('transitionEnd', event => {
      if (!event.data.closing) {
        setSettled(true);
        setEntered(true);
      }
    });
    const onStart = navigation.addListener('transitionStart', event => {
      if (event.data.closing) setSettled(false);
    });
    // A transition that never reports — a stack configured without one, or a
    // platform that does not say — must not leave the book unopened.
    const fallback = setTimeout(() => {
      setSettled(true);
      setEntered(true);
    }, 700);
    return () => {
      onEnd();
      onStart();
      clearTimeout(fallback);
    };
  }, [navigation]);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      const uri = await downloadPdf(bookId);
      downloadedUri.current = uri;
      setPdfSource({ uri });
    } catch {
      // Keep the open document visible if an offline download fails.
    } finally {
      setIsDownloading(false);
    }
  }, [bookId]);

  /** The bookmark on the page in view, if the reader has already set one. */
  const bookmark = useMemo(
    () => (highlights ?? []).find(row => row.page_number === page) ?? null,
    [highlights, page],
  );

  /**
   * One button, both directions, one round trip.
   *
   * `highlights-toggle` decides the direction from the row it finds, so the
   * button does not have to know — and the list flips optimistically, so the
   * icon answers the tap rather than the network.
   */
  const handleHighlight = useCallback(() => {
    if (page <= 0) {
      return;
    }
    toggleBookmark(page);
  }, [page, toggleBookmark]);

  const applyScale = useCallback((next: number) => {
    setControlScale(Number(Math.min(Math.max(next, MIN_SCALE), MAX_SCALE).toFixed(2)));
  }, []);

  const handleZoomIn = useCallback(() => {
    applyScale(controlScale + SCALE_STEP);
  }, [applyScale, controlScale]);

  const handleZoomOut = useCallback(() => {
    applyScale(controlScale - SCALE_STEP);
  }, [applyScale, controlScale]);

  /**
   * One tap, one toggle. The native document view can report a tap more than
   * once for a single touch, and a chrome that opens and shuts again reads as a
   * broken tap, so a repeat inside the animation's own window is ignored.
   */
  const toggleChrome = useCallback(() => {
    const now = Date.now();
    if (now - lastToggle.current < TOGGLE_GUARD_MS) return;
    lastToggle.current = now;
    setChromeVisible(current => !current);
  }, []);

  /**
   * The reader has put a finger on the page, so they have found it. Set once
   * and never unset: the hint has said its piece.
   */
  const handlePageTouched = useCallback(() => {
    setPageTouched(true);
  }, []);

  /** Bookmarking from the sheet also closes it — the action is complete. */
  const handleBookmarkFromSheet = useCallback(() => {
    handleHighlight();
    settingsSheet.close();
  }, [handleHighlight, settingsSheet]);

  const handleDownloadFromSheet = useCallback(() => {
    void handleDownload();
  }, [handleDownload]);

  const handleGoToPage = useCallback(
    (target: number) => {
      settingsSheet.close();
      flipRef.current?.goTo(target);
    },
    [settingsSheet],
  );

  const handleRetry = useCallback(() => {
    setRetryToken(token => token + 1);
  }, []);

  const handleReadDownloaded = useCallback(() => {
    const uri = downloadedUri.current;
    if (uri) {
      setSourceError(false);
      setHasError(false);
      setErrorMessage(null);
      setIsLoading(true);
      setLoaderVisible(true);
      setPdfSource({ uri });
    }
  }, []);

  const canZoomOut = controlScale > MIN_SCALE;
  const canZoomIn = controlScale < MAX_SCALE;
  const zoomPercent = Math.round(controlScale * 100);
  const bookTitle = book?.title?.trim() || 'Book';
  const blocked = hasError || sourceError;

  // Ahead of the error state: a lock is not a fault, and offering "retry" for
  // an ended membership would be telling the reader to try the door again.
  if (lockedMidRead) {
    return (
      <ReaderLocked
        page={page}
        reason={reason}
        onRenew={openPaywall}
        onClose={() => navigation.goBack()}
      />
    );
  }

  if (blocked) {
    return (
      <ReaderError
        page={page > 1 ? page : undefined}
        message={errorMessage ?? undefined}
        onRetry={handleRetry}
        onReadDownloaded={downloadedUri.current ? handleReadDownloaded : undefined}
      />
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: surface.stage }]}>
      <ReaderChrome
        title={bookTitle}
        page={page}
        totalPages={totalPages}
        visible={chromeVisible}
        hint={readingMode === 'flip' && !pageTouched && !isLoading && totalPages > 1}
        // The blur waits for the screen to settle and the book to be up: while
        // either is still moving, it would be sampling the window every frame.
        glass={settled && !loaderVisible}
        saved={Boolean(bookmark)}
        onBack={() => navigation.goBack()}
        onOpenSettings={settingsSheet.open}
        onBookmark={handleHighlight}>
        {pdfSource && entered ? (
          <ReaderBoundary>
            <BookPageFlip
              ref={flipRef}
              // Keyed on the start page as well: a newer position that lands
              // while the file is still loading reopens it there, once.
              key={`${bookId}:${startPage}`}
              source={pdfSource}
              initialPage={startPage}
              scale={controlScale}
              onLoadComplete={handleLoadComplete}
              onLoadProgress={handleLoadProgress}
              onError={handleError}
              onPageChanged={handlePageChanged}
              onSingleTap={toggleChrome}
              onFirstTouch={handlePageTouched}
            />
          </ReaderBoundary>
        ) : null}
      </ReaderChrome>

      {/* The page dimmer. Sits above the page, below the chrome. */}
      {brightness < 1 ? (
        <View pointerEvents="none" style={[styles.dimmer, { opacity: (1 - brightness) * 0.75 }]} />
      ) : null}

      {loaderVisible ? (
        <ReaderStageSkeleton ready={!isLoading} progress={loadProgress} onFinished={hideLoader} />
      ) : null}

      <ReaderSettingsSheet
        visible={settingsSheet.visible}
        onClose={settingsSheet.close}
        tone={pageTone}
        onToneChange={setPageTone}
        readingMode={readingMode}
        onReadingModeChange={setReadingMode}
        brightness={brightness}
        onBrightnessChange={setBrightness}
        zoomPercent={zoomPercent}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onBookmark={handleBookmarkFromSheet}
        isBookmarked={Boolean(bookmark)}
        onGoToPage={handleGoToPage}
        page={page}
        totalPages={totalPages}
        onDownload={handleDownloadFromSheet}
        isDownloading={isDownloading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dimmer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
  },
});
