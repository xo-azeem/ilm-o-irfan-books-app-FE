import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';

import { DisplayText, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';
import { palette } from '@/theme/palette';

import type { BookItem } from '../data/exploreContent';

type BookCoverCardProps = {
  book: BookItem;
  width?: number;
  onPress?: () => void;
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
      onPress={onPress}
      style={{ width }}
      className="active:opacity-80">
      <View
        className="overflow-hidden rounded-xl"
        style={[
          styles.cover,
          {
            width,
            height: coverHeight,
            backgroundColor: coverColor,
            shadowOpacity: isDark ? 0.2 : 0.1,
          },
        ]}>
        <View style={styles.spine} />
        {book.tag ? (
          <View style={styles.tag}>
            <Text style={styles.tagText} className="text-[10px] font-medium">
              {book.tag}
            </Text>
          </View>
        ) : null}
        <View style={styles.coverTitleWrap}>
          <DisplayText
            style={styles.coverTitle}
            className="text-[13px] font-semibold leading-4"
            numberOfLines={3}>
            {book.title}
          </DisplayText>
        </View>
      </View>

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
  spine: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  tag: {
    position: 'absolute',
    right: 8,
    top: 8,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  tagText: {
    color: palette.green,
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
