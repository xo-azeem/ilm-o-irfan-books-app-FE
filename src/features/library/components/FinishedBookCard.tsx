import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { DisplayText, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';
import type { LibraryBook } from '@/features/library/data/libraryContent';

import { getLibraryRipple } from '../constants';
import { BookSpine } from './BookSpine';

type FinishedBookCardProps = {
  book: LibraryBook;
  width?: number;
  onPress?: () => void;
};

export const FinishedBookCard = memo(function FinishedBookCard({
  book,
  width = 96,
  onPress,
}: FinishedBookCardProps) {
  const { isDark } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      android_ripple={getLibraryRipple(isDark)}
      style={{ width }}
      className="active:opacity-80">
      <BookSpine
        title={book.title}
        coverColor={book.coverColor}
        coverColorDark={book.coverColorDark}
        coverUrl={book.coverUrl}
        width={width}
      />
      <View className="mt-2 gap-0.5">
        <DisplayText
          className="text-[13px] font-semibold leading-[16px] text-app-ink dark:text-app-ink-dark"
          numberOfLines={2}>
          {book.title}
        </DisplayText>
        <Text
          className="text-[11px] text-app-muted dark:text-app-muted-dark"
          numberOfLines={1}>
          {book.author}
        </Text>
      </View>
    </Pressable>
  );
});
