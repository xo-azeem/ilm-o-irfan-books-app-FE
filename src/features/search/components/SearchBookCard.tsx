import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';

import { DisplayText, Text } from '@/components/ui';
import { BookCoverPlaceholder } from '@/components/books';
import type { CatalogBook } from '@/services/catalog';
import { useTheme } from '@/theme/ThemeContext';
import { palette } from '@/theme/palette';

type SearchBookCardProps = {
  book: CatalogBook;
  width: number;
  height: number;
  coverHeight: number;
  bodyHeight: number;
  onPress?: (book: CatalogBook) => void;
};

export const SearchBookCard = memo(function SearchBookCard({
  book,
  width,
  height,
  coverHeight,
  bodyHeight,
  onPress,
}: SearchBookCardProps) {
  const { isDark } = useTheme();
  const coverColor = isDark ? book.coverColorDark : book.coverColor;

  return (
    <Pressable
      onPress={onPress ? () => onPress(book) : undefined}
      style={{ width, height }}
      className="active:opacity-90">
      <View
        style={{ height }}
        className="overflow-hidden rounded-[16px] bg-app-surface dark:bg-app-surface-dark">
        <BookCoverPlaceholder
          width={width}
          height={coverHeight}
          coverColor={coverColor}
          coverUrl={book.coverUrl}
          borderRadius={0}
          tag={book.tag}
        />

        <View style={[styles.body, { height: bodyHeight }]}>
          <View style={styles.titleSlot}>
            <DisplayText
              style={styles.title}
              className="text-[14px] font-semibold text-app-ink dark:text-app-ink-dark"
              numberOfLines={2}>
              {book.title}
            </DisplayText>
          </View>

          <View style={styles.metaRow}>
            <Text
              style={styles.author}
              className="flex-1 text-[13px] text-app-muted dark:text-app-muted-dark"
              numberOfLines={1}>
              {book.author}
            </Text>
            {book.rating != null ? (
              <View style={styles.ratingRow}>
                <Star
                  size={11}
                  color={palette.sunflower}
                  fill={palette.sunflower}
                  strokeWidth={0}
                />
                <Text
                  style={styles.ratingText}
                  className="text-[12px] font-medium tabular-nums text-app-muted dark:text-app-muted-dark">
                  {book.rating.toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.descriptionSlot}>
            <Text
              style={styles.description}
              className="text-[12px] text-app-faint dark:text-app-faint-dark"
              numberOfLines={2}>
              {book.description}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 8,
    overflow: 'hidden',
  },
  titleSlot: {
    height: 38,
    justifyContent: 'flex-start',
  },
  title: {
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 17,
  },
  descriptionSlot: {
    height: 36,
    justifyContent: 'flex-start',
  },
  author: {
    lineHeight: 17,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  ratingText: {
    lineHeight: 16,
  },
  description: {
    lineHeight: 17,
    marginTop: 2,
  },
});
