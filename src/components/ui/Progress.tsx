import { memo, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Card } from '@/components/ui/Surface';
import { Display, Label, Text } from '@/components/ui/Text';
import { radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

function clamp(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

export type ProgressBarProps = {
  /** 0–1. Values outside the range are clamped rather than overflowing. */
  value: number;
  height?: number;
  /** Gold is reserved for streaks; everything else reads green. */
  tone?: 'primary' | 'gold' | 'warning';
  /** A second, dimmer segment drawn after the main one (storage in progress). */
  secondary?: number;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
};

export const ProgressBar = memo(function ProgressBar({
  value,
  height = 4,
  tone = 'primary',
  secondary,
  trackColor,
  style,
}: ProgressBarProps) {
  const { colors } = useTheme();

  const fill = useMemo(() => {
    switch (tone) {
      case 'gold':
        return colors.goldBright;
      case 'warning':
        return colors.warning;
      case 'primary':
        return colors.primaryBright;
    }
  }, [colors, tone]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamp(value) * 100) }}
      style={[
        styles.track,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor ?? colors.primaryFillSoft,
        },
        style,
      ]}>
      <View style={{ width: `${clamp(value) * 100}%`, backgroundColor: fill }} />
      {secondary ? (
        <View style={{ width: `${clamp(secondary) * 100}%`, backgroundColor: fill, opacity: 0.45 }} />
      ) : null}
    </View>
  );
});

/**
 * The hairline that runs along the bottom edge of a cover. Keeps progress
 * visible without turning a bookshelf grid into a dashboard.
 */
export const CoverProgress = memo(function CoverProgress({
  value,
  finished = false,
}: {
  value: number;
  finished?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.coverProgress, { backgroundColor: finished ? colors.primaryBright : 'rgba(0,0,0,0.4)' }]}>
      {!finished ? (
        <View style={{ width: `${clamp(value) * 100}%`, height: '100%', backgroundColor: colors.primaryBright }} />
      ) : null}
    </View>
  );
});

/**
 * A read-only slider face. The reader's brightness control drives the native
 * screen brightness, so the knob position is the only thing this draws.
 */
export const SliderTrack = memo(function SliderTrack({
  value,
  style,
}: {
  value: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const pct = clamp(value);

  return (
    <View style={[styles.sliderRoot, style]}>
      <View style={[styles.sliderTrack, { backgroundColor: colors.primaryFillSoft }]}>
        <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: colors.primaryBright }} />
      </View>
      <View
        style={[
          styles.sliderKnob,
          {
            left: `${pct * 100}%`,
            backgroundColor: colors.onPrimary,
            shadowColor: '#000',
          },
        ]}
      />
    </View>
  );
});

export type StatTileProps = {
  value: string;
  /** Two short words stacked, e.g. "BOOKS / FINISHED". */
  label: string;
  tone?: 'ink' | 'primary' | 'gold' | 'lime';
  /** Admin tiles use a bold sans numeral; reader tiles use the serif. */
  variant?: 'display' | 'dense';
  style?: StyleProp<ViewStyle>;
};

/** The small metric card used on the reading record, subscription and admin. */
export const StatTile = memo(function StatTile({
  value,
  label,
  tone = 'ink',
  variant = 'display',
  style,
}: StatTileProps) {
  return (
    <Card tone="surface" rounded={radius.button} padded={variant === 'display' ? 15 : 13} gap={6} style={[styles.statTile, style]}>
      {variant === 'display' ? (
        <Display size={24} tone={tone === 'ink' ? 'ink' : tone}>
          {value}
        </Display>
      ) : (
        <Text size={20} leading={1} weight="700" tone={tone === 'ink' ? 'ink' : tone}>
          {value}
        </Text>
      )}
      {variant === 'display' ? (
        <Label size={fontSize.labelSmall + 0.5} leading={1.3} tracking={0.6}>
          {label}
        </Label>
      ) : (
        <Text size={fontSize.labelSmall + 0.5} leading={1.2} tone="muted">
          {label}
        </Text>
      )}
    </Card>
  );
});

/**
 * The seven-day streak sparkline. Bars ramp in opacity toward today, and the
 * final two are solid gold — the only gold on the profile screen.
 */
export const StreakBars = memo(function StreakBars({
  /** One value per day, 0–1. The last entry is today. */
  days,
  height = 44,
}: {
  days: number[];
  height?: number;
}) {
  const { colors } = useTheme();
  const last = days.length - 1;

  return (
    <View style={styles.streak}>
      {days.map((day, index) => (
        <View
          key={index}
          style={{
            width: 7,
            height: Math.max(10, clamp(day) * height),
            borderRadius: 3,
            backgroundColor: colors.goldBright,
            // Older days recede; today is fully saturated.
            opacity: index === last ? 1 : 0.35 + (index / Math.max(1, last)) * 0.45,
          }}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    overflow: 'hidden',
    width: '100%',
  },
  coverProgress: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    flexDirection: 'row',
  },
  sliderRoot: {
    justifyContent: 'center',
    height: 20,
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  sliderKnob: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -10,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  statTile: {
    flex: 1,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
});
