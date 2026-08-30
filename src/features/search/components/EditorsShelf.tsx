import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AccessLabel, accessFor, type BookSummary } from '@/components/books';
import { Badge, BookCover, Display, Label, Text, UrduText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

/**
 * One editorial pick anchoring Discover. Given a wider cover and a badge row so
 * it reads as a recommendation rather than another grid item.
 */
export const EditorsShelf = memo(function EditorsShelf({
  book,
  title = 'Editors’ shelf',
  meta,
  onPress,
}: {
  book: BookSummary;
  title?: string;
  /** A second badge, e.g. "612 PAGES". */
  meta?: string;
  onPress?: (book: BookSummary) => void;
}) {
  const { isDark } = useTheme();
  const handlePress = useCallback(() => onPress?.(book), [book, onPress]);
  const access = accessFor(book);

  return (
    <View style={styles.root}>
      <Label>{title}</Label>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={book.title}
        onPress={handlePress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <BookCover
          width={88}
          coverUrl={book.coverUrl}
          coverColor={(isDark ? book.coverColorDark : book.coverColor) ?? undefined}
        />

        <View style={styles.body}>
          {book.isUrdu ? (
            <UrduText size={20} numberOfLines={2}>
              {book.title}
            </UrduText>
          ) : (
            <Display size={20} numberOfLines={3}>
              {book.title}
            </Display>
          )}

          {book.author ? (
            <Text size={12.5} leading={1.2} tone="muted" numberOfLines={1}>
              {book.author}
            </Text>
          ) : null}

          <View style={styles.badges}>
            {access.kind === 'membership' ? <Badge label="IN MEMBERSHIP" tone="gold" /> : null}
            {access.kind === 'owned' ? <Badge label="IN YOUR LIBRARY" tone="primary" /> : null}
            {access.kind === 'price' ? (
              <AccessLabel access={access} />
            ) : null}
            {meta ? <Badge label={meta} tone="neutral" /> : null}
          </View>
        </View>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
  },
  body: {
    flex: 1,
    gap: 7,
    paddingTop: 4,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  pressed: {
    opacity: 0.8,
  },
});
