import { memo, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Icon, type LucideIcon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { radius } from '@/theme/palette';
import { fontSize, scaleFont } from '@/theme/typography';
import { useTheme, type AppColors } from '@/theme/ThemeContext';

/**
 * Buttons.
 *
 * `primary` is the green that carries every action in the app. `gold` exists
 * only for membership — the paywall is the single screen allowed to use it, and
 * that scarcity is what makes it read as a threshold.
 */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'gold'
  | 'danger'
  | 'dangerSolid';

export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Heights are the drawn tap targets, and they grow with the reader's text size
 * so a larger label never sits tight against the pill. They deliberately do not
 * *shrink* below the drawn value at the Small step — a 49pt button would be a
 * worse target for no gain, since only the label was asked to get smaller.
 */
const sizing: Record<ButtonSize, { height: number; padding: number; text: number; radius: number }> =
  {
    sm: { height: 40, padding: 14, text: fontSize.caption, radius: radius.chip },
    md: { height: 48, padding: 18, text: fontSize.bodySmall, radius: 14 },
    lg: { height: 54, padding: 20, text: fontSize.body, radius: radius.button },
  };

type VariantStyle = {
  background: string;
  border?: string;
  label: string;
  shadow?: string;
};

function variantStyle(variant: ButtonVariant, colors: AppColors): VariantStyle {
  switch (variant) {
    case 'primary':
      return {
        background: colors.primary,
        label: colors.onPrimary,
        shadow: colors.primary,
      };
    case 'secondary':
      return {
        background: 'transparent',
        border: colors.borderStrong,
        label: colors.inkSoft,
      };
    case 'ghost':
      return { background: colors.primaryFillSoft, label: colors.primarySoft };
    case 'gold':
      return {
        background: colors.goldBright,
        label: colors.onGold,
        shadow: colors.gold,
      };
    case 'danger':
      return {
        background: 'transparent',
        border: colors.dangerBorder,
        label: colors.danger,
      };
    case 'dangerSolid':
      return { background: colors.dangerFill, border: colors.dangerBorder, label: colors.danger };
  }
}

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  /** Places the icon after the label — used for "continue" style actions. */
  iconTrailing?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const Button = memo(function Button({
  label,
  variant = 'primary',
  size = 'lg',
  icon,
  iconTrailing = false,
  loading = false,
  fullWidth = true,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const { colors, fontScale } = useTheme();
  const metrics = sizing[size];
  const palette = useMemo(() => variantStyle(variant, colors), [colors, variant]);
  const isDisabled = disabled || loading;
  const growth = Math.max(1, fontScale);

  const containerStyle = useMemo<ViewStyle>(
    () => ({
      height: Math.round(metrics.height * growth),
      paddingHorizontal: metrics.padding,
      borderRadius: metrics.radius,
      backgroundColor: palette.background,
      borderWidth: palette.border ? StyleSheet.hairlineWidth * 2 : 0,
      borderColor: palette.border,
      alignSelf: fullWidth ? 'stretch' : 'flex-start',
      // A solid button carries a soft cast of its own colour; outlined ones sit flat.
      ...(palette.shadow
        ? {
            shadowColor: palette.shadow,
            shadowOpacity: 0.3,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 6,
          }
        : null),
    }),
    [fullWidth, growth, metrics, palette],
  );

  // The glyph is set to the label's size, so it has to follow it up the ramp.
  const glyph = icon ? (
    <Icon icon={icon} size={scaleFont(metrics.text, fontScale)} color={palette.label} />
  ) : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        containerStyle,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator size="small" color={palette.label} />
      ) : (
        <>
          {!iconTrailing ? glyph : null}
          <Text
            size={metrics.text}
            leading={1}
            weight={variant === 'primary' || variant === 'gold' ? '700' : '500'}
            tone="inherit"
            style={{ color: palette.label }}>
            {label}
          </Text>
          {iconTrailing ? glyph : null}
        </>
      )}
    </Pressable>
  );
});

/** A bordered or filled square that carries a single glyph. */
export const IconButton = memo(function IconButton({
  icon,
  size = 16,
  buttonSize = 38,
  variant = 'secondary',
  style,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  icon: LucideIcon;
  size?: number;
  buttonSize?: number;
  variant?: ButtonVariant | 'plain';
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();

  const palette = useMemo(
    () =>
      variant === 'plain'
        ? { background: colors.primaryFillSoft, border: undefined, label: colors.inkSoft }
        : variantStyle(variant, colors),
    [colors, variant],
  );

  const containerStyle = useMemo<ViewStyle>(
    () => ({
      width: buttonSize,
      height: buttonSize,
      borderRadius: Math.round(buttonSize * 0.32),
      backgroundColor: palette.background,
      borderWidth: palette.border ? StyleSheet.hairlineWidth * 2 : 0,
      borderColor: palette.border,
    }),
    [buttonSize, palette],
  );

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.base, containerStyle, pressed && styles.pressed, style]}
      {...rest}>
      <Icon icon={icon} size={size} color={palette.label} />
    </Pressable>
  );
});

/**
 * A bare text action — "Reset", "Cancel", "See all". Green when it advances
 * something, muted when it retreats.
 */
export const TextButton = memo(function TextButton({
  label,
  tone = 'primary',
  size = fontSize.caption,
  style,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  tone?: 'primary' | 'muted' | 'danger' | 'gold';
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [pressed && styles.pressed, style]}
      {...rest}>
      <Text size={size} leading={1} weight={tone === 'primary' ? '600' : '500'} tone={tone}>
        {label}
      </Text>
    </Pressable>
  );
});

/**
 * The extended floating action button used across the admin panel — a green
 * capsule pinned above the tab bar.
 */
export const FloatingAction = memo(function FloatingAction({
  label,
  icon,
  style,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, fontScale } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        styles.fab,
        {
          height: Math.round(52 * Math.max(1, fontScale)),
          backgroundColor: colors.primary,
          shadowColor: colors.primary,
        },
        pressed && styles.pressed,
        style,
      ]}
      {...rest}>
      {icon ? <Icon icon={icon} size={17} color={colors.onPrimary} strokeWidth={2.2} /> : null}
      <Text size={fontSize.bodySmall} leading={1} weight="700" tone="inherit" style={{ color: colors.onPrimary }}>
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.45,
  },
  fab: {
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 26,
    gap: 9,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
});
