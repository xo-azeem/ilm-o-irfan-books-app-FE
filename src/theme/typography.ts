import { Platform, type TextStyle } from 'react-native';

/**
 * Type system.
 *
 * Three families carry the redesign:
 *   · Newsreader  — a transitional serif for every display heading and numeral.
 *   · DM Sans     — body, labels and controls.
 *   · Nastaliq    — Urdu titles, so the script leads rather than transliterates.
 *
 * ── Why explicit faces rather than `fontWeight` ─────────────────────────────
 * React Native resolves a custom font by its PostScript name on iOS and by its
 * file name on Android. Asking for a weight the loaded face does not have makes
 * both platforms *synthesise* one by smearing the outlines, which looks wrong at
 * display sizes. So each weight ships as its own file, and `*Family()` below
 * picks the real face. Call sites must then leave `fontWeight` unset — that is
 * what `resolveFamily` returns alongside the family name.
 *
 * Every bundled file's PostScript name matches its file name, so one string
 * works on both platforms. Verify that before adding a face: a mismatch fails
 * silently on iOS and falls back to the system font.
 */

export const fonts = {
  /** Body, controls, labels. */
  sans: 'DMSans-Regular',
  sansMedium: 'DMSans-Medium',
  sansBold: 'DMSans-Bold',

  /** Display headings and large numerals. */
  display: 'Newsreader16pt-Regular',
  displaySemiBold: 'Newsreader16pt-SemiBold',

  /** Urdu titles. */
  urdu: 'NotoNastaliqUrdu-Regular',
  urduBold: 'NotoNastaliqUrdu-Bold',

  /** Eyebrows, metadata, tabular numerals. A system face, so it takes weights. */
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }) as string,
} as const;

/**
 * DM Sans ships Regular, Medium and Bold — the same three weights the design's
 * own stylesheet loads. 600 rounds to Medium, matching what a browser does when
 * a semibold is requested and only these three are available.
 */
export function sansFamily(weight?: TextStyle['fontWeight']): string {
  switch (weight) {
    case '700':
    case '800':
    case '900':
    case 'bold':
      return fonts.sansBold;
    case '500':
    case '600':
      return fonts.sansMedium;
    default:
      return fonts.sans;
  }
}

/** Newsreader ships Regular and SemiBold; anything above 400 takes SemiBold. */
export function displayFamily(weight?: TextStyle['fontWeight']): string {
  if (!weight || weight === '400' || weight === 'normal') {
    return fonts.display;
  }
  return fonts.displaySemiBold;
}

/** Nastaliq ships Regular and Bold. */
export function urduFamily(weight?: TextStyle['fontWeight']): string {
  if (!weight || weight === '400' || weight === 'normal') {
    return fonts.urdu;
  }
  return fonts.urduBold;
}

export type FontRole = 'sans' | 'display' | 'urdu';

/**
 * Picks the real face for a role and weight, and clears `fontWeight` so the
 * platform cannot synthesise a second weight on top of the one we chose.
 */
export function resolveFamily(
  role: FontRole,
  weight?: TextStyle['fontWeight'],
): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  const fontFamily =
    role === 'display'
      ? displayFamily(weight)
      : role === 'urdu'
      ? urduFamily(weight)
      : sansFamily(weight);

  return { fontFamily, fontWeight: undefined };
}

/**
 * Letter-spacing, in points rather than em, because React Native's
 * `letterSpacing` is absolute. Values are tuned against the sizes below.
 */
export const typography = {
  /** Display headings run tight. */
  display: -0.5,
  displayTight: -0.8,
  tight: -0.4,
  snug: -0.2,
  normal: 0,
  wide: 0.4,
  /** Mono eyebrows — the widest tracking in the system. */
  label: 1.3,
  labelWide: 1.6,
} as const;

/** The screen-level type scale, matched to the design board. */
export const fontSize = {
  /** Splash / paywall hero. */
  hero: 40,
  /** Onboarding and section titles. */
  title: 34,
  /** Screen headings ("Discover", "My library", "Settings"). */
  screen: 30,
  /** Admin screen headings — one step denser. */
  screenDense: 27,
  /** Book titles on a detail page. */
  heading: 28,
  /** Hero card titles. */
  subheading: 26,
  /** In-page section headings ("Continue reading"). */
  section: 19,
  /** Card titles. */
  cardTitle: 17,
  body: 15,
  bodySmall: 14,
  caption: 13,
  captionSmall: 12,
  /** Mono eyebrows. */
  label: 11,
  labelSmall: 10,
} as const;

// ---------------------------------------------------------------------------
// App-wide text size
// ---------------------------------------------------------------------------

/**
 * The reader's chosen text size, applied to every glyph in the app.
 *
 * The multipliers are deliberately narrow. The scale above is drawn against a
 * 390pt frame, and anything past ~1.25 starts pushing two-line titles out of
 * cards the design gives a fixed shape. Readers who need more than this are
 * better served by the platform's own accessibility scaling, which still
 * applies on top of whatever is chosen here.
 */
export type FontScale = 'small' | 'default' | 'large' | 'xlarge';

export const FONT_SCALES: Record<FontScale, { label: string; multiplier: number }> = {
  small: { label: 'Small', multiplier: 0.9 },
  default: { label: 'Default', multiplier: 1 },
  large: { label: 'Large', multiplier: 1.12 },
  xlarge: { label: 'Largest', multiplier: 1.25 },
};

/** Smallest to largest — the order the Appearance selector draws them in. */
export const FONT_SCALE_ORDER: FontScale[] = ['small', 'default', 'large', 'xlarge'];

export function fontScaleMultiplier(scale: FontScale | undefined): number {
  return (scale && FONT_SCALES[scale]?.multiplier) ?? 1;
}

/**
 * Applies the reader's multiplier to one size from the ramp above. Rounded to
 * a half point: whole points make the ramp collapse (13 and 14 both land on 15
 * at 1.12), and anything finer only gives the rasteriser sub-pixel work.
 */
export function scaleFont(size: number, multiplier: number): number {
  return multiplier === 1 ? size : Math.round(size * multiplier * 2) / 2;
}
