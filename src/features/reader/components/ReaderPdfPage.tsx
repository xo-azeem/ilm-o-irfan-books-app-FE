import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Pdf from 'react-native-pdf';

import type { BookPdfSource } from '@/constants/books';
import { MAX_SCALE, MIN_SCALE } from '@/features/reader/constants';
import { useTheme } from '@/theme/ThemeContext';

type ReaderPdfPageProps = {
  source: BookPdfSource;
  page: number;
  width: number;
  height: number;
  scale: number;
  scrollEnabled: boolean;
  pointerEvents?: 'none' | 'auto';
  onLoadComplete?: (totalPages: number) => void;
  onError?: () => void;
  onScaleChanged?: (scale: number) => void;
};

export const ReaderPdfPage = memo(function ReaderPdfPage({
  source,
  page,
  width,
  height,
  scale,
  scrollEnabled,
  pointerEvents = 'auto',
  onLoadComplete,
  onError,
  onScaleChanged,
}: ReaderPdfPageProps) {
  const { isDark } = useTheme();

  if (width <= 0 || height <= 0) {
    return null;
  }

  return (
    <View
      collapsable={false}
      pointerEvents={pointerEvents}
      style={[
        styles.page,
        {
          width,
          height,
          backgroundColor: isDark ? '#161C16' : '#FFFEFB',
        },
      ]}>
      <Pdf
        source={source}
        page={page}
        singlePage
        style={{ width, height, backgroundColor: 'transparent' }}
        scale={scale}
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        spacing={0}
        fitPolicy={2}
        enablePaging={false}
        horizontal={false}
        enableDoubleTapZoom
        enableAntialiasing
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        trustAllCerts={false}
        onScaleChanged={onScaleChanged}
        onLoadComplete={onLoadComplete}
        onError={onError}
        renderActivityIndicator={() => <View />}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  page: {
    overflow: 'hidden',
  },
});
