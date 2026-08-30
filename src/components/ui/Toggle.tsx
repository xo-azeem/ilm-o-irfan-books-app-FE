import { memo, useEffect } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';

import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/theme/ThemeContext';

const TIMING = {
  duration: 180,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;

export type ToggleProps = {
  value: boolean;
  onValueChange?: (next: boolean) => void;
  disabled?: boolean;
  /** The admin panel runs a smaller switch than the reader app. */
  size?: 'md' | 'sm';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const metrics = {
  md: { width: 46, height: 28, knob: 22, pad: 3 },
  sm: { width: 40, height: 24, knob: 18, pad: 3 },
} as const;

/**
 * The switch used for every boolean in the app. The knob slides on the UI
 * thread, so a settings screen full of toggles never drops a frame.
 */
export const Toggle = memo(function Toggle({
  value,
  onValueChange,
  disabled = false,
  size = 'md',
  accessibilityLabel,
  style,
}: ToggleProps) {
  const { colors } = useTheme();
  const m = metrics[size];
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, TIMING);
  }, [progress, value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.primaryFillSoft, colors.primary],
    ),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * (m.width - m.knob - m.pad * 2) }],
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.faint, colors.onPrimary]),
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onValueChange?.(!value)}
      style={[disabled && styles.disabled, style]}>
      <Animated.View
        style={[
          {
            width: m.width,
            height: m.height,
            borderRadius: m.height / 2,
            padding: m.pad,
          },
          trackStyle,
        ]}>
        <Animated.View
          style={[{ width: m.knob, height: m.knob, borderRadius: m.knob / 2 }, knobStyle]}
        />
      </Animated.View>
    </Pressable>
  );
});

export type SelectionProps = {
  selected: boolean;
  onPress?: () => void;
  disabled?: boolean;
  size?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * The round tick used for single-choice lists — appearance, language, reading
 * rhythm, membership plans.
 */
export const RadioDot = memo(function RadioDot({
  selected,
  onPress,
  disabled = false,
  size = 22,
  accessibilityLabel,
  style,
}: SelectionProps) {
  const { colors } = useTheme();

  const body = (
    <View
      style={[
        styles.centered,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: selected ? colors.primaryBright : 'transparent',
          borderWidth: selected ? 0 : 1.5,
          borderColor: colors.borderStrong,
        },
        style,
      ]}>
      {selected ? (
        <Icon icon={Check} size={size * 0.5} color={colors.background} strokeWidth={3} />
      ) : null}
    </View>
  );

  if (!onPress) {
    return body;
  }

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}>
      {body}
    </Pressable>
  );
});

/** The square tick used for multi-select — admin bulk selection. */
export const Checkbox = memo(function Checkbox({
  selected,
  onPress,
  disabled = false,
  size = 22,
  accessibilityLabel,
  style,
}: SelectionProps) {
  const { colors } = useTheme();

  const body = (
    <View
      style={[
        styles.centered,
        {
          width: size,
          height: size,
          borderRadius: 7,
          backgroundColor: selected ? colors.primaryBright : 'transparent',
          borderWidth: selected ? 0 : 1.5,
          borderColor: colors.borderStrong,
        },
        style,
      ]}>
      {selected ? (
        <Icon icon={Check} size={size * 0.55} color={colors.background} strokeWidth={3} />
      ) : null}
    </View>
  );

  if (!onPress) {
    return body;
  }

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}>
      {body}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
});
