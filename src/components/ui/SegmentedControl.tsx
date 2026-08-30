import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text';
import { radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

export type SegmentedControlProps<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  /**
   * `solid` fills the active segment green — the primary filter on a screen.
   * `soft` uses a translucent green, for a second control stacked beneath it.
   */
  variant?: 'solid' | 'soft';
  style?: StyleProp<ViewStyle>;
};

/**
 * The status / role filter used across the admin panel and the book editor's
 * Details / Files / Placement tabs. Segments share the width evenly so the
 * control never reflows as labels change.
 */
function SegmentedControlInner<T extends string>({
  options,
  value,
  onChange,
  variant = 'solid',
  style,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.root,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
        style,
      ]}>
      {options.map(option => {
        const active = option.value === value;
        return (
          <Segment
            key={option.value}
            option={option}
            active={active}
            variant={variant}
            onChange={onChange}
          />
        );
      })}
    </View>
  );
}

type SegmentProps<T extends string> = {
  option: SegmentOption<T>;
  active: boolean;
  variant: 'solid' | 'soft';
  onChange: (next: T) => void;
};

/**
 * Split out so each segment keeps a stable press handler — the parent map would
 * otherwise allocate a new closure per option on every render.
 */
function SegmentInner<T extends string>({ option, active, variant, onChange }: SegmentProps<T>) {
  const { colors } = useTheme();
  const handlePress = useCallback(() => onChange(option.value), [onChange, option.value]);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.segment,
        active && {
          backgroundColor: variant === 'solid' ? colors.primary : colors.primaryFill,
        },
        pressed && !active && styles.pressed,
      ]}>
      <Text
        size={fontSize.captionSmall}
        leading={1}
        weight={active ? '600' : '500'}
        tone={active ? (variant === 'solid' ? 'onPrimary' : 'primary') : 'muted'}>
        {option.label}
      </Text>
    </Pressable>
  );
}

const Segment = memo(SegmentInner) as typeof SegmentInner;

export const SegmentedControl = memo(SegmentedControlInner) as typeof SegmentedControlInner;

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.chip,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
