import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';

import { BookCover, Icon, Text, UrduText } from '@/components/ui';
import { adminCoverUrl, type AdminBookRow as BookRow } from '@/services/admin';
import { isUrduTitle } from '@/services/script';
import { useTheme } from '@/theme/ThemeContext';

import { formatBytes } from '../utils/format';
import { AdminTag } from './AdminUi';

type Props = {
  book: BookRow;
  selected: boolean;
  selectionMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
  /** The name of the book's first category, shown beside the author. */
  categoryLabel?: string;
  /** Kept for call-site compatibility; rows are standalone cards. */
  isFirst?: boolean;
  isLast?: boolean;
};

/**
 * A book in the admin list.
 *
 * Status lives on the row rather than behind a filter, and the last line is
 * whichever sentence matters most: what is blocking publication, or how the
 * title is doing. A blocked row carries an amber rim, the same signal Today
 * uses, so the two screens can never disagree about what is wrong.
 */
function AdminBookRowBase({
  book,
  selected,
  selectionMode,
  onPress,
  onLongPress,
  categoryLabel,
}: Props) {
  const { colors } = useTheme();
  const missingPdf = !book.pdf_path;
  const missingCover = !book.cover_path;
  const blocked = missingPdf || missingCover;
  const isUrdu = isUrduTitle(book.title);

  if (selectionMode) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={book.title}
        style={({ pressed }) => [
          styles.selectRow,
          {
            backgroundColor: selected ? colors.selected : colors.surface,
            borderColor: selected ? colors.selectedBorder : colors.border,
          },
          pressed && styles.pressed,
        ]}>
        <View
          style={[
            styles.checkbox,
            selected
              ? { backgroundColor: colors.primary, borderColor: colors.primary }
              : { borderColor: colors.borderStrong },
          ]}>
          {selected ? <Icon icon={Check} size={12} tone="onPrimary" strokeWidth={3} /> : null}
        </View>

        <BookCover
          width={36}
          height={52}
          rounded={6}
          coverColor={book.cover_color ?? undefined}
          coverUrl={adminCoverUrl(book.cover_path)}
        />

        <View style={styles.selectBody}>
          <Text size={14} leading={1.25} weight="500" numberOfLines={1}>
            {book.title}
          </Text>
          <Text size={11} leading={1.2} tone="muted" numberOfLines={1}>
            {`${book.is_published ? 'Live' : 'Draft'} · ${book.is_premium ? 'Premium' : 'Free'}`}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={220}
      accessibilityRole="button"
      accessibilityLabel={book.title}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: blocked ? colors.warningBorder : colors.border,
        },
        pressed && styles.pressed,
      ]}>
      <BookCover
        width={48}
        height={68}
        rounded={8}
        coverColor={missingCover ? undefined : book.cover_color ?? undefined}
        coverUrl={adminCoverUrl(book.cover_path)}
        caption={missingCover ? 'no art' : undefined}
      />

      <View style={styles.body}>
        {isUrdu ? (
          <UrduText size={15} numberOfLines={2}>
            {book.title}
          </UrduText>
        ) : (
          <Text size={14.5} leading={1.25} weight="500" numberOfLines={2}>
            {book.title}
          </Text>
        )}

        <Text size={11.5} leading={1.2} tone="muted" numberOfLines={1}>
          {[book.author_name, categoryLabel ?? book.genre].filter(Boolean).join(' · ')}
        </Text>

        <View style={styles.tags}>
          <AdminTag
            label={book.is_published ? 'LIVE' : 'DRAFT'}
            tone={book.is_published ? 'success' : 'neutral'}
          />
          {missingPdf ? <AdminTag label="NO PDF" tone="warning" /> : null}
          {missingCover ? <AdminTag label="NO COVER" tone="warning" /> : null}
          {!blocked ? (
            <AdminTag
              label={book.is_premium ? 'PREMIUM' : 'FREE'}
              tone={book.is_premium ? 'premium' : 'neutral'}
            />
          ) : null}
        </View>

        {/* The one line that matters: the blocker, or how it is doing. */}
        <Text size={11} leading={1.2} tone={blocked ? 'warning' : 'faint'} numberOfLines={1}>
          {blocked
            ? missingPdf
              ? 'Add a PDF to publish'
              : 'Add a cover to finish this title'
            : `${book.reader_count} readers · ${book.download_count} downloads · ${formatBytes(
                book.file_size_bytes,
              )}`}
        </Text>
      </View>

      <View style={styles.chevron}>
        <Icon icon={ChevronRight} size={15} color={colors.dim} strokeWidth={2} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  chevron: {
    justifyContent: 'center',
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  pressed: {
    opacity: 0.78,
  },
});

export const AdminBookListRow = memo(AdminBookRowBase);
