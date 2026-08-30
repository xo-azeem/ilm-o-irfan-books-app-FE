import { memo, useMemo, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Icon, type LucideIcon } from '@/components/ui/Icon';
import { Label, Text } from '@/components/ui/Text';
import { layout, radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme, type AppColors } from '@/theme/ThemeContext';

/**
 * Chips carry every filter, tag and multi-select in the app. Selected chips
 * fill green with a brighter rim; unselected ones sit on the control tone.
 */
export type ChipProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  selected?: boolean;
  /** A trailing count, e.g. the "2" on an active Filters chip. */
  count?: number | string;
  icon?: LucideIcon;
  /** `solid` fills fully green — used for the onboarding subject chips. */
  variant?: 'outline' | 'solid';
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
};

export const Chip = memo(function Chip({
  label,
  selected = false,
  count,
  icon,
  variant = 'outline',
  size = 'md',
  style,
  ...rest
}: ChipProps) {
  const { colors } = useTheme();
  const solidSelected = variant === 'solid' && selected;

  const chipStyle = useMemo<ViewStyle>(
    () => ({
      paddingVertical: size === 'sm' ? 9 : 10,
      paddingHorizontal: size === 'sm' ? 14 : 15,
      borderRadius: size === 'sm' ? radius.chip : radius.control,
      backgroundColor: solidSelected
        ? colors.primary
        : selected
        ? colors.selected
        : colors.control,
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: solidSelected
        ? colors.primary
        : selected
        ? colors.selectedBorder
        : colors.border,
    }),
    [colors, selected, size, solidSelected],
  );

  const labelTone = solidSelected ? 'onPrimary' : selected ? 'ink' : 'muted';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.chip, chipStyle, pressed && styles.pressed, style]}
      {...rest}>
      {icon ? (
        <Icon icon={icon} size={12} tone={labelTone === 'onPrimary' ? 'onPrimary' : 'soft'} strokeWidth={2.2} />
      ) : null}
      <Text
        size={size === 'sm' ? fontSize.captionSmall + 0.5 : fontSize.caption}
        leading={1}
        weight="500"
        tone={labelTone}>
        {label}
      </Text>
      {count != null ? (
        <Text size={fontSize.labelSmall} leading={1} weight="600" tone={solidSelected ? 'onPrimary' : 'primary'}>
          {String(count)}
        </Text>
      ) : null}
      {solidSelected ? (
        <Text size={fontSize.caption} leading={1} tone="onPrimary" style={styles.tick}>
          ✓
        </Text>
      ) : null}
    </Pressable>
  );
});

/**
 * A horizontally scrolling chip rail. Bleeds to the screen edge so the last
 * chip is visibly clipped rather than ending flush.
 */
export const ChipRow = memo(function ChipRow({
  children,
  bleed = layout.screenPadding,
  gap = 8,
  style,
}: {
  children: ReactNode;
  /** Screen padding to cancel out, so the rail runs edge to edge. */
  bleed?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[{ marginHorizontal: -bleed }, style]}
      contentContainerStyle={{ paddingHorizontal: bleed, gap }}>
      {children}
    </ScrollView>
  );
});

/** A wrapping chip field — onboarding subjects, search tags. */
export const ChipWrap = memo(function ChipWrap({
  children,
  gap = 10,
  style,
}: {
  children: ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.wrap, { gap }, style]}>{children}</View>;
});

export type BadgeTone = 'primary' | 'gold' | 'lime' | 'neutral' | 'danger' | 'warning';

/**
 * The small uppercase pill that states a fact — IN MEMBERSHIP, LIVE, DRAFT,
 * PDF REQUIRED. Always monospace, always a statement rather than an action.
 */
export const Badge = memo(function Badge({
  label,
  tone = 'neutral',
  bordered = false,
  style,
}: {
  label: string;
  tone?: BadgeTone;
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();

  const palette = useMemo(() => badgePalette(tone, colors), [colors, tone]);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: palette.fill,
          borderWidth: bordered ? StyleSheet.hairlineWidth * 2 : 0,
          borderColor: palette.border,
        },
        style,
      ]}>
      <Label size={9} leading={1.3} weight="600" tone="inherit" style={{ color: palette.ink }}>
        {label}
      </Label>
    </View>
  );
});

function badgePalette(tone: BadgeTone, colors: AppColors) {
  switch (tone) {
    case 'primary':
      return { fill: colors.primaryFill, border: colors.selectedBorder, ink: colors.primarySoft };
    case 'gold':
      return { fill: colors.goldFill, border: colors.goldBorder, ink: colors.goldBright };
    case 'lime':
      return { fill: colors.limeFill, border: colors.borderStrong, ink: colors.lime };
    case 'danger':
      return { fill: colors.dangerFill, border: colors.dangerBorder, ink: colors.danger };
    case 'warning':
      return { fill: colors.warningFill, border: colors.warningBorder, ink: colors.warning };
    case 'neutral':
      return { fill: colors.primaryFillSoft, border: colors.border, ink: colors.muted };
  }
}

/**
 * A removable tag, used in the admin book editor's search-tag field. The
 * dashed variant is the "add" affordance.
 */
export const Tag = memo(function Tag({
  label,
  onRemove,
  dashed = false,
  onPress,
}: {
  label: string;
  onRemove?: () => void;
  dashed?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tag,
        dashed
          ? { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colors.borderStrong, borderStyle: 'dashed' }
          : { backgroundColor: colors.primaryFillSoft },
        pressed && styles.pressed,
      ]}>
      <Text size={fontSize.captionSmall + 0.5} leading={1} tone={dashed ? 'faint' : 'soft'}>
        {label}
      </Text>
      {onRemove ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${label}`} hitSlop={8} onPress={onRemove}>
          <Text size={fontSize.captionSmall} leading={1} tone="faint">
            ×
          </Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  pressed: {
    opacity: 0.72,
  },
  tick: {
    opacity: 0.7,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 7,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 10,
  },
});
