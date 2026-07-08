import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';

import { DisplayText, Text } from '@/components/ui';
import type { SearchCatalogBook } from '@/features/explore/data/exploreContent';
import { useTheme } from '@/theme/ThemeContext';
import { palette } from '@/theme/palette';

type SearchBookCardProps = {
  book: SearchCatalogBook;
  width: number;
  onPress?: () => void;
};

export const SearchBookCard = memo(function SearchBookCard({
  book,
  width,
  onPress,
}: SearchBookCardProps) {
  const { isDark } = useTheme();
  const coverColor = isDark ? book.coverColorDark : book.coverColor;
  const coverHeight = width * 1.32;

  return (
    <Pressable
      onPress={onPress}
      style={{ width }}
      className="active:opacity-90">
      <View className="overflow-hidden rounded-[16px] bg-app-surface dark:bg-app-surface-dark">
        <View
          style={[
            styles.cover,
            {
              width,
              height: coverHeight,
              backgroundColor: coverColor,
            },
          ]}>
          <View style={styles.spine} />
          {book.tag ? (
            <View style={styles.tag}>
              <Text style={styles.tagText} className="text-[10px] font-semibold">
                {book.tag}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <DisplayText
            style={styles.title}
            className="text-[14px] font-semibold text-app-ink dark:text-app-ink-dark"
            numberOfLines={2}>
            {book.title}
          </DisplayText>

          <View style={styles.metaRow}>
            <Text
              style={styles.author}
              className="flex-1 text-[13px] text-app-muted dark:text-app-muted-dark"
              numberOfLines={1}>
              {book.author}
            </Text>
            {book.rating != null ? (
              <View style={styles.ratingRow}>
                <Star
                  size={11}
                  color={palette.sunflower}
                  fill={palette.sunflower}
                  strokeWidth={0}
                />
                <Text
                  style={styles.ratingText}
                  className="text-[12px] font-medium tabular-nums text-app-muted dark:text-app-muted-dark">
                  {book.rating.toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            style={styles.description}
            className="text-[12px] text-app-faint dark:text-app-faint-dark"
            numberOfLines={2}>
            {book.description}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cover: {
    overflow: 'hidden',
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
    right: 10,
    top: 10,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  tagText: {
    color: palette.green,
  },
  body: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 8,
  },
  title: {
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  author: {
    lineHeight: 17,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  ratingText: {
    lineHeight: 16,
  },
  description: {
    lineHeight: 17,
    marginTop: 2,
  },
});
