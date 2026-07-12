import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BookCoverPlaceholder } from '@/components/books';
import { useTheme } from '@/theme/ThemeContext';

import { getBookSpineShadow } from '../constants';

type BookSpineProps = {
  title: string;
  coverColor: string;
  coverColorDark: string;
  width: number;
};

export const BookSpine = memo(function BookSpine({
  coverColor,
  coverColorDark,
  width,
}: BookSpineProps) {
  const { isDark } = useTheme();
  const color = isDark ? coverColorDark : coverColor;
  const height = width * 1.45;

  return (
    <BookCoverPlaceholder
      width={width}
      height={height}
      coverColor={color}
      borderRadius={10}
      style={[styles.cover, getBookSpineShadow(isDark)]}
    />
  );
});

const styles = StyleSheet.create({
  cover: {
    justifyContent: 'flex-end',
  },
});
