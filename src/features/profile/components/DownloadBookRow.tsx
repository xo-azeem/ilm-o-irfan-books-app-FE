import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Trash2, X } from 'lucide-react-native';

import type { BookSummary } from '@/components/books';
import { BookCover, Icon, Label, ProgressBar, Text, UrduText } from '@/components/ui';
import { radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

export type DownloadEntry = BookSummary & {
  /** Human-readable size and date, e.g. "412 MB · downloaded 2 Aug". */
  detail?: string;
  /** 0–1 while a download is in flight; omit once it has finished. */
  downloadProgress?: number;
};

/**
 * A downloaded book. An in-flight download shows its own progress in the row
 * rather than sending the reader to a separate screen.
 */
export const DownloadBookRow = memo(function DownloadBookRow({
  entry,
  onRemove,
  onCancel,
  onPress,
}: {
  entry: DownloadEntry;
  onRemove?: (entry: DownloadEntry) => void;
  onCancel?: (entry: DownloadEntry) => void;
  onPress?: (entry: DownloadEntry) => void;
}) {
  const { colors, isDark } = useTheme();
  const downloading = entry.downloadProgress != null && entry.downloadProgress < 1;

  const handlePress = useCallback(() => onPress?.(entry), [entry, onPress]);
  const handleRemove = useCallback(() => onRemove?.(entry), [entry, onRemove]);
  const handleCancel = useCallback(() => onCancel?.(entry), [entry, onCancel]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={entry.title}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surfaceAlt,
          borderColor: downloading ? colors.selectedBorder : colors.borderSoft,
        },
        pressed && styles.pressed,
      ]}>
      <BookCover
        width={48}
        coverUrl={entry.coverUrl}
        coverColor={(isDark ? entry.coverColorDark : entry.coverColor) ?? undefined}
      />

      <View style={styles.body}>
        {entry.isUrdu ? (
          <UrduText size={16} numberOfLines={1}>
            {entry.title}
          </UrduText>
        ) : (
          <Text size={fontSize.bodySmall} leading={1.2} weight="500" numberOfLines={2}>
            {entry.title}
          </Text>
        )}

        {downloading ? (
          <>
            <ProgressBar value={entry.downloadProgress ?? 0} />
            <Label tone="primary" tracking={0.8}>
              {`DOWNLOADING · ${Math.round((entry.downloadProgress ?? 0) * 100)}%`}
            </Label>
          </>
        ) : entry.detail ? (
          <Text size={fontSize.captionSmall} leading={1} tone="muted" numberOfLines={1}>
            {entry.detail}
          </Text>
        ) : null}
      </View>

      {downloading ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Cancel download of ${entry.title}`}
          hitSlop={8}
          onPress={handleCancel}
          style={[styles.action, { borderColor: colors.borderStrong }]}>
          <Icon icon={X} size={15} tone="soft" />
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${entry.title} from downloads`}
          hitSlop={8}
          onPress={handleRemove}
          style={[
            styles.action,
            { backgroundColor: colors.dangerFill, borderColor: colors.dangerBorder },
          ]}>
          <Icon icon={Trash2} size={13} tone="danger" strokeWidth={1.9} />
        </Pressable>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 12,
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  body: {
    flex: 1,
    gap: 6,
  },
  action: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  pressed: {
    opacity: 0.8,
  },
});
