import { memo, useMemo, type PropsWithChildren, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Icon, type LucideIcon } from '@/components/ui/Icon';
import { Display, Label, Text } from '@/components/ui/Text';
import { radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme, type AppColors } from '@/theme/ThemeContext';

/**
 * Surfaces.
 *
 * Three tones cover every panel in the app: `surface` for a normal card,
 * `alt` for a card nested inside one, and `raised` for a control sitting on
 * top. Selection adds a green rim rather than changing the fill wholesale.
 */
export type CardTone = 'surface' | 'alt' | 'raised' | 'transparent';

function cardFill(tone: CardTone, colors: AppColors): string | undefined {
  switch (tone) {
    case 'surface':
      return colors.surface;
    case 'alt':
      return colors.surfaceAlt;
    case 'raised':
      return colors.surfaceRaised;
    case 'transparent':
      return undefined;
  }
}

export type CardProps = PropsWithChildren<{
  tone?: CardTone;
  /** Rounds to the card radius by default; pass a number for a one-off. */
  rounded?: number;
  padded?: boolean | number;
  bordered?: boolean;
  selected?: boolean;
  /** Draws the gold rim reserved for membership surfaces. */
  gold?: boolean;
  /** Draws the amber rim used for "needs attention" in admin. */
  warning?: boolean;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}>;

export const Card = memo(function Card({
  children,
  tone = 'surface',
  rounded = radius.card,
  padded = false,
  bordered = true,
  selected = false,
  gold = false,
  warning = false,
  gap,
  style,
}: CardProps) {
  const { colors } = useTheme();

  const cardStyle = useMemo<ViewStyle>(() => {
    const borderColor = selected
      ? colors.selectedBorder
      : gold
      ? colors.goldBorder
      : warning
      ? colors.warningBorder
      : colors.border;

    return {
      backgroundColor: selected ? colors.selected : cardFill(tone, colors),
      borderRadius: rounded,
      borderWidth: bordered ? StyleSheet.hairlineWidth * 2 : 0,
      borderColor: bordered ? borderColor : undefined,
      padding: typeof padded === 'number' ? padded : padded ? 16 : undefined,
      gap,
    };
  }, [bordered, colors, gap, gold, padded, rounded, selected, tone, warning]);

  return <View style={[cardStyle, style]}>{children}</View>;
});

/** A card that responds to a press. Same visuals, adds a pressed state. */
export const PressableCard = memo(function PressableCard({
  children,
  tone = 'surface',
  rounded = radius.card,
  padded = false,
  bordered = true,
  selected = false,
  gold = false,
  gap,
  style,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & CardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [pressed && styles.pressed, style]}
      {...rest}>
      <Card
        tone={tone}
        rounded={rounded}
        padded={padded}
        bordered={bordered}
        selected={selected}
        gold={gold}
        gap={gap}>
        {children}
      </Card>
    </Pressable>
  );
});

/** A hairline rule. Defaults to the divider tone used inside grouped lists. */
export const Divider = memo(function Divider({
  inset = 0,
  vertical = false,
  style,
}: {
  inset?: number;
  vertical?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        vertical
          ? { width: StyleSheet.hairlineWidth * 2, alignSelf: 'stretch' }
          : { height: StyleSheet.hairlineWidth * 2, marginHorizontal: inset },
        { backgroundColor: colors.divider },
        style,
      ]}
    />
  );
});

/**
 * The eyebrow + optional action that heads a section. Used for both the
 * monospace label style ("BROWSE BY SUBJECT") and the serif style
 * ("Continue reading").
 */
export const SectionHeader = memo(function SectionHeader({
  title,
  subtitle,
  action,
  variant = 'label',
  style,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** `label` is the mono eyebrow; `display` is the serif section title. */
  variant?: 'label' | 'display';
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={styles.sectionTitles}>
        {variant === 'label' ? (
          <Label>{title}</Label>
        ) : (
          <Display size="section">{title}</Display>
        )}
        {subtitle ? (
          <Text size={fontSize.captionSmall} leading={1.2} tone="faint">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
});

export type CalloutTone = 'warning' | 'danger' | 'info' | 'gold';

/**
 * The tinted banner that reports a condition — missing PDFs in admin, OS
 * notifications switched off, dev-mode paywall. Never a stack trace: it states
 * what happened and offers one useful next step.
 */
export const Callout = memo(function Callout({
  title,
  message,
  tone = 'warning',
  icon,
  action,
  onPress,
  style,
}: {
  title: string;
  message?: string;
  tone?: CalloutTone;
  icon?: LucideIcon;
  action?: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();

  const palette = useMemo(() => {
    switch (tone) {
      case 'warning':
        return { fill: colors.warningFill, border: colors.warningBorder, ink: colors.warning };
      case 'danger':
        return { fill: colors.dangerFill, border: colors.dangerBorder, ink: colors.danger };
      case 'gold':
        return { fill: colors.goldFill, border: colors.goldBorder, ink: colors.goldBright };
      case 'info':
        return { fill: colors.surfaceAlt, border: colors.border, ink: colors.primarySoft };
    }
  }, [colors, tone]);

  const body = (
    <View
      style={[
        styles.callout,
        { backgroundColor: palette.fill, borderColor: palette.border },
        style,
      ]}>
      {icon ? <Icon icon={icon} size={18} color={palette.ink} strokeWidth={2} /> : null}
      <View style={styles.calloutBody}>
        <Text size={fontSize.caption} leading={1.3} weight="600" tone="inherit" style={{ color: palette.ink }}>
          {title}
        </Text>
        {message ? (
          <Text size={fontSize.captionSmall} leading={1.45} tone="muted">
            {message}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );

  if (!onPress) {
    return body;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
      {body}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.75,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitles: {
    flex: 1,
    gap: 3,
  },
  callout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 14,
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  calloutBody: {
    flex: 1,
    gap: 3,
  },
});
