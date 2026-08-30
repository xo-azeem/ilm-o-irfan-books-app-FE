import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Check, Download, FileWarning, ImageOff, Users } from 'lucide-react-native';

import { BookCoverPlaceholder } from '@/components/books';
import { Text } from '@/components/ui';
import { adminCoverUrl, type AdminBookRow as BookRow } from '@/services/admin';
import { palette } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

import { formatRelative } from '../utils/format';
import { AdminBadge, WARNING } from './AdminUi';

type Props = {
  book: BookRow;
  selected: boolean;
  selectionMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
  isFirst: boolean;
  isLast: boolean;
};

function AdminBookRowBase({
  book,
  selected,
  selectionMode,
  onPress,
  onLongPress,
  isFirst,
  isLast,
}: Props) {
  const { colors } = useTheme();
  const missingPdf = !book.pdf_path;
  const missingCover = !book.cover_path;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={220}
      accessibilityRole="button"
      style={({ pressed }) => ({
        backgroundColor: selected || pressed ? colors.fill : colors.surface,
        borderTopLeftRadius: isFirst ? 14 : 0,
        borderTopRightRadius: isFirst ? 14 : 0,
        borderBottomLeftRadius: isLast ? 14 : 0,
        borderBottomRightRadius: isLast ? 14 : 0,
      })}
      className={`flex-row items-center gap-3 px-4 py-3 ${
        isLast ? '' : 'border-b border-app-border dark:border-app-border-dark'
      }`}>
      {selectionMode ? (
        <View
          className="h-[22px] w-[22px] items-center justify-center rounded-full"
          style={{
            borderWidth: 1.6,
            borderColor: selected ? colors.primary : colors.border,
            backgroundColor: selected ? colors.primary : 'transparent',
          }}>
          {selected ? <Check size={13} color={colors.onPrimary} strokeWidth={3} /> : null}
        </View>
      ) : null}

      <BookCoverPlaceholder
        width={38}
        height={55}
        coverColor={book.cover_color ?? palette.green}
        coverUrl={adminCoverUrl(book.cover_path)}
        borderRadius={7}
        showSheen={false}
        showSpine={false}
      />

      <View className="min-w-0 flex-1 gap-1">
        <Text
          className="text-[15px] font-medium leading-[20px] text-app-ink dark:text-app-ink-dark"
          numberOfLines={1}>
          {book.title}
        </Text>
        <Text
          className="text-[12px] leading-[16px] text-app-muted dark:text-app-muted-dark"
          numberOfLines={1}>
          {book.author_name} · {formatRelative(book.updated_at)}
        </Text>

        <View className="mt-0.5 flex-row flex-wrap items-center gap-1.5">
          <AdminBadge
            label={book.is_published ? 'Published' : 'Draft'}
            tone={book.is_published ? 'success' : 'neutral'}
          />
          {book.is_premium ? <AdminBadge label="Premium" tone="accent" /> : null}
          {missingPdf ? (
            <View className="flex-row items-center gap-1">
              <FileWarning size={12} color={WARNING} strokeWidth={2.2} />
              <Text className="text-[11px] font-medium" style={{ color: WARNING }}>
                No PDF
              </Text>
            </View>
          ) : null}
          {missingCover ? (
            <View className="flex-row items-center gap-1">
              <ImageOff size={12} color={WARNING} strokeWidth={2.2} />
              <Text className="text-[11px] font-medium" style={{ color: WARNING }}>
                No cover
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="items-end gap-1">
        <View className="flex-row items-center gap-1">
          <Users size={12} color={colors.faint} strokeWidth={2.2} />
          <Text className="text-[12px] text-app-muted dark:text-app-muted-dark">
            {book.reader_count}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Download size={12} color={colors.faint} strokeWidth={2.2} />
          <Text className="text-[12px] text-app-muted dark:text-app-muted-dark">
            {book.download_count}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export const AdminBookListRow = memo(AdminBookRowBase);
