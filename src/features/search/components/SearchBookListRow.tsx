import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Star } from 'lucide-react-native';

import { DisplayText, Text } from '@/components/ui';
import { BookCoverPlaceholder } from '@/components/books';
import type { SearchCatalogBook } from '@/features/explore/data/exploreContent';
import { useTheme } from '@/theme/ThemeContext';
import { palette } from '@/theme/palette';

const COVER_WIDTH = 76;
const COVER_HEIGHT = COVER_WIDTH * 1.32;

type SearchBookListRowProps = {
  book: SearchCatalogBook;
  isLast?: boolean;
  onPress?: () => void;
};

export const SearchBookListRow = memo(function SearchBookListRow({
  book,
  isLast = false,
  onPress,
}: SearchBookListRowProps) {
  const { isDark } = useTheme();
  const coverColor = isDark ? book.coverColorDark : book.coverColor;

  return (
    <Pressable onPress={onPress} className="active:opacity-90">
      <View className="flex-row items-start gap-4 py-4">
        <BookCoverPlaceholder
          width={COVER_WIDTH}
          height={COVER_HEIGHT}
          coverColor={coverColor}
          borderRadius={12}
        />

        <View className="min-w-0 flex-1 justify-center gap-1.5">
          <View className="flex-row items-start gap-2">
            <DisplayText
              className="min-w-0 flex-1 text-[16px] font-semibold leading-[22px] tracking-tight text-app-ink dark:text-app-ink-dark"
              numberOfLines={2}>
              {book.title}
            </DisplayText>
            {book.tag ? (
              <View className="shrink-0 rounded-md bg-app-fill px-2 py-1 dark:bg-app-fill-dark">
                <Text className="text-[11px] font-medium text-app-primary dark:text-app-primary-dark">
                  {book.tag}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="flex-row items-center gap-2">
            <Text
              className="min-w-0 flex-1 text-[14px] leading-5 text-app-muted dark:text-app-muted-dark"
              numberOfLines={1}>
              {book.author}
            </Text>
            {book.rating != null ? (
              <View className="shrink-0 flex-row items-center gap-1">
                <Star
                  size={12}
                  color={palette.sunflower}
                  fill={palette.sunflower}
                  strokeWidth={0}
                />
                <Text className="text-[13px] font-medium tabular-nums text-app-muted dark:text-app-muted-dark">
                  {book.rating.toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            className="text-[13px] leading-[19px] text-app-faint dark:text-app-faint-dark"
            numberOfLines={2}>
            {book.description}
          </Text>

          {!isLast ? (
            <View className="mt-4 h-px bg-app-border dark:bg-app-border-dark" />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});
