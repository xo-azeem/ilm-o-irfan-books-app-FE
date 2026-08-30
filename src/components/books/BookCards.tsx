import { memo, useCallback, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Bookmark, Play } from 'lucide-react-native';

import { AccessLabel, accessFor, type BookAccess } from '@/components/books/BookAccess';
import {
  BookCover,
  Display,
  Icon,
  IconButton,
  ProgressBar,
  SectionHeader,
  Text,
  TextButton,
  UrduText,
} from '@/components/ui';
import { layout, radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/**
 * The book shapes every surface reuses. Home, Discover, Library, Downloads and
 * the admin lists all draw from these four, so a cover ratio or an access
 * marker can only ever be changed in one place.
 */

export type BookSummary = {
  id: string;
  title: string;
  author?: string;
  coverUrl?: string;
  coverColor?: string;
  coverColorDark?: string;
  isPremium?: boolean;
  price?: number;
  currency?: string;
  /** Set when the reader already has access. */
  inLibrary?: boolean;
  /** Titles that lead in Nastaliq rather than Latin. */
  isUrdu?: boolean;
  /** 0–1 reading progress, when the book is on the reader's shelf. */
  progress?: number;
  finished?: boolean;
  meta?: string;
};

function coverColorFor(book: BookSummary, isDark: boolean) {
  return (isDark ? book.coverColorDark : book.coverColor) ?? book.coverColor;
}

/** A cover with its title beneath — the standard rail and grid item. */
export const BookCard = memo(function BookCard({
  book,
  width = 120,
  rank,
  showAuthor = true,
  onPress,
  style,
}: {
  book: BookSummary;
  width?: number;
  /** Draws the gold rank numeral used on the trending rail. */
  rank?: number;
  showAuthor?: boolean;
  onPress?: (book: BookSummary) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { isDark } = useTheme();
  const handlePress = useCallback(() => onPress?.(book), [book, onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={book.title}
      onPress={handlePress}
      style={({ pressed }) => [{ width }, pressed && styles.pressed, style]}>
      <BookCover
        width={width}
        coverUrl={book.coverUrl}
        coverColor={coverColorFor(book, isDark)}
        progress={book.progress}
        finished={book.finished}
        rank={rank}
        elevated={rank != null}
      />
      <View style={styles.cardMeta}>
        {book.isUrdu ? (
          <UrduText size={Math.max(14, width * 0.14)} tone="ink" numberOfLines={2}>
            {book.title}
          </UrduText>
        ) : (
          <Text size={width > 110 ? fontSize.caption : 12.5} leading={1.25} weight="500" tone="ink" numberOfLines={2}>
            {book.title}
          </Text>
        )}
        {showAuthor && book.author ? (
          <Text size={11.5} leading={1} tone="faint" numberOfLines={1}>
            {book.author}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

/** A horizontal rail with a heading, bleeding to both screen edges. */
export const BookRail = memo(function BookRail({
  title,
  subtitle,
  action,
  children,
  gap = 14,
  bleed = layout.screenPadding,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  gap?: number;
  bleed?: number;
}) {
  return (
    <View style={styles.rail}>
      {title ? (
        <SectionHeader title={title} subtitle={subtitle} action={action} variant="display" />
      ) : null}
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -bleed }}
        contentContainerStyle={{ paddingHorizontal: bleed, gap }}>
        {children}
      </ScrollView>
    </View>
  );
});

/**
 * The full-width row used in search results, downloads and any list where the
 * reader needs the author and the access reality, not just a cover.
 */
export const BookListRow = memo(function BookListRow({
  book,
  access,
  trailing,
  onPress,
  coverWidth = 62,
}: {
  book: BookSummary;
  /** Defaults to deriving from the book's own premium / price / library flags. */
  access?: BookAccess;
  trailing?: ReactNode;
  onPress?: (book: BookSummary) => void;
  coverWidth?: number;
}) {
  const { isDark } = useTheme();
  const handlePress = useCallback(() => onPress?.(book), [book, onPress]);
  const resolvedAccess = access ?? accessFor(book);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={book.title}
      onPress={handlePress}
      style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}>
      <BookCover
        width={coverWidth}
        coverUrl={book.coverUrl}
        coverColor={coverColorFor(book, isDark)}
        progress={book.progress}
        finished={book.finished}
      />
      <View style={styles.listBody}>
        {book.isUrdu ? (
          <UrduText size={17} numberOfLines={1}>
            {book.title}
          </UrduText>
        ) : (
          <Text size={fontSize.body} leading={1.2} weight="500" numberOfLines={2}>
            {book.title}
          </Text>
        )}
        {book.meta || book.author ? (
          <Text size={12.5} leading={1} tone="muted" numberOfLines={1}>
            {book.meta ?? book.author}
          </Text>
        ) : null}
        <AccessLabel access={resolvedAccess} />
      </View>
      {trailing ?? <BookRowAction book={book} />}
    </Pressable>
  );
});

/**
 * The trailing control on a search row: a green play button when the reader can
 * open it now, a bookmark when they cannot.
 */
const BookRowAction = memo(function BookRowAction({ book }: { book: BookSummary }) {
  const { colors } = useTheme();
  const owned = !!book.inLibrary;

  return (
    <View
      style={[
        styles.rowAction,
        {
          backgroundColor: owned ? colors.primaryFill : 'transparent',
          borderColor: owned ? colors.selectedBorder : colors.borderStrong,
        },
      ]}>
      <Icon
        icon={owned ? Play : Bookmark}
        size={owned ? 13 : 14}
        tone={owned ? 'primary' : 'soft'}
        strokeWidth={1.8}
      />
    </View>
  );
});

/**
 * "Pick up where you left off" — the wide resume card at the top of Library and
 * in the Home continue rail.
 */
export const ContinueCard = memo(function ContinueCard({
  book,
  eyebrow = 'PICK UP WHERE YOU LEFT OFF',
  detail,
  onPress,
  width,
}: {
  book: BookSummary;
  eyebrow?: string;
  detail?: string;
  onPress?: (book: BookSummary) => void;
  /** Fixed width turns the card into a rail item; omit for full width. */
  width?: number;
}) {
  const { colors, isDark } = useTheme();
  const handlePress = useCallback(() => onPress?.(book), [book, onPress]);
  const isRail = width != null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continue ${book.title}`}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.continue,
        {
          width,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          padding: isRail ? 12 : 16,
          borderRadius: isRail ? radius.card : radius.cardLarge,
        },
        pressed && styles.pressed,
      ]}>
      <BookCover
        width={isRail ? 52 : 58}
        coverUrl={book.coverUrl}
        coverColor={coverColorFor(book, isDark)}
      />

      <View style={styles.continueBody}>
        {!isRail ? (
          <Text size={10} leading={1} weight="500" tracking={1.2} tone="primary">
            {eyebrow}
          </Text>
        ) : null}

        {book.isUrdu ? (
          <UrduText size={isRail ? 17 : 19} numberOfLines={1}>
            {book.title}
          </UrduText>
        ) : (
          <Display size={isRail ? 15 : 19} numberOfLines={2}>
            {book.title}
          </Display>
        )}

        {detail ? (
          <Text size={isRail ? 11.5 : fontSize.captionSmall} leading={1} tone="muted" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}

        {isRail && book.progress != null ? (
          <View style={styles.continueProgress}>
            <ProgressBar value={book.progress} />
            <Text size={10} leading={1} weight="500" tone="primary">
              {Math.round(book.progress * 100)}%
            </Text>
          </View>
        ) : null}
      </View>

      {!isRail ? (
        <IconButton
          icon={Play}
          size={12}
          buttonSize={42}
          variant="primary"
          onPress={handlePress}
          accessibilityLabel={`Continue ${book.title}`}
          style={styles.resumeButton}
        />
      ) : null}
    </Pressable>
  );
});

/** The "+ New collection" tile that closes the library grid. */
export const NewCollectionTile = memo(function NewCollectionTile({
  width,
  onPress,
}: {
  width: number;
  onPress?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="New collection"
      onPress={onPress}
      style={({ pressed }) => [
        styles.newCollection,
        {
          width,
          height: Math.round(width * 1.5),
          borderColor: colors.borderStrong,
          borderRadius: Math.max(5, Math.round(width * 0.07)),
        },
        pressed && styles.pressed,
      ]}>
      <Text size={24} leading={1} weight="300" tone="faint">
        +
      </Text>
      <Text size={11} leading={1.3} align="center" tone="faint">
        {'New\ncollection'}
      </Text>
    </Pressable>
  );
});

/** A quiet "See all" affordance for section headers. */
export const RailAction = memo(function RailAction({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  return <TextButton label={label} onPress={onPress} size={fontSize.captionSmall} />;
});

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.75,
  },
  cardMeta: {
    marginTop: 9,
    gap: 4,
  },
  rail: {
    gap: 12,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  listBody: {
    flex: 1,
    gap: 5,
  },
  rowAction: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  continue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  continueBody: {
    flex: 1,
    gap: 6,
  },
  continueProgress: {
    marginTop: 2,
    gap: 5,
  },
  resumeButton: {
    borderRadius: 21,
  },
  newCollection: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
