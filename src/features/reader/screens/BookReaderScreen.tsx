import { useCallback, useEffect, useRef, useState } from 'react';
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
import { ReaderSettingsSheet } from '@/features/reader/components/ReaderSettingsSheet';
import { ReaderStageSkeleton } from '@/features/reader/components/ReaderStageSkeleton';
import { MAX_SCALE, MIN_SCALE, SCALE_STEP } from '@/features/reader/constants';
import { useHighlightMutation, useHighlights, useProgressMutation } from '@/hooks/useAccount';
import { useBook } from '@/hooks/useCatalog';
import { downloadPdf, resolvePdfSource } from '@/services/pdf';
import { useAccess } from '@/lib/access';
import { useThemeStore } from '@/stores/themeStore';
import { useReaderSurface } from '@/features/reader/useReaderSurface';

/** How close two reported taps have to be before the second is a duplicate. */
const TOGGLE_GUARD_MS = 220;

type BookReaderRouteProp = RouteProp<RootStackParamList, 'BookReader'>;
type BookReaderNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BookReader'>;

/**
 * The reading screen, behind a boundary.
 *
 * Nothing that happens to one book should be able to close the app, so a throw
 * anywhere in here lands on the reader's own failure screen and "Try again"
 * rebuilds the screen from scratch.
 */
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

  const [pdfSource, setPdfSource] = useState<BookPdfSource | null>(null);
  const [sourceError, setSourceError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  // The zoom the reader asked for. The document view follows it, never the
  // other way round, so the controls can never end up describing a zoom that
  // is not the one on screen.
  const [controlScale, setControlScale] = useState(MIN_SCALE);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loaderVisible, setLoaderVisible] = useState(true);
  const [hasError, setHasError] = useState(false);
  // Chrome starts hidden — the page is what the reader came for.
  const [chromeVisible, setChromeVisible] = useState(false);
  const [brightness, setBrightness] = useState(1);
  // Bumping this token re-runs the source effect; that is the retry path.
  const [retryToken, setRetryToken] = useState(0);
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
  const { canOpenBooks, isAuthenticated, isSubscriptionLoading } = useAccess();
  const progressMutation = useProgressMutation();
  const highlightMutation = useHighlightMutation(bookId);
  useHighlights(bookId);
  const lastToggle = useRef(0);
  const pendingProgress = useRef<{ page: number; totalPages: number } | null>(null);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      navigation.replace(ROUTES.BOOK_DETAIL, { bookId });
      return;
    }

    let active = true;
    const abort = new AbortController();
    setPdfSource(null);
    setSourceError(false);
    setErrorMessage(null);
    setPage(1);
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
        if (active) setPdfSource(source);
      })
      .catch((error: { code?: string; message?: string; name?: string }) => {
        if (!active || error?.name === 'AbortError') {
          return;
        }
        setSourceError(true);
        setErrorMessage(
          error?.code === 'PREMIUM_REQUIRED'
            ? 'An active subscription is required to open this book.'
            : error?.message || 'Unable to open this book.',
        );
        setIsLoading(false);
        setLoaderVisible(false);
      });
    return () => {
      active = false;
      abort.abort();
    };
  }, [bookId, canOpenBooks, isAuthenticated, isSubscriptionLoading, navigation, retryToken]);

  const flushProgress = useCallback(() => {
    const value = pendingProgress.current;
    if (!value?.totalPages) return;
    progressMutation.mutate({ bookId, ...value });
    pendingProgress.current = null;
  }, [bookId, progressMutation]);

  useEffect(
    () => () => {
      if (progressTimer.current) {
        clearTimeout(progressTimer.current);
      }
      flushProgress();
    },
    [flushProgress],
  );

  const handleLoadComplete = useCallback((numberOfPages: number) => {
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

  const handlePageChanged = useCallback(
    (currentPage: number, numberOfPages: number) => {
      setPage(currentPage);
      setTotalPages(numberOfPages);
      pendingProgress.current = { page: currentPage, totalPages: numberOfPages };
      if (progressTimer.current) {
        clearTimeout(progressTimer.current);
      }
      progressTimer.current = setTimeout(flushProgress, 1500);
    },
    [flushProgress],
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

  const handleHighlight = useCallback(() => {
    if (page > 0) {
      highlightMutation.mutate(page);
    }
  }, [highlightMutation, page]);

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
        saved={false}
        onBack={() => navigation.goBack()}
        onOpenSettings={settingsSheet.open}
        onBookmark={handleHighlight}>
        {pdfSource ? (
          <ReaderBoundary>
            <BookPageFlip
              ref={flipRef}
              key={bookId}
              source={pdfSource}
              scale={controlScale}
              onLoadComplete={handleLoadComplete}
              onLoadProgress={handleLoadProgress}
              onError={handleError}
              onPageChanged={handlePageChanged}
              onSingleTap={toggleChrome}
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
