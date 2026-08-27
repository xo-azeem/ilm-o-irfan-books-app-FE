import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import type { RootStackParamList } from '@/app/navigation/types';
import { Text } from '@/components/ui';
import type { BookPdfSource } from '@/constants/books';
import { ROUTES } from '@/constants/routes';
import { BookPageFlip, type BookPageFlipHandle } from '@/features/reader/components/BookPageFlip';
import { ReaderChrome } from '@/features/reader/components/ReaderChrome';
import { ReaderStageSkeleton } from '@/features/reader/components/ReaderStageSkeleton';
import { MAX_SCALE, MIN_SCALE, SCALE_STEP } from '@/features/reader/constants';
import { useHighlightMutation, useHighlights, useProgressMutation } from '@/hooks/useAccount';
import { useBook } from '@/hooks/useCatalog';
import { downloadPdf, resolvePdfSource } from '@/services/pdf';
import { useAccess } from '@/lib/access';

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
  }, [bookId, canOpenBooks, isAuthenticated, isSubscriptionLoading, navigation]);

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

  const handlePrevPage = useCallback(() => {
    flipRef.current?.turn(-1);
  }, []);

  const handleNextPage = useCallback(() => {
    flipRef.current?.turn(1);
  }, []);

  const canZoomOut = scaleSnapshot > MIN_SCALE;
  const canZoomIn = scaleSnapshot < MAX_SCALE;
  const canReset = scaleSnapshot !== MIN_SCALE;
  const zoomPercent = Math.round(scaleSnapshot * 100);
  const bookTitle = book?.title?.trim() || 'Book';
  const blocked = hasError || sourceError;

  return (
    <View className="flex-1 bg-[#ECECEB] dark:bg-[#101410]">
      <ReaderChrome
        title={bookTitle}
        page={page}
        totalPages={totalPages}
        hasError={blocked || isLoading}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        canReset={canReset}
        zoomPercent={zoomPercent}
        isDownloading={isDownloading}
        onBack={() => navigation.goBack()}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onDownload={() => {
          void handleDownload();
        }}
        onHighlight={handleHighlight}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}>
        {blocked ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-[15px] text-app-muted dark:text-app-muted-dark">
              {errorMessage ?? 'Unable to open this book.'}
            </Text>
          </View>
        ) : pdfSource ? (
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

      {loaderVisible && !blocked ? (
        <ReaderStageSkeleton
          ready={!isLoading}
          progress={loadProgress}
          onFinished={hideLoader}
        />
      ) : null}
    </View>
  );
}
