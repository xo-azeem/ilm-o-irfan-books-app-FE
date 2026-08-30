import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Display, LinearGradient, Text } from '@/components/ui';
import { radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/**
 * The membership prompt on Home — deliberately a single quiet band rather than
 * a takeover. It is the only place on a browsing screen that carries gold, and
 * it stays one row tall no matter how the pricing copy changes.
 */
export const MembershipBand = memo(function MembershipBand({
  title = 'Unlimited reading, one membership',
  subtitle,
  onPress,
}: {
  title?: string;
  subtitle?: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.band,
        { borderColor: colors.goldBorder },
        pressed && styles.pressed,
      ]}>
      <LinearGradient
        angle={135}
        stops={[
          { offset: 0, color: colors.gold, opacity: 0.16 },
          { offset: 1, color: colors.background, opacity: 0.95 },
        ]}
      />

      <View
        style={[
          styles.mark,
          { backgroundColor: colors.goldFill, borderColor: colors.goldBorder },
        ]}>
        <Display size={17} tone="gold">
          ∞
        </Display>
      </View>

      <View style={styles.body}>
        <Text size={14.5} leading={1.2} weight="500">
          {title}
        </Text>
        {subtitle ? (
          <Text size={fontSize.captionSmall} leading={1.3} tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  band: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: radius.cardLarge,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  mark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  pressed: {
    opacity: 0.82,
  },
});
