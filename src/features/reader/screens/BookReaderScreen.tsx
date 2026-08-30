import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import type { RootStackParamList } from '@/app/navigation/types';
import { useSheet } from '@/components/ui';
import type { BookPdfSource } from '@/constants/books';
import { ROUTES } from '@/constants/routes';
import { BookPageFlip, type BookPageFlipHandle } from '@/features/reader/components/BookPageFlip';
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
import { readerStage } from '@/theme/palette';

type BookReaderRouteProp = RouteProp<RootStackParamList, 'BookReader'>;
type BookReaderNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BookReader'>;

export function BookReaderScreen() {
  const navigation = useNavigation<BookReaderNavigationProp>();
  const route = useRoute<BookReaderRouteProp>();
  const bookId = route.params.bookId;
  const { data: book } = useBook(bookId);

  const [pdfSource, setPdfSource] = useState<BookPdfSource | null>(null);
  const [sourceError, setSourceError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const scaleRef = useRef(1);
  const scaleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [controlScale, setControlScale] = useState(MIN_SCALE);
  const [scaleSnapshot, setScaleSnapshot] = useState(MIN_SCALE);
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
  // Page tone is a reading default, shared with the Appearance screen.
  const pageTone = useThemeStore(state => state.pageTone);
  const setPageTone = useThemeStore(state => state.setPageTone);
  /** Set once a download completes, so the error state can offer it. */
  const downloadedUri = useRef<string | null>(null);
  const { canOpenBooks, isAuthenticated, isSubscriptionLoading } = useAccess();
  const progressMutation = useProgressMutation();
  const highlightMutation = useHighlightMutation(bookId);
  useHighlights(bookId);
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
    scaleRef.current = MIN_SCALE;
    setControlScale(MIN_SCALE);
    setScaleSnapshot(MIN_SCALE);
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

  const handleScaleChanged = useCallback((scale: number) => {
    scaleRef.current = scale;
    if (scaleDebounceRef.current) {
      clearTimeout(scaleDebounceRef.current);
    }
    scaleDebounceRef.current = setTimeout(() => {
      setScaleSnapshot(scale);
    }, 120);
  }, []);

  useEffect(
    () => () => {
      if (scaleDebounceRef.current) {
        clearTimeout(scaleDebounceRef.current);
      }
    },
    [],
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
    const clamped = Number(Math.min(Math.max(next, MIN_SCALE), MAX_SCALE).toFixed(2));
    scaleRef.current = clamped;
    setScaleSnapshot(clamped);
    setControlScale(clamped);
  }, []);

  const handleZoomIn = useCallback(() => {
    applyScale(scaleRef.current + SCALE_STEP);
  }, [applyScale]);

  const handleZoomOut = useCallback(() => {
    applyScale(scaleRef.current - SCALE_STEP);
  }, [applyScale]);

  const handleResetZoom = useCallback(() => {
    if (scaleRef.current === MIN_SCALE) return;
    applyScale(MIN_SCALE);
  }, [applyScale]);

  const toggleChrome = useCallback(() => {
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

  const handleGoToPage = useCallback(() => {
    settingsSheet.close();
    Alert.prompt?.(
      'Go to page',
      totalPages > 0 ? `1 – ${totalPages}` : undefined,
      value => {
        const target = Number(value);
        if (Number.isFinite(target) && target >= 1) {
          flipRef.current?.goTo(target);
        }
      },
      'plain-text',
      String(page),
      'number-pad',
    );

    // `Alert.prompt` is iOS-only; Android gets a page-turn nudge instead of a
    // silent no-op until a proper picker sheet is added.
    if (Platform.OS !== 'ios') {
      Alert.alert(
        'Go to page',
        `You are on page ${page}${totalPages ? ` of ${totalPages}` : ''}. Swipe or tap the page edges to move through the book.`,
      );
    }
  }, [page, settingsSheet, totalPages]);

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

  const canZoomOut = scaleSnapshot > MIN_SCALE;
  const canZoomIn = scaleSnapshot < MAX_SCALE;
  const zoomPercent = Math.round(scaleSnapshot * 100);
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
    <View style={styles.root}>
      <ReaderChrome
        title={bookTitle}
        page={page}
        totalPages={totalPages}
        visible={chromeVisible}
        saved={false}
        onToggle={toggleChrome}
        onBack={() => navigation.goBack()}
        onOpenSettings={settingsSheet.open}
        onBookmark={handleHighlight}>
        {pdfSource ? (
          <BookPageFlip
            ref={flipRef}
            key={bookId}
            source={pdfSource}
            scale={controlScale}
            onLoadComplete={handleLoadComplete}
            onLoadProgress={handleLoadProgress}
            onError={handleError}
            onPageChanged={handlePageChanged}
            onScaleChanged={handleScaleChanged}
            onApplyScale={applyScale}
            onResetZoom={handleResetZoom}
          />
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
        brightness={brightness}
        onBrightnessChange={setBrightness}
        zoomPercent={zoomPercent}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onBookmark={handleBookmarkFromSheet}
        onGoToPage={handleGoToPage}
        onDownload={handleDownloadFromSheet}
        isDownloading={isDownloading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: readerStage,
  },
  dimmer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
  },
});
