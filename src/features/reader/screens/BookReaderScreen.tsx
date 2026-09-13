import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import type { RootStackParamList } from '@/app/navigation/types';
import { useSheet } from '@/components/ui';
import type { BookPdfSource } from '@/constants/books';
import { ROUTES } from '@/constants/routes';
import {
  BookPageFlip,
  type BookPageFlipHandle,
} from '@/features/reader/components/BookPageFlip';
import { ReaderBoundary } from '@/features/reader/components/ReaderBoundary';
import { ReaderChrome } from '@/features/reader/components/ReaderChrome';
import { ReaderError } from '@/features/reader/components/ReaderError';
import { ReaderLocked } from '@/features/reader/components/ReaderLocked';
import { ReaderSettingsSheet } from '@/features/reader/components/ReaderSettingsSheet';
import { ReaderStageSkeleton } from '@/features/reader/components/ReaderStageSkeleton';
import { MAX_SCALE, MIN_SCALE, SCALE_STEP } from '@/features/reader/constants';
import {
  useBookmarkToggle,
  useHighlights,
  useRemoveDownload,
} from '@/hooks/useAccount';
import { useBook } from '@/hooks/useCatalog';
import { keepBook, openBook, releaseBook } from '@/services/bookVault';
import { useBookKept } from '@/hooks/useBookVault';
import { isAbortError } from '@/services/pdf';
import {
  flushPositions,
  getPosition,
  pullPosition,
  recordPosition,
} from '@/services/readingPosition';
import { useAccess } from '@/lib/access';
import type { AccessReason } from '@/services/api/types';
import { reasonCopy } from '@/services/entitlements';
import { useAccessStore } from '@/stores/accessStore';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { useKeepScreenAwake } from '@/features/reader/useKeepScreenAwake';
import { useReaderSurface } from '@/features/reader/useReaderSurface';

/** How close two reported taps have to be before the second is a duplicate. */
const TOGGLE_GUARD_MS = 220;

/**
 * How long a run of page turns is left to end before the server is told.
 *
 * Every turn is remembered on the device the instant it happens — a single
 * synchronous write, see `recordPosition` — so the page on screen is always
 * the page the book will reopen on, however fast the reader is turning and
 * however abruptly the app is closed. Only the *network* waits: a reader
 * flicking through ten pages should cost one request, not ten, so the push
 * is held until the turning stops. Closing the book sooner than that does
 * not lose anything — the position is already pending on disk, and it goes
 * up on unmount, on the next background, and on the next launch.
 */
const PUSH_DEBOUNCE_MS = 1500;

/**
 * The loader's budget.
 *
 * Two things happen before a page is on screen: the file arrives (a stream
 * from the network, or an unseal from the vault), and then Pdfium parses it.
 * The first reports real progress; the second reports nothing for a local
 * file until it is done. Giving the transfer the whole ring meant a book
 * from the vault read "100%" for the seconds the parser was still working,
 * and a download whose size the server withheld sat on "0%" until it landed.
 *
 * So the transfer owns the ring up to `TRANSFER_SHARE`, and from there the
 * ring eases towards 99 on a clock — closing a fixed fraction of the gap
 * each tick, so it visibly keeps moving and never quite arrives — until the
 * document says it is up, which is the only thing that draws 100.
 */
const TRANSFER_SHARE = 88;
const RENDER_CEILING = 99;
const RENDER_TICK_MS = 100;
const RENDER_EASE = 0.06;

type BookReaderRouteProp = RouteProp<RootStackParamList, 'BookReader'>;
type BookReaderNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'BookReader'
>;

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
 * `PREMIUM_REQUIRED` never reaches here — that is the paywall, not a fault,
 * and the screen answers it with the lock rather than an error. Likewise a
 * 401, which sends the reader to sign in. Both are handled where the source
 * is resolved.
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
 */
function pdfErrorMessage(error: PdfError): string {
  if (
    error?.code === 'PDF_NOT_AVAILABLE' ||
    error?.code === 'PDF_NOT_IN_STORAGE'
  ) {
    return 'This book’s file is missing from our library. Nothing is wrong with your membership — please report it and we will restore it.';
  }
  if (error?.status === 404) {
    return 'This book is no longer available.';
  }
  return error?.message || 'Unable to open this book.';
}

/**
 * A 401 is matched on the *status*, never on the code. A session that has
 * expired or been mangled is rejected by the functions gateway before
 * `get-signed-pdf` runs, so it answers with codes of its own
 * (`UNAUTHORIZED_INVALID_JWT_FORMAT`, `UNAUTHORIZED_NO_AUTH_HEADER`) and a
 * message — "Invalid JWT" — that would be shown to a reader verbatim. Only the
 * signed-out path actually reaches the function and answers `AUTH_REQUIRED`,
 * so the status is the one thing common to all of them.
 */
function isSessionRejected(error: PdfError): boolean {
  return error?.status === 401;
}

/**
 * The wording the lock gets.
 *
 * The store's reason is the last thing the server said, and it can lag: a
 * membership that ended a minute ago still reads `active` here until the next
 * poll lands, and the local countdown or the backend's refusal is what locked
 * the book. A lock captioned "Membership active — you have full access" is
 * worse than no caption, so a reason that still grants access is not used:
 * `expired` when the countdown is what ran out, the plain pitch otherwise,
 * until the refresh corrects it.
 */
function lockReason(
  reason: AccessReason | null,
  expired: boolean,
): AccessReason {
  if (reason && !reasonCopy(reason).soft) {
    return reason;
  }
  return expired ? 'expired' : 'none';
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
  /** 0–100 while a download is running, for the tile; null otherwise. */
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  // Whether this book is kept offline — live, so the tile flips as it lands.
  const isKept = useBookKept(bookId);
  const removeDownload = useRemoveDownload();
  const bookTitle = book?.title?.trim() || 'Book';
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
  // The screen stays lit while a book is open, if the reader has asked for it.
  useKeepScreenAwake();
  /** Set once a download completes, so the error state can offer it. */
  const downloadedUri = useRef<string | null>(null);
  const { canOpenBooks, isAuthenticated, isSubscriptionLoading, reason } =
    useAccess();
  // Whether the local countdown is what locked the book, for the lock's wording.
  const expired = useAccessStore(state => state.expired);
  /** True once a page has actually been on screen for this book. */
  const hasOpened = useRef(false);
  /** The membership ended with the book open, rather than before it opened. */
  const [lockedMidRead, setLockedMidRead] = useState(false);
  /**
   * The backend refused to sign the book. The server is the gate, and its "no"
   * stands even when the local countdown still says yes — the countdown is
   * only ever a mirror of what the server last said, and it can be behind.
   */
  const [refused, setRefused] = useState(false);
  // Only the stable `mutate` and the `isPending` flag are kept: the mutation
  // object itself is new on every render, and anything keyed on it would be
  // rebuilt on every render.
  const { mutate: toggleBookmark, isPending: bookmarkPending } =
    useBookmarkToggle(bookId);
  // `highlights-list` filters to this book server-side, and starts from the
  // on-disk mirror so the button knows the page's state on the first frame.
  const { data: highlights } = useHighlights(bookId);
  const lastToggle = useRef(0);
  /** The wait for a run of turns to end before the page is pushed. */
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True once the document has loaded, so a late server position jumps rather than seeds. */
  const documentReady = useRef(false);
  /** True while the document view is mounted, so a re-seed knows it would remount. */
  const stageMounted = useRef(false);
  /** A server position that landed mid-parse, to turn to once the document is up. */
  const pendingJump = useRef<number | null>(null);
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
      // Nothing is fetched. The lock is drawn in place — see `locked` below —
      // rather than the reader being bounced somewhere else: the book stays on
      // the shelf, and this screen is where the membership is checked.
      return;
    }

    let active = true;
    const abort = new AbortController();
    setPdfSource(null);
    setSourceError(false);
    setRefused(false);
    setErrorMessage(null);
    documentReady.current = false;
    pendingJump.current = null;
    const cached =
      (userId ? getPosition(userId, bookId)?.page : undefined) ?? 1;
    pageRef.current = cached;
    setStartPage(cached);
    setPage(cached);
    setTotalPages(0);
    setIsLoading(true);
    setLoadProgress(0);
    setLoaderVisible(true);
    setHasError(false);
    setControlScale(MIN_SCALE);
    // The vault answers first when it can — an unseal into the cache, with no
    // network — and streams the book down otherwise. Either way the progress
    // drives the same bar, so the reader sees one thing happening.
    void openBook(bookId, {
      signal: abort.signal,
      onProgress: ({ percent }) => {
        if (active) {
          // The transfer's share of the ring, and never backwards: a retry
          // that restarts its count should not be seen to.
          const scaled = (percent / 100) * TRANSFER_SHARE;
          setLoadProgress(prev => (scaled < prev ? prev : scaled));
        }
      },
    })
      .then(({ uri }) => {
        if (active) {
          hasOpened.current = true;
          // The file is whole; the rest of the ring is the parser's.
          setLoadProgress(prev => Math.max(prev, TRANSFER_SHARE));
          setPdfSource({ uri });
        }
      })
      .catch((error: PdfError) => {
        if (!active || isAbortError(error)) {
          return;
        }
        setIsLoading(false);
        setLoaderVisible(false);
        if (error?.code === 'PREMIUM_REQUIRED') {
          // The paywall, not a fault: the lock, never "try again". The store
          // is re-read behind it so the rest of the app catches up with what
          // the server just said, and a renewal unlocks this screen in place.
          setRefused(true);
          void useAccessStore.getState().refresh();
          return;
        }
        if (isSessionRejected(error)) {
          navigation.replace(ROUTES.LOGIN, { returnTo: { bookId } });
          return;
        }
        setSourceError(true);
        setErrorMessage(pdfErrorMessage(error));
      });
    return () => {
      active = false;
      abort.abort();
    };
  }, [
    bookId,
    canOpenBooks,
    isAuthenticated,
    isSubscriptionLoading,
    navigation,
    retryToken,
    userId,
  ]);

  /**
   * Closing the book deletes its plaintext from the cache. Only on the way
   * out — a retry or a membership change re-runs the source effect above
   * without leaving the screen, and must not pull the file from under the
   * renderer. The vault waits for any seal still in flight before deleting.
   */
  useEffect(
    () => () => {
      void releaseBook(bookId);
    },
    [bookId],
  );

  // Mirrors whether the document view is on stage, for the position pull
  // below to read without being re-run by it.
  useEffect(() => {
    stageMounted.current = Boolean(pdfSource && entered);
  }, [entered, pdfSource]);

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
      if (stageMounted.current) {
        // The document view is up and parsing. Re-seeding now would remount
        // it — the stage is keyed on the start page — and parse the whole
        // book a second time, which is the difference between a book that
        // opens once and one that is seen to load twice. The page is held
        // and turned to the moment the document reports in.
        pendingJump.current = position.page;
        return;
      }
      // The file is not here yet, so nothing is parsing: re-seed. The
      // document view will come up on the new page rather than page 1.
      pageRef.current = position.page;
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
   * Sends whatever is pending to the server now. A push still being held for
   * the debounce is hurried, not dropped: the page is already on disk, and
   * leaving the book is the best moment to send it.
   */
  const flushProgress = useCallback(() => {
    if (pushTimer.current) {
      clearTimeout(pushTimer.current);
      pushTimer.current = null;
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
    // A newer position that arrived while the book was parsing: turn to it
    // now, in place, rather than having reopened the book to start there.
    const jump = pendingJump.current;
    if (jump != null) {
      pendingJump.current = null;
      if (jump !== pageRef.current) {
        pageRef.current = jump;
        flipRef.current?.goTo(jump);
      }
    }
  }, []);

  /**
   * The parser's own word, when it gives one (it does for a remote source,
   * rarely for a file). Mapped into the render share of the ring, so it
   * agrees with the clock-driven ease rather than fighting it.
   */
  const handleLoadProgress = useCallback((percent: number) => {
    const value = percent <= 1 ? percent * 100 : percent;
    const ratio = Math.max(0, Math.min(1, value / 100));
    const next = TRANSFER_SHARE + ratio * (RENDER_CEILING - TRANSFER_SHARE);
    setLoadProgress(prev => Math.max(prev ?? 0, next));
  }, []);

  /**
   * The render phase, on a clock. Runs from the moment the renderer has its
   * file until it reports the document up, closing a fixed fraction of what
   * is left each tick — so the ring is seen to keep moving through a parse
   * that says nothing, and on a fast device it is barely seen at all.
   */
  useEffect(() => {
    if (!pdfSource || !isLoading) {
      return undefined;
    }
    const timer = setInterval(() => {
      setLoadProgress(prev => {
        if (prev >= RENDER_CEILING) return prev;
        const gap = RENDER_CEILING - prev;
        return Math.min(
          RENDER_CEILING,
          prev + Math.max(0.15, gap * RENDER_EASE),
        );
      });
    }, RENDER_TICK_MS);
    return () => clearInterval(timer);
  }, [isLoading, pdfSource]);

  /**
   * A page turned. The screen and the saved position follow it now — the
   * write is synchronous, so by the time this returns the book will reopen
   * here. Only the push waits, and every turn restarts that wait, so a run of
   * turns costs one request for the page it ends on — see `PUSH_DEBOUNCE_MS`.
   */
  const handlePageChanged = useCallback(
    (currentPage: number, numberOfPages: number) => {
      const landed =
        numberOfPages > 0
          ? Math.min(Math.max(1, currentPage), numberOfPages)
          : currentPage;
      pageRef.current = landed;
      setPage(landed);
      setTotalPages(numberOfPages);
      if (!userId || numberOfPages <= 0) {
        return;
      }
      recordPosition(userId, bookId, landed, numberOfPages);
      if (pushTimer.current) {
        clearTimeout(pushTimer.current);
      }
      pushTimer.current = setTimeout(() => {
        pushTimer.current = null;
        void flushPositions(userId);
      }, PUSH_DEBOUNCE_MS);
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

  /**
   * The Download tile, both directions.
   *
   * A book that is open is already on disk, so keeping it is usually a seal
   * rather than a transfer, and the bar runs through in a moment. Removing a
   * download from inside the book demotes it to the cache — the file the
   * renderer is reading stays exactly where it is — and tells the backend.
   */
  const handleDownload = useCallback(() => {
    if (isKept) {
      Alert.alert(
        'Remove download?',
        `${bookTitle} will stay in your library but need a connection to open.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              removeDownload.mutate({ bookId, local: 'demote' });
            },
          },
        ],
      );
      return;
    }
    if (isDownloading) {
      return;
    }
    setIsDownloading(true);
    setDownloadProgress(0);
    void keepBook(bookId, {
      onProgress: ({ percent }) => setDownloadProgress(percent),
    })
      .then(({ uri }) => {
        if (uri) downloadedUri.current = uri;
      })
      .catch((error: unknown) => {
        // The open document stays up whatever happened to the download.
        Alert.alert(
          'Download failed',
          error instanceof Error && error.message
            ? error.message
            : 'The book could not be saved for offline reading. Please try again.',
        );
      })
      .finally(() => {
        setIsDownloading(false);
        setDownloadProgress(null);
      });
  }, [bookId, bookTitle, isDownloading, isKept, removeDownload]);

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
    setControlScale(
      Number(Math.min(Math.max(next, MIN_SCALE), MAX_SCALE).toFixed(2)),
    );
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

  /**
   * Bookmarking from the sheet leaves it open: the tile spins while the save
   * is away and draws its tick as it lands, and that is what the reader is
   * looking at. Closing under it would hide the answer.
   */
  const handleBookmarkFromSheet = handleHighlight;

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
      // The file is already here, so the ring starts where a transfer ends.
      setLoadProgress(TRANSFER_SHARE);
      setLoaderVisible(true);
      setPdfSource({ uri });
    }
  }, []);

  const canZoomOut = controlScale > MIN_SCALE;
  const canZoomIn = controlScale < MAX_SCALE;
  const zoomPercent = Math.round(controlScale * 100);
  const blocked = hasError || sourceError;

  /**
   * The membership check, made when the book is viewed and nowhere earlier.
   *
   * Three ways to be locked: arriving without access, the server refusing to
   * sign the file, and the membership ending mid-read. All three draw the same
   * screen in place, so a book stays on the shelf whatever the membership says
   * and the answer is given here, at the door, with the way to renew.
   */
  const locked =
    lockedMidRead ||
    refused ||
    (isAuthenticated && !isSubscriptionLoading && !canOpenBooks);

  // Ahead of the error state: a lock is not a fault, and offering "retry" for
  // an ended membership would be telling the reader to try the door again.
  if (locked) {
    return (
      <ReaderLocked
        page={page}
        reason={lockReason(reason, expired)}
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
        onReadDownloaded={
          downloadedUri.current ? handleReadDownloaded : undefined
        }
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
        hint={
          readingMode === 'flip' && !pageTouched && !isLoading && totalPages > 1
        }
        // The blur waits for the screen to settle and the book to be up: while
        // either is still moving, it would be sampling the window every frame.
        glass={settled && !loaderVisible}
        onBack={() => navigation.goBack()}
        onOpenMenu={settingsSheet.open}
      >
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
        <View
          pointerEvents="none"
          style={[styles.dimmer, { opacity: (1 - brightness) * 0.75 }]}
        />
      ) : null}

      {loaderVisible ? (
        <ReaderStageSkeleton
          ready={!isLoading}
          progress={loadProgress}
          onFinished={hideLoader}
        />
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
        isBookmarking={bookmarkPending}
        onGoToPage={handleGoToPage}
        page={page}
        totalPages={totalPages}
        onDownload={handleDownload}
        isDownloaded={isKept}
        downloadProgress={downloadProgress}
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
