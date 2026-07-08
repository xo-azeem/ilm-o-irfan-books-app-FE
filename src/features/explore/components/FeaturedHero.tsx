import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowRight, Star } from 'lucide-react-native';

import { DisplayText, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';
import { palette } from '@/theme/palette';

import type { BookItem } from '../data/exploreContent';

type FeaturedHeroProps = {
  book: BookItem & { description: string; readTime: string };
  onPress?: () => void;
};

export function FeaturedHero({ book, onPress }: FeaturedHeroProps) {
  const { isDark } = useTheme();
  const coverColor = isDark ? book.coverColorDark : book.coverColor;

  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-[20px] active:opacity-95"
      style={[
        styles.card,
        {
          backgroundColor: coverColor,
          shadowOpacity: isDark ? 0.25 : 0.12,
        },
      ]}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View className="flex-row gap-4 p-5">
        <View className="min-w-0 flex-1 justify-between gap-4">
          {book.tag ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText} className="text-[11px] font-medium">
                {book.tag.toUpperCase()}
              </Text>
            </View>
          ) : null}

          <View className="gap-2">
            <DisplayText style={styles.title} className="text-[22px] font-bold leading-7">
              {book.title}
            </DisplayText>
            <Text style={styles.description} className="text-[14px] leading-5">
              {book.description}
            </Text>
          </View>

          <View className="flex-row items-center justify-between gap-3">
            <View className="gap-0.5">
              <Text style={styles.meta} className="text-[12px]">
                {book.author}
              </Text>
              <View className="flex-row items-center gap-2">
                {book.rating ? (
                  <View className="flex-row items-center gap-1">
                    <Star
                      size={12}
                      color={palette.sunflower}
                      fill={palette.sunflower}
                      strokeWidth={1}
                    />
                    <Text style={styles.metaStrong} className="text-[12px] font-medium">
                      {book.rating.toFixed(1)}
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.meta} className="text-[12px]">
                  · {book.readTime}
                </Text>
              </View>
            </View>

            <View style={styles.cta}>
              <ArrowRight size={18} color={palette.green} strokeWidth={2} />
            </View>
          </View>
        </View>

        <View style={styles.miniCover}>
          <View style={styles.miniSpine} />
          <View style={styles.miniTitleWrap}>
            <DisplayText
              style={styles.miniTitle}
              className="text-[11px] font-semibold leading-[14px]"
              numberOfLines={4}>
              {book.title}
            </DisplayText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: '#1C2B22',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  glowTop: {
    position: 'absolute',
    right: -32,
    top: -32,
    height: 160,
    width: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -48,
    left: -24,
    height: 128,
    width: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.8,
  },
  title: {
    color: '#FFFFFF',
  },
  description: {
    color: 'rgba(255, 255, 255, 0.78)',
  },
  meta: {
    color: 'rgba(255, 255, 255, 0.65)',
  },
  metaStrong: {
    color: 'rgba(255, 255, 255, 0.88)',
  },
  cta: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  miniCover: {
    width: 88,
    height: 128,
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  miniSpine: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  miniTitleWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 10,
  },
  miniTitle: {
    color: 'rgba(255, 255, 255, 0.88)',
  },
});
