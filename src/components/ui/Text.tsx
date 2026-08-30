import { memo, useMemo } from 'react';
import {
  Text as RNText,
  StyleSheet,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';

import { fonts, fontSize, resolveFamily, typography } from '@/theme/typography';
import { useTheme, type AppColors } from '@/theme/ThemeContext';

/**
 * Every glyph in the app comes through one of these four components, so a
 * change to the type ramp is a change to this file and nothing else.
 *
 *   Display  — Newsreader serif. Headings and large numerals.
 *   Text     — DM Sans. Body, controls, metadata.
 *   Label    — Monospace eyebrow, uppercase and widely tracked.
 *   UrduText — Nastaliq, right-to-left.
 */

export type TextTone =
  | 'ink'
  | 'soft'
  | 'muted'
  | 'faint'
  | 'dim'
  | 'primary'
  | 'gold'
  | 'danger'
  | 'warning'
  | 'lime'
  | 'onPrimary'
  | 'onGold'
  | 'inherit';

function toneColor(tone: TextTone, colors: AppColors): string | undefined {
  switch (tone) {
    case 'ink':
      return colors.ink;
    case 'soft':
      return colors.inkSoft;
    case 'muted':
      return colors.muted;
    case 'faint':
      return colors.faint;
    case 'dim':
      return colors.dim;
    case 'primary':
      return colors.primarySoft;
    case 'gold':
      return colors.goldBright;
    case 'danger':
      return colors.danger;
    case 'warning':
      return colors.warning;
    case 'lime':
      return colors.lime;
    case 'onPrimary':
      return colors.onPrimary;
    case 'onGold':
      return colors.onGold;
    case 'inherit':
      return undefined;
  }
}

type BaseTextProps = Omit<RNTextProps, 'style'> & {
  tone?: TextTone;
  size?: number;
  /** Multiplier applied to `size`. Defaults differ per component. */
  leading?: number;
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
  tracking?: number;
  style?: StyleProp<TextStyle>;
  className?: string;
};

// ---------------------------------------------------------------------------
// Display — Newsreader
// ---------------------------------------------------------------------------

export type DisplaySize =
  | 'hero'
  | 'title'
  | 'screen'
  | 'screenDense'
  | 'heading'
  | 'subheading'
  | 'section'
  | 'cardTitle';

const displayScale: Record<DisplaySize, { size: number; leading: number; tracking: number }> = {
  hero: { size: fontSize.hero, leading: 1.08, tracking: typography.displayTight },
  title: { size: fontSize.title, leading: 1.15, tracking: typography.tight },
  screen: { size: fontSize.screen, leading: 1.1, tracking: typography.display },
  screenDense: { size: fontSize.screenDense, leading: 1.1, tracking: typography.display },
  heading: { size: fontSize.heading, leading: 1.15, tracking: typography.snug },
  subheading: { size: fontSize.subheading, leading: 1.14, tracking: typography.snug },
  section: { size: fontSize.section, leading: 1.15, tracking: typography.normal },
  cardTitle: { size: fontSize.cardTitle, leading: 1.2, tracking: typography.normal },
};

export type DisplayProps = Omit<BaseTextProps, 'size'> & {
  size?: DisplaySize | number;
};

/** Serif headings and large numerals. */
export const Display = memo(function Display({
  tone = 'ink',
  size = 'screen',
  leading,
  weight,
  align,
  tracking,
  style,
  ...rest
}: DisplayProps) {
  const { colors } = useTheme();

  const resolved = useMemo(() => {
    const scale =
      typeof size === 'number'
        ? { size, leading: 1.15, tracking: typography.snug }
        : displayScale[size];
    return {
      ...resolveFamily('display', weight),
      fontSize: scale.size,
      lineHeight: Math.round(scale.size * (leading ?? scale.leading)),
      letterSpacing: tracking ?? scale.tracking,
      color: toneColor(tone, colors),
      textAlign: align,
    } satisfies TextStyle;
  }, [align, colors, leading, size, tone, tracking, weight]);

  return <RNText {...rest} style={[resolved, style]} />;
});

// ---------------------------------------------------------------------------
// Text — DM Sans
// ---------------------------------------------------------------------------

export const Text = memo(function Text({
  tone = 'ink',
  size = fontSize.body,
  leading = 1.45,
  weight = '400',
  align,
  tracking = typography.normal,
  style,
  ...rest
}: BaseTextProps) {
  const { colors } = useTheme();

  const resolved = useMemo(
    () =>
      ({
        ...resolveFamily('sans', weight),
        fontSize: size,
        lineHeight: Math.round(size * leading),
        letterSpacing: tracking,
        color: toneColor(tone, colors),
        textAlign: align,
      } satisfies TextStyle),
    [align, colors, leading, size, tone, tracking, weight],
  );

  return <RNText {...rest} style={[resolved, style]} />;
});

// ---------------------------------------------------------------------------
// Label — monospace eyebrow
// ---------------------------------------------------------------------------

export type LabelProps = BaseTextProps & {
  /** Eyebrows are uppercase by default; set false for slugs and file names. */
  uppercase?: boolean;
};

/**
 * The wide-tracked monospace eyebrow that heads most sections. Also used for
 * status pills, page counters and any tabular numeral.
 */
export const Label = memo(function Label({
  tone = 'faint',
  size = fontSize.label,
  leading = 1,
  weight = '500',
  align,
  tracking = typography.label,
  uppercase = true,
  style,
  ...rest
}: LabelProps) {
  const { colors } = useTheme();

  const resolved = useMemo(
    () =>
      ({
        fontFamily: fonts.mono,
        fontSize: size,
        lineHeight: Math.round(size * leading),
        letterSpacing: tracking,
        fontWeight: weight,
        color: toneColor(tone, colors),
        textAlign: align,
        textTransform: uppercase ? 'uppercase' : undefined,
      } satisfies TextStyle),
    [align, colors, leading, size, tone, tracking, uppercase, weight],
  );

  return <RNText {...rest} style={[resolved, style]} />;
});

// ---------------------------------------------------------------------------
// UrduText — Nastaliq, right-to-left
// ---------------------------------------------------------------------------

/**
 * Nastaliq needs noticeably more leading than Latin text at the same size, and
 * always aligns right. Titles that carry both scripts lead with this one.
 */
export const UrduText = memo(function UrduText({
  tone = 'ink',
  size = 17,
  leading = 1.6,
  weight,
  align = 'right',
  tracking = typography.normal,
  style,
  ...rest
}: BaseTextProps) {
  const { colors } = useTheme();

  const resolved = useMemo(
    () =>
      ({
        ...resolveFamily('urdu', weight),
        fontSize: size,
        lineHeight: Math.round(size * leading),
        letterSpacing: tracking,
        color: toneColor(tone, colors),
        textAlign: align,
        writingDirection: 'rtl',
      } satisfies TextStyle),
    [align, colors, leading, size, tone, tracking, weight],
  );

  return <RNText {...rest} style={[styles.urdu, resolved, style]} />;
});

/**
 * Picks the right face for a book title without every call site repeating the
 * check. Titles arrive from Supabase in either script.
 */
export function BookTitle({
  title,
  isUrdu,
  ...rest
}: DisplayProps & { title: string; isUrdu?: boolean }) {
  if (isUrdu) {
    const { size, ...urduRest } = rest;
    return (
      <UrduText
        size={typeof size === 'number' ? size : undefined}
        {...urduRest}>
        {title}
      </UrduText>
    );
  }
  return <Display {...rest}>{title}</Display>;
}

const styles = StyleSheet.create({
  urdu: {
    // Nastaliq glyphs overflow their line box; a little breathing room stops
    // descenders being clipped on Android.
    paddingBottom: 2,
  },
});

/** @deprecated Use `Display`. Kept so older imports keep compiling. */
export const DisplayText = Display;
