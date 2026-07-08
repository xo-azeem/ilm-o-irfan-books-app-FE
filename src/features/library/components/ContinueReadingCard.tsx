import { memo } from 'react';
import { Platform, Pressable, StyleSheet, View, useColorScheme } from 'react-native';
import { Play } from 'lucide-react-native';

import { DisplayText, Text } from '@/components/ui';
import { theme } from '@/theme/palette';
import type { ReadingBook } from '@/features/library/data/libraryContent';

import { BookSpine } from './BookSpine';
import { LIBRARY_COVER_WIDTH } from '../constants';
import { LibraryProgressBar } from './LibraryProgressBar';

type ContinueReadingCardProps = {
  book: ReadingBook;
  onPress?: () => void;
};

export const ContinueReadingCard = memo(function ContinueReadingCard({
  book,
  onPress,
}: ContinueReadingCardProps) {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? theme.dark : theme.light;
  const percent = Math.round(book.progress * 100);
  const tint = isDark ? book.coverColorDark : book.coverColor;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: `${tint}${isDark ? '22' : '14'}` }]}
      className="overflow-hidden rounded-[24px] p-5 active:opacity-95">
      <Text className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-app-primary dark:text-app-primary-dark">
        Continue reading
      </Text>

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
              className="text-[19px] font-bold leading-[23px] text-app-ink dark:text-app-ink-dark"
              numberOfLines={2}>
              {book.title}
            </DisplayText>
            <Text
              className="text-[13px] text-app-muted dark:text-app-muted-dark"
              numberOfLines={1}>
              {book.author}
            </Text>
          </View>

          <View className="gap-1.5">
            <View className="flex-row items-center gap-2">
              <LibraryProgressBar value={book.progress} />
              <Text className="text-[12px] font-semibold text-app-ink dark:text-app-ink-dark">
                {percent}%
              </Text>
            </View>
            <Text className="text-[12px] text-app-faint dark:text-app-faint-dark">
              {book.timeLeft}
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        onPress={onPress}
        className="mt-5 flex-row items-center justify-center gap-2 rounded-[16px] bg-app-primary py-3.5 active:opacity-90 dark:bg-app-primary-dark">
        <Play
          size={15}
          color={colors.onPrimary}
          fill={colors.onPrimary}
          strokeWidth={1}
        />
        <Text className="text-[15px] font-semibold text-app-on-primary dark:text-app-on-primary-dark">
          Resume reading
        </Text>
      </Pressable>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    ...Platform.select({
      ios: {
        shadowColor: '#142818',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: { elevation: 2 },
    }),
  },
});
