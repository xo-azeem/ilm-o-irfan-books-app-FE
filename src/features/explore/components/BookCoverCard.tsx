import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';

import { DisplayText, Text } from '@/components/ui';
import { BookCoverPlaceholder } from '@/components/books';
import { useTheme } from '@/theme/ThemeContext';
import { palette } from '@/theme/palette';

import type { CatalogBook } from '@/services/catalog';

type BookCoverCardProps = {
  book: CatalogBook;
  width?: number;
  onPress?: (book: CatalogBook) => void;
};

export const BookCoverCard = memo(function BookCoverCard({
  book,
  width = 128,
  onPress,
}: BookCoverCardProps) {
  const { isDark } = useTheme();
  const coverColor = isDark ? book.coverColorDark : book.coverColor;
  const coverHeight = width * 1.45;

  return (
    <Pressable
      onPress={onPress ? () => onPress(book) : undefined}
      style={{ width }}
      className="active:opacity-80">
      <BookCoverPlaceholder
        width={width}
        height={coverHeight}
        coverColor={coverColor}
        borderRadius={12}
        tag={book.tag}
        style={[
          styles.cover,
          {
            shadowOpacity: isDark ? 0.2 : 0.1,
          },
        ]}>
        <View style={styles.coverTitleWrap}>
          <DisplayText
            style={styles.coverTitle}
            className="text-[13px] font-semibold leading-4"
            numberOfLines={3}>
            {book.title}
          </DisplayText>
        </View>
      </BookCoverPlaceholder>

      <View className="mt-2.5 gap-0.5">
        <DisplayText
          className="text-[14px] font-semibold leading-[18px]"
          numberOfLines={2}>
          {book.title}
        </DisplayText>
        <Text
          className="text-[12px] text-app-muted dark:text-app-muted-dark"
          numberOfLines={1}>
          {book.author}
        </Text>
        {book.rating != null ? (
          <View className="mt-0.5 flex-row items-center gap-1">
            <Star
              size={11}
              color={palette.sunflower}
              fill={palette.sunflower}
              strokeWidth={1}
            />
            <Text className="text-[12px] font-medium text-app-muted dark:text-app-muted-dark">
              {book.rating.toFixed(1)}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cover: {
    shadowColor: '#1C2B22',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  coverTitleWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 12,
  },
  coverTitle: {
    color: '#FFFFFF',
  },
});
