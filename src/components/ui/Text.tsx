import { memo, useMemo, type ReactNode } from 'react';
import {
  Text as RNText,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';

import { isArabicScript } from '@/i18n/locale';
import {
  fonts,
  fontSize,
  lineHeightFor,
  resolveFamily,
  scaleFont,
  typography,
} from '@/theme/typography';
import { useTheme, type AppColors } from '@/theme/ThemeContext';

/**
 * Every glyph in the app comes through one of these four components, so a
 * change to the type ramp is a change to this file and nothing else.
 *
 *   Display  — Newsreader serif. Headings and large numerals.
 *   Text     — DM Sans. Body, controls, metadata.
 *   Label    — Monospace eyebrow, uppercase and widely tracked.
 *   UrduText — Nastaliq, right-to-left.
 *
 * That is also why the reader's app-wide text size is applied here and nowhere
 * else: every size below is multiplied by `fontScale` from theme context, so
 * one choice in Appearance moves the whole app at once. Tracking is scaled with
 * it — the values in `typography` are absolute points tuned against these
 * sizes, so leaving them fixed would make large text read loose and small text
 * read cramped. Line height follows from the scaled size, never the raw one.
 *
 * ── Script ──────────────────────────────────────────────────────────────────
 * The interface can be read in Urdu, and an Urdu interface still shows English
 * book titles, addresses and file names — so the face is decided by the text
 * itself, not by the language setting. A run in the Arabic script is set in
 * Nastaliq with the leading it needs, no tracking (letter-spacing breaks the
 * joins between Arabic letters) and right-to-left direction, whichever of the
 * three Latin components asked for it. Call sites never need to know.
 */

/** The string a text element is drawing, for the script check. */
function textOf(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(textOf).join('');
  return '';
}

/**
 * Nastaliq stacks its letters diagonally and needs more room than Latin at
 * the same size: a line box sized for DM Sans clips it top and bottom — the
 * face's own line height is close to twice its size. These are the floors the
 * three Latin components hold Urdu text to.
 */
const URDU_LEADING = { display: 1.9, text: 1.8, label: 1.7 } as const;

/**
 * Nastaliq's descenders — the tail of a ے, the sweep of a ی — reach well
 * below the baseline — the face's own bottom extent is 1.4 em, against a
 * descent of 0.6 — and Android clips a glyph at
 * the edge of the text's own view. Padding the view at the foot, in
 * proportion to the size, gives the last line somewhere to land. Applied
 * as a style of its own so a caller's `style` can still override it.
 */
function urduFoot(size: number): TextStyle {
  return { paddingBottom: Math.ceil(size * 0.8) };
}

/**
 * The eyebrow face is a system monospace, whose Arabic glyphs are whatever
 * the platform falls back to. Urdu eyebrows take Nastaliq instead, and a
 * little more size, because Nastaliq's small letters vanish at eyebrow sizes.
 */
const URDU_LABEL_GROWTH = 1.5;

export type TextTone =
  | 'ink'
  | 'soft'
  | 'muted'
  | 'faint'
  | 'dim'
  | 'primary'
  /** Green that reads as a link or a tappable word. */
  | 'action'
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
    case 'action':
      return colors.actionInk;
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

const displayScale: Record<
  DisplaySize,
  { size: number; leading: number; tracking: number }
> = {
  hero: {
    size: fontSize.hero,
    leading: 1.08,
    tracking: typography.displayTight,
  },
  title: { size: fontSize.title, leading: 1.15, tracking: typography.tight },
  screen: { size: fontSize.screen, leading: 1.1, tracking: typography.display },
  screenDense: {
    size: fontSize.screenDense,
    leading: 1.1,
    tracking: typography.display,
  },
  heading: { size: fontSize.heading, leading: 1.15, tracking: typography.snug },
  subheading: {
    size: fontSize.subheading,
    leading: 1.14,
    tracking: typography.snug,
  },
  section: {
    size: fontSize.section,
    leading: 1.15,
    tracking: typography.normal,
  },
  cardTitle: {
    size: fontSize.cardTitle,
    leading: 1.2,
    tracking: typography.normal,
  },
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
  const { colors, fontScale } = useTheme();
  const urdu = isArabicScript(textOf(rest.children));

  const resolved = useMemo(() => {
    const scale =
      typeof size === 'number'
        ? { size, leading: 1.15, tracking: typography.snug }
        : displayScale[size];
    const resolvedSize = scaleFont(scale.size, fontScale);
    if (urdu) {
      return {
        ...resolveFamily('urdu', weight),
        fontSize: resolvedSize,
        lineHeight: lineHeightFor(
          resolvedSize,
          Math.max(leading ?? scale.leading, URDU_LEADING.display),
        ),
        letterSpacing: 0,
        color: toneColor(tone, colors),
        textAlign: align,
        writingDirection: 'rtl',
      } satisfies TextStyle;
    }
    return {
      ...resolveFamily('display', weight),
      fontSize: resolvedSize,
      lineHeight: lineHeightFor(resolvedSize, leading ?? scale.leading),
      letterSpacing: (tracking ?? scale.tracking) * fontScale,
      color: toneColor(tone, colors),
      textAlign: align,
    } satisfies TextStyle;
  }, [align, colors, fontScale, leading, size, tone, tracking, urdu, weight]);

  return (
    <RNText
      {...rest}
      style={[urdu ? urduFoot(resolved.fontSize) : null, resolved, style]}
    />
  );
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
  const { colors, fontScale } = useTheme();
  const urdu = isArabicScript(textOf(rest.children));

  const resolved = useMemo(() => {
    const resolvedSize = scaleFont(size, fontScale);
    if (urdu) {
      return {
        ...resolveFamily('urdu', weight),
        fontSize: resolvedSize,
        lineHeight: lineHeightFor(
          resolvedSize,
          Math.max(leading, URDU_LEADING.text),
        ),
        letterSpacing: 0,
        color: toneColor(tone, colors),
        textAlign: align,
        writingDirection: 'rtl',
      } satisfies TextStyle;
    }
    return {
      ...resolveFamily('sans', weight),
      fontSize: resolvedSize,
      lineHeight: lineHeightFor(resolvedSize, leading),
      letterSpacing: tracking * fontScale,
      color: toneColor(tone, colors),
      textAlign: align,
    } satisfies TextStyle;
  }, [align, colors, fontScale, leading, size, tone, tracking, urdu, weight]);

  return (
    <RNText
      {...rest}
      style={[urdu ? urduFoot(resolved.fontSize) : null, resolved, style]}
    />
  );
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
  const { colors, fontScale } = useTheme();
  const urdu = isArabicScript(textOf(rest.children));

  const resolved = useMemo(() => {
    const resolvedSize = scaleFont(size, fontScale);
    if (urdu) {
      const urduSize = resolvedSize + URDU_LABEL_GROWTH;
      return {
        ...resolveFamily('urdu', weight),
        fontSize: urduSize,
        lineHeight: lineHeightFor(
          urduSize,
          Math.max(leading, URDU_LEADING.label),
        ),
        letterSpacing: 0,
        color: toneColor(tone, colors),
        textAlign: align,
        writingDirection: 'rtl',
      } satisfies TextStyle;
    }
    return {
      fontFamily: fonts.mono,
      fontSize: resolvedSize,
      // Uppercase has no descenders, so eyebrows and pills may sit as tight as
      // they ask; only mixed-case labels need the clipping floor.
      lineHeight: uppercase
        ? Math.round(resolvedSize * leading)
        : lineHeightFor(resolvedSize, leading),
      letterSpacing: tracking * fontScale,
      fontWeight: weight,
      color: toneColor(tone, colors),
      textAlign: align,
      textTransform: uppercase ? 'uppercase' : undefined,
    } satisfies TextStyle;
  }, [
    align,
    colors,
    fontScale,
    leading,
    size,
    tone,
    tracking,
    uppercase,
    urdu,
    weight,
  ]);

  return (
    <RNText
      {...rest}
      style={[urdu ? urduFoot(resolved.fontSize) : null, resolved, style]}
    />
  );
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
  const { colors, fontScale } = useTheme();

  const resolved = useMemo(() => {
    const resolvedSize = scaleFont(size, fontScale);
    return {
      ...resolveFamily('urdu', weight),
      fontSize: resolvedSize,
      lineHeight: lineHeightFor(resolvedSize, leading),
      letterSpacing: tracking * fontScale,
      color: toneColor(tone, colors),
      textAlign: align,
      writingDirection: 'rtl',
    } satisfies TextStyle;
  }, [align, colors, fontScale, leading, size, tone, tracking, weight]);

  return (
    <RNText {...rest} style={[urduFoot(resolved.fontSize), resolved, style]} />
  );
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
        {...urduRest}
      >
        {title}
      </UrduText>
    );
  }
  return <Display {...rest}>{title}</Display>;
}

/** @deprecated Use `Display`. Kept so older imports keep compiling. */
export const DisplayText = Display;
