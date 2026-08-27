import { forwardRef, memo, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Pdf from 'react-native-pdf';

import type { BookPdfSource } from '@/constants/books';
import { MIN_SCALE } from '@/features/reader/constants';
import { useTheme } from '@/theme/ThemeContext';

type ReaderPdfPageProps = {
  source: BookPdfSource;
  page: number;
  width: number;
  height: number;
  fill: string;
  onLoadComplete?: () => void;
  onError?: (message: string) => void;
};

function sourceKey(source: BookPdfSource) {
  return typeof source === 'number' ? String(source) : source.uri;
}

export const ReaderPdfPage = memo(
  function ReaderPdfPage({
    source,
    page,
    width,
    height,
    fill,
    onLoadComplete,
    onError,
  }: ReaderPdfPageProps) {
    const onLoadCompleteRef = useRef(onLoadComplete);
    const onErrorRef = useRef(onError);

    onLoadCompleteRef.current = onLoadComplete;
    onErrorRef.current = onError;

    const handleLoadComplete = useCallback(() => {
      onLoadCompleteRef.current?.();
    }, []);

    const handleError = useCallback((error: unknown) => {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message || '')
          : '';
      onErrorRef.current?.(message || 'This PDF could not be displayed.');
    }, []);

    const pdfStyle = useMemo(
      () => ({ width, height, backgroundColor: fill }),
      [fill, height, width],
    );

    if (width <= 0 || height <= 0 || page < 1) {
      return null;
    }

    return (
      <View collapsable={false} pointerEvents="none" style={[styles.page, { width, height, backgroundColor: fill }]}>
        <Pdf
          source={source}
          page={page}
          singlePage
          style={pdfStyle}
          scale={MIN_SCALE}
          minScale={MIN_SCALE}
          maxScale={MIN_SCALE}
          spacing={0}
          fitPolicy={2}
          enablePaging={false}
          horizontal={false}
          enableDoubleTapZoom={false}
          enableAntialiasing
          enableAnnotationRendering={false}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          trustAllCerts
          onLoadComplete={handleLoadComplete}
          onError={handleError}
          renderActivityIndicator={() => <View />}
        />
      </View>
    );
  },
  (prev, next) =>
    prev.page === next.page &&
    prev.width === next.width &&
    prev.height === next.height &&
    prev.fill === next.fill &&
    sourceKey(prev.source) === sourceKey(next.source),
);

type PdfPageCountProbeProps = {
  source: BookPdfSource;
  width: number;
  height: number;
  onCount: (totalPages: number) => void;
  onError?: (message: string) => void;
};

export const PdfPageCountProbe = memo(function PdfPageCountProbe({
  source,
  width,
  height,
  onCount,
  onError,
}: PdfPageCountProbeProps) {
  const { isDark } = useTheme();
  const reported = useRef(false);
  const onCountRef = useRef(onCount);
  const onErrorRef = useRef(onError);

  onCountRef.current = onCount;
  onErrorRef.current = onError;

  const handleLoadComplete = useCallback((numberOfPages: number) => {
    if (reported.current) return;
    if (!Number.isFinite(numberOfPages) || numberOfPages < 1) return;
    reported.current = true;
    onCountRef.current(numberOfPages);
  }, []);

  const handleError = useCallback((error: unknown) => {
    if (reported.current) return;
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message || '')
        : '';
    onErrorRef.current?.(message || 'This PDF could not be displayed.');
  }, []);

  const size = Math.max(8, Math.min(width || 8, height || 8, 64));

  return (
    <View pointerEvents="none" style={styles.probe} accessibilityElementsHidden>
      <Pdf
        source={source}
        page={1}
        singlePage={false}
        style={{ width: size, height: size, backgroundColor: isDark ? '#161C16' : '#FFFEFB' }}
        scale={MIN_SCALE}
        minScale={MIN_SCALE}
        maxScale={MIN_SCALE}
        spacing={0}
        fitPolicy={2}
        enablePaging={false}
        scrollEnabled={false}
        enableDoubleTapZoom={false}
        enableAnnotationRendering={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        trustAllCerts
        onLoadComplete={handleLoadComplete}
        onError={handleError}
        renderActivityIndicator={() => <View />}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  page: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  probe: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    zIndex: -1,
  },
});
