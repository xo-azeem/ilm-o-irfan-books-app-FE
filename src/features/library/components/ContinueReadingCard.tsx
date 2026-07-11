import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Play } from 'lucide-react-native';

import { DisplayText, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';
import type { ReadingBook } from '@/features/library/data/libraryContent';

import { BookSpine } from './BookSpine';
import {
  getLibraryCardShadow,
  getLibraryRipple,
  LIBRARY_COVER_WIDTH,
} from '../constants';
import { LibraryProgressBar } from './LibraryProgressBar';

type ContinueReadingCardProps = {
  book: ReadingBook;
  embedded?: boolean;
  onPress?: () => void;
};

export const ContinueReadingCard = memo(function ContinueReadingCard({
  book,
  embedded = false,
  onPress,
}: ContinueReadingCardProps) {
  const { isDark, colors } = useTheme();
  const percent = Math.round(book.progress * 100);
  const tint = isDark ? book.coverColorDark : book.coverColor;

  return (
    <Pressable
      onPress={onPress}
      android_ripple={embedded ? undefined : getLibraryRipple(isDark)}
      style={
        embedded
          ? undefined
          : [
              getLibraryCardShadow(isDark),
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]
      }
      className={
        embedded
          ? 'p-4 active:opacity-95'
          : 'overflow-hidden rounded-[24px] border p-5 active:opacity-95'
      }>
      {!embedded ? (
        <View
          pointerEvents="none"
          className="absolute inset-0 rounded-[24px]"
          style={{ backgroundColor: `${tint}${isDark ? '18' : '10'}` }}
        />
      ) : (
        <View
          pointerEvents="none"
          className="absolute inset-0"
          style={{ backgroundColor: `${tint}${isDark ? '12' : '08'}` }}
        />
      )}

      <View className="flex-row gap-4">
        <BookSpine
          title={book.title}
          coverColor={book.coverColor}
          coverColorDark={book.coverColorDark}
          width={LIBRARY_COVER_WIDTH}
        />

        <View className="min-w-0 flex-1 justify-between py-0.5">
          <View className="gap-1">
            <DisplayText
              className="text-[18px] font-bold leading-[22px] text-app-ink dark:text-app-ink-dark"
              numberOfLines={2}>
              {book.title}
            </DisplayText>
            <Text
              className="text-[13px] text-app-muted dark:text-app-muted-dark"
              numberOfLines={1}>
              {book.author}
            </Text>
            <Text
              className="text-[12px] text-app-faint dark:text-app-faint-dark"
              numberOfLines={1}>
              {book.chapter}
            </Text>
          </View>

          <View className="mt-3 gap-1.5">
            <View className="flex-row items-center gap-2">
              <LibraryProgressBar value={book.progress} />
              <Text className="text-[12px] font-semibold tabular-nums text-app-ink dark:text-app-ink-dark">
                {percent}%
              </Text>
            </View>
            <Text className="text-[12px] text-app-faint dark:text-app-faint-dark">
              {book.timeLeft}
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-center gap-2 rounded-[14px] bg-app-primary py-3 dark:bg-app-primary-dark">
        <Play
          size={14}
          color={colors.onPrimary}
          fill={colors.onPrimary}
          strokeWidth={1}
        />
        <Text className="text-[14px] font-semibold text-app-on-primary dark:text-app-on-primary-dark">
          Resume reading
        </Text>
      </View>
    </Pressable>
  );
});
