import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Play } from 'lucide-react-native';
import Animated, {
  Easing,
  FadeInUp,
  FadeOutUp,
  LinearTransition,
} from 'react-native-reanimated';

import { DisplayText, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';
import type { ReadingBook } from '@/features/library/data/libraryContent';

import { getLibraryPressHighlight } from '../constants';
import { BookSpine } from './BookSpine';
import { LibraryProgressBar } from './LibraryProgressBar';

const COVER_WIDTH = 68;
const LAYOUT_TRANSITION = LinearTransition.duration(240).easing(
  Easing.out(Easing.cubic),
);
const BUTTON_ENTER = FadeInUp.duration(240).easing(Easing.out(Easing.cubic));
const BUTTON_EXIT = FadeOutUp.duration(180).easing(Easing.in(Easing.cubic));

type ResumeButtonProps = {
  onPress?: () => void;
  labelColor: string;
};

const ResumeButton = memo(function ResumeButton({
  onPress,
  labelColor,
}: ResumeButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
      className="min-h-[50px] flex-row items-center justify-center gap-2.5 rounded-[14px] bg-app-primary px-4 py-3.5 dark:bg-app-primary-dark">
      <Play size={15} color={labelColor} fill={labelColor} strokeWidth={1} />
      <Text className="text-[15px] font-semibold text-app-on-primary dark:text-app-on-primary-dark">
        Resume reading
      </Text>
    </Pressable>
  );
});

type InProgressBookItemProps = {
  book: ReadingBook;
  isSelected: boolean;
  isLast: boolean;
  onSelect: () => void;
  onResume?: () => void;
};

export const InProgressBookItem = memo(function InProgressBookItem({
  book,
  isSelected,
  isLast,
  onSelect,
  onResume,
}: InProgressBookItemProps) {
  const { isDark, colors } = useTheme();
  const percent = Math.round(book.progress * 100);
  const pressHighlight = getLibraryPressHighlight(isDark);

  return (
    <Animated.View
      layout={LAYOUT_TRANSITION}
      className={`px-3 ${!isLast ? 'border-b border-app-border dark:border-app-border-dark' : ''}`}>
      <Animated.View
        layout={LAYOUT_TRANSITION}
        className={`my-1.5 overflow-hidden rounded-[14px] ${
          isSelected ? 'bg-app-fill dark:bg-app-fill-dark' : ''
        }`}>
        <Pressable
          onPress={onSelect}
          style={({ pressed }) =>
            !isSelected && pressed ? { backgroundColor: pressHighlight } : undefined
          }
          className="px-3 py-3.5">
          <View className="flex-row items-start gap-3.5">
            <BookSpine
              title={book.title}
              coverColor={book.coverColor}
              coverColorDark={book.coverColorDark}
              width={COVER_WIDTH}
            />

            <View className="min-w-0 flex-1 gap-1.5">
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

              <Text
                className="text-[12px] text-app-faint dark:text-app-faint-dark"
                numberOfLines={1}>
                {book.chapter}
              </Text>

              <View className="mt-0.5 gap-1">
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
          </View>
        </Pressable>

        {isSelected ? (
          <Animated.View
            entering={BUTTON_ENTER}
            exiting={BUTTON_EXIT}
            layout={LAYOUT_TRANSITION}
            className="px-3 pb-3.5 pt-0.5">
            <ResumeButton onPress={onResume} labelColor={colors.onPrimary} />
          </Animated.View>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
});
