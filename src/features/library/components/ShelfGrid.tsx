import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { NewCollectionTile, type BookSummary } from '@/components/books';
import { BookCover, Icon, Text, UrduText } from '@/components/ui';
import { layout } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

const COLUMNS = 3;
const GAP = 13;

/** Shares the column arithmetic between the grid and its skeleton. */
export function useShelfMetrics(columns = COLUMNS, gap = GAP) {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    const available = width - layout.screenPadding * 2 - gap * (columns - 1);
    return { itemWidth: Math.floor(available / columns), gap, columns };
  }, [columns, gap, width]);
}

/**
 * The bookshelf.
 *
 * Progress lives on the cover as a hairline and "finished" as a small tick, so
 * the grid stays a shelf of spines rather than turning into a dashboard.
 */
export const ShelfGrid = memo(function ShelfGrid({
  books,
  onBookPress,
  onNewCollection,
}: {
  books: BookSummary[];
  onBookPress?: (book: BookSummary) => void;
  /** Omit to hide the trailing "New collection" tile. */
  onNewCollection?: () => void;
}) {
  const { itemWidth, gap } = useShelfMetrics();

  return (
    <View style={[styles.grid, { gap }]}>
      {books.map(book => (
        <ShelfItem key={book.id} book={book} width={itemWidth} onPress={onBookPress} />
      ))}
      {onNewCollection ? (
        <NewCollectionTile width={itemWidth} onPress={onNewCollection} />
      ) : null}
    </View>
  );
});

const ShelfItem = memo(function ShelfItem({
  book,
  width,
  onPress,
}: {
  book: BookSummary;
  width: number;
  onPress?: (book: BookSummary) => void;
}) {
  const { colors, isDark } = useTheme();
  const handlePress = useCallback(() => onPress?.(book), [book, onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={book.title}
      onPress={handlePress}
      style={({ pressed }) => [{ width, gap: 8 }, pressed && styles.pressed]}>
      <BookCover
        width={width}
        coverUrl={book.coverUrl}
        coverColor={(isDark ? book.coverColorDark : book.coverColor) ?? undefined}
        progress={book.progress}
        finished={book.finished}
        overlay={
          book.finished ? (
            <View style={[styles.finished, { backgroundColor: colors.scrim }]}>
              <Icon icon={Check} size={11} tone="primary" strokeWidth={2.4} />
            </View>
          ) : undefined
        }
      />
      {book.isUrdu ? (
        <UrduText size={15} tone="soft" numberOfLines={2}>
          {book.title}
        </UrduText>
      ) : (
        <Text size={12.5} leading={1.25} weight="500" tone="soft" numberOfLines={2}>
          {book.title}
        </Text>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  finished: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.78,
  },
});
