import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BookCover, Checkbox, Text, UrduText } from '@/components/ui';
import { adminCoverUrl, type AdminBookRow as BookRow } from '@/services/admin';
import { isUrduTitle } from '@/services/script';
import { useTheme } from '@/theme/ThemeContext';

import { formatRelative } from '../utils/format';
import { AdminBadge } from './AdminUi';

type Props = {
  book: BookRow;
  selected: boolean;
  selectionMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
  /** Kept for call-site compatibility; rows are now standalone cards. */
  isFirst?: boolean;
  isLast?: boolean;
};

/**
 * A book in the admin list.
 *
 * The row states why a title cannot publish, so Overview's warning and this
 * list always agree about what is wrong. Long-press enters selection mode.
 */
function AdminBookRowBase({
  book,
  selected,
  selectionMode,
  onPress,
  onLongPress,
}: Props) {
  const { colors } = useTheme();
  const missingPdf = !book.pdf_path;
  const missingCover = !book.cover_path;
  // The amber rim is the same signal the Overview banner uses.
  const blocked = missingPdf || missingCover;
  const isUrdu = isUrduTitle(book.title);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={220}
      accessibilityRole="button"
      accessibilityState={{ selected: selectionMode ? selected : undefined }}
      accessibilityLabel={book.title}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected ? colors.selected : colors.surface,
          borderColor: selected
            ? colors.selectedBorder
            : blocked
            ? colors.warningBorder
            : colors.borderSoft,
        },
        pressed && styles.pressed,
      ]}>
      {selectionMode ? <Checkbox selected={selected} /> : null}

      {missingCover ? (
        <BookCover
          width={40}
          height={58}
          placeholder
          placeholderLabel={'NO\nCOVER'}
          rounded={6}
        />
      ) : (
        <BookCover
          width={40}
          height={58}
          rounded={6}
          coverColor={book.cover_color ?? undefined}
          coverUrl={adminCoverUrl(book.cover_path)}
        />
      )}

      <View style={styles.body}>
        {isUrdu ? (
          <UrduText size={15} numberOfLines={1}>
            {book.title}
          </UrduText>
        ) : (
          <Text size={13.5} leading={1.2} weight="500" numberOfLines={1}>
            {book.title}
          </Text>
        )}

        <Text size={11.5} leading={1} tone="muted" numberOfLines={1}>
          {`${book.author_name} · updated ${formatRelative(book.updated_at)}`}
        </Text>

        <View style={styles.badges}>
          <AdminBadge
            label={book.is_published ? 'Live' : 'Draft'}
            tone={book.is_published ? 'success' : 'neutral'}
          />
          {book.is_premium ? <AdminBadge label="Premium" tone="accent" /> : null}
          {missingPdf ? <AdminBadge label="PDF required" tone="warning" /> : null}
        </View>
      </View>

      {!selectionMode ? (
        <View style={styles.metrics}>
          <Text size={10.5} leading={1.3} tone="faint" align="right">
            {`${book.reader_count} readers`}
          </Text>
          <Text size={10.5} leading={1.3} tone="faint" align="right">
            {`${book.download_count} saved`}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 11,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  metrics: {
    alignItems: 'flex-end',
    gap: 3,
  },
  pressed: {
    opacity: 0.78,
  },
});

export const AdminBookListRow = memo(AdminBookRowBase);
