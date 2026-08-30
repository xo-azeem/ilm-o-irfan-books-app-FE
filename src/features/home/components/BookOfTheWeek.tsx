import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Bookmark, Play } from 'lucide-react-native';

import type { BookSummary } from '@/components/books';
import {
  BookCover,
  Button,
  Display,
  IconButton,
  Label,
  RadialGlow,
  Text,
  UrduText,
} from '@/components/ui';
import { radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

export type FeaturedBook = BookSummary & {
  description?: string;
  rating?: number;
  readerCount?: number;
  genre?: string;
  pages?: number;
};

/**
 * The editorial hero at the top of Home. One book, given the room a bookshop
 * gives its window — cover, verdict, and a single way in.
 */
export const BookOfTheWeek = memo(function BookOfTheWeek({
  book,
  eyebrow = 'BOOK OF THE WEEK',
  saved = false,
  onRead,
  onSave,
  onPress,
}: {
  book: FeaturedBook;
  eyebrow?: string;
  saved?: boolean;
  onRead?: (book: FeaturedBook) => void;
  onSave?: (book: FeaturedBook) => void;
  onPress?: (book: FeaturedBook) => void;
}) {
  const { colors, isDark } = useTheme();

  const handleRead = useCallback(() => onRead?.(book), [book, onRead]);
  const handleSave = useCallback(() => onSave?.(book), [book, onSave]);
  const handlePress = useCallback(() => onPress?.(book), [book, onPress]);

  const meta = [book.author, book.genre, book.pages ? `${book.pages} pages` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
      ]}>
      {/* A static radial wash rather than a blur pass — free on Android. */}
      <RadialGlow color={colors.primary} opacity={0.36} size={340} left={-60} top={-120} />

      <View style={styles.top}>
        <BookCover
          width={112}
          coverUrl={book.coverUrl}
          coverColor={(isDark ? book.coverColorDark : book.coverColor) ?? undefined}
          rounded={10}
          elevated
          caption={`COVER · ${book.title.toUpperCase()}`}
        />

        <View style={styles.headline}>
          <Label size={10} weight="600" tracking={1.5} tone="gold">
            {eyebrow}
          </Label>

          {book.isUrdu ? (
            <UrduText size={24} numberOfLines={3} onPress={handlePress}>
              {book.title}
            </UrduText>
          ) : (
            <Display size="subheading" numberOfLines={3} onPress={handlePress}>
              {book.title}
            </Display>
          )}

          {meta ? (
            <Text size={fontSize.caption} leading={1.4} tone="muted" numberOfLines={2}>
              {meta}
            </Text>
          ) : null}

          {book.rating != null ? (
            <View style={styles.rating}>
              <Text size={fontSize.caption} leading={1} weight="600" tone="gold">
                {book.rating.toFixed(1)}
              </Text>
              {book.readerCount ? (
                <Text size={fontSize.captionSmall} leading={1} tone="faint">
                  {book.readerCount.toLocaleString('en-US')} readers
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      {book.description ? (
        <Text size={13.5} leading={1.6} tone="soft" numberOfLines={3}>
          {book.description}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button label="Read now" icon={Play} size="md" onPress={handleRead} style={styles.readButton} />
        <IconButton
          icon={Bookmark}
          buttonSize={48}
          onPress={handleSave}
          accessibilityLabel={saved ? 'Remove from wishlist' : 'Save for later'}
          variant={saved ? 'ghost' : 'secondary'}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.hero,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: 20,
    gap: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
    elevation: 12,
  },
  top: {
    flexDirection: 'row',
    gap: 16,
  },
  headline: {
    flex: 1,
    gap: 9,
    paddingTop: 4,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  readButton: {
    flex: 1,
  },
});
