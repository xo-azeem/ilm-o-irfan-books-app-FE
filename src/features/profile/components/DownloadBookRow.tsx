import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';

import { DisplayText, Text } from '@/components/ui';
import { BookSpine } from '@/features/library/components/BookSpine';
import { useTheme } from '@/theme/ThemeContext';

const COVER_WIDTH = 64;

export type DownloadedBook = {
  id: string;
  title: string;
  author: string;
  size: string;
  coverColor: string;
  coverColorDark: string;
};

type DownloadBookRowProps = {
  book: DownloadedBook;
  isLast?: boolean;
  onRemove?: (id: string) => void;
};

export const DownloadBookRow = memo(function DownloadBookRow({
  book,
  isLast = false,
  onRemove,
}: DownloadBookRowProps) {
  const { colors } = useTheme();

  return (
    <View
      className={`flex-row items-start gap-3.5 px-4 py-4 ${
        !isLast ? 'border-b border-app-border dark:border-app-border-dark' : ''
      }`}>
      <BookSpine
        title={book.title}
        coverColor={book.coverColor}
        coverColorDark={book.coverColorDark}
        width={COVER_WIDTH}
      />

      <View className="min-w-0 flex-1 gap-1.5 pt-0.5">
        <DisplayText
          className="text-[16px] font-semibold leading-5 tracking-tight text-app-ink dark:text-app-ink-dark"
          numberOfLines={2}>
          {book.title}
        </DisplayText>

        <Text
          className="text-[13px] text-app-muted dark:text-app-muted-dark"
          numberOfLines={1}>
          {book.author}
        </Text>

        <View className="self-start rounded-md bg-app-fill px-2 py-0.5 dark:bg-app-fill-dark">
          <Text className="text-[11px] font-medium tabular-nums text-app-primary dark:text-app-primary-dark">
            {book.size}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => onRemove?.(book.id)}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${book.title}`}
        hitSlop={8}
        className="mt-0.5 h-8 w-8 items-center justify-center rounded-full active:opacity-60">
        <Trash2 size={16} color={colors.faint} strokeWidth={1.75} />
      </Pressable>
    </View>
  );
});

export function getDownloadsTotalSize(books: DownloadedBook[]) {
  return books.reduce((sum, book) => sum + (parseInt(book.size, 10) || 0), 0);
}
