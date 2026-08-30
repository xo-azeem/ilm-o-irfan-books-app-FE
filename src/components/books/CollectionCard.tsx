import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Display, LinearGradient, Text } from '@/components/ui';
import { radius } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

/**
 * A tinted card for a curated reading path. The gradient is derived from the
 * collection's own accent colour so editors control the palette from admin
 * without a code change.
 */
export const CollectionCard = memo(function CollectionCard({
  id,
  title,
  subtitle,
  accent,
  width = 220,
  height = 118,
  onPress,
  style,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  accent?: string;
  width?: number;
  height?: number;
  onPress?: (id?: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const handlePress = useCallback(() => onPress?.(id), [id, onPress]);
  const tint = accent ?? colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        { width, height, borderColor: colors.border },
        pressed && styles.pressed,
        style,
      ]}>
      <LinearGradient
        angle={140}
        stops={[
          { offset: 0, color: tint, opacity: 0.85 },
          { offset: 1, color: colors.background, opacity: 0.95 },
        ]}
      />
      <View style={styles.body}>
        <Display size={21} numberOfLines={2}>
          {title}
        </Display>
        {subtitle ? (
          <Text size={11.5} leading={1.2} tone="soft" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

/**
 * The two-up subject tile on Discover. Same idea as a collection card at a
 * different rhythm — a title with a count rather than a description.
 */
export const CategoryTile = memo(function CategoryTile({
  id,
  label,
  count,
  accent,
  width,
  onPress,
  style,
}: {
  id?: string;
  label: string;
  count?: string;
  accent?: string;
  /** Set when the tile sits in a wrapping grid, where `flex` cannot size it. */
  width?: number;
  onPress?: (id?: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const handlePress = useCallback(() => onPress?.(id), [id, onPress]);
  const tint = accent ?? colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.tile,
        { borderColor: colors.border },
        width != null ? { width, flex: undefined } : null,
        pressed && styles.pressed,
        style,
      ]}>
      <LinearGradient
        angle={140}
        stops={[
          { offset: 0, color: tint, opacity: 0.7 },
          { offset: 1, color: colors.background, opacity: 0.95 },
        ]}
      />
      <View style={styles.tileBody}>
        <Display size={18} numberOfLines={1}>
          {label}
        </Display>
        {count ? (
          <Text size={11} leading={1} tone="soft">
            {count}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  body: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
    gap: 5,
  },
  tile: {
    flex: 1,
    height: 86,
    borderRadius: radius.button,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  tileBody: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 14,
  },
  pressed: {
    opacity: 0.8,
  },
});
