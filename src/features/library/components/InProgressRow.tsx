import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { DisplayText, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';
import type { ReadingBook } from '@/features/library/data/libraryContent';

import { getLibraryPressHighlight, LIBRARY_COVER_WIDTH } from '../constants';
import { BookSpine } from './BookSpine';
import { LibraryProgressBar } from './LibraryProgressBar';

type InProgressRowProps = {
  book: ReadingBook;
  isLast: boolean;
  onPress?: () => void;
};

export const InProgressRow = memo(function InProgressRow({
  book,
  isLast,
  onPress,
}: InProgressRowProps) {
  const { isDark } = useTheme();
  const percent = Math.round(book.progress * 100);
  const pressHighlight = getLibraryPressHighlight(isDark);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) =>
        pressed ? { backgroundColor: pressHighlight } : undefined
      }
      className={`flex-row items-start gap-3.5 py-4 ${
        !isLast ? 'border-b border-app-border dark:border-app-border-dark' : ''
      }`}>
      <BookSpine
        title={book.title}
        coverColor={book.coverColor}
        coverColorDark={book.coverColorDark}
        coverUrl={book.coverUrl}
        width={64}
      />

      <View className="min-w-0 flex-1 gap-2">
        <View className="gap-0.5">
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
        </View>

        <Text
          className="text-[12px] text-app-faint dark:text-app-faint-dark"
          numberOfLines={1}>
          {book.chapter}
        </Text>

        <View className="gap-1">
          <View className="flex-row items-center gap-2">
            <LibraryProgressBar value={book.progress} />
            <Text className="shrink-0 text-[12px] font-medium tabular-nums text-app-muted dark:text-app-muted-dark">
              {percent}%
            </Text>
          </View>
          <Text className="text-[12px] text-app-faint dark:text-app-faint-dark">
            {book.timeLeft}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});
