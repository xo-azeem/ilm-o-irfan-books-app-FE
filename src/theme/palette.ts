/**
 * Ilm-o-Irfan design tokens.
 *
 * The redesign is a cinematic dark reading platform built on the brand's deep
 * green, with gold reserved exclusively for membership, streaks and
 * achievements. Green carries every action; the two accents never mix inside a
 * single component.
 *
 * Light mode is kept as a faithful counterpart (the Appearance screen still
 * offers Light / Dark / System) but dark is the canonical surface.
 */

/** Raw brand ramps. Prefer the semantic `theme` tokens below in components. */
export const palette = {
  /** Green — every action, every affordance. */
  green: '#2D8A47',
  greenBright: '#3FA660',
  greenSoft: '#8FBF6A',
  greenDeep: '#1A5A2C',

  /** Gold — membership, streaks, achievements. Nothing else. */
  gold: '#C9A227',
  goldBright: '#E5BE2B',

  /** Admin-only signal colours. */
  lime: '#D0E836',
  amber: '#D99A2B',
  red: '#E86A6A',

  /** Legacy brand values retained so older imports keep resolving. */
  yellowGreen: '#9ACD32',
  chartreuse: '#9AE638',
  limelight: '#D0E836',
  sunflower: '#E5BE2B',
} as const;

export const theme = {
  dark: {
    /** Near-black with a green cast so book covers sit warm, not clinical. */
    background: '#080B09',
    /** Primary card surface. */
    surface: '#121711',
    /** Inset / secondary card, one step darker than `surface`. */
    surfaceAlt: '#101410',
    /** Raised surface — chips, tiles, pressed rows. */
    surfaceRaised: '#1A211A',
    /** Highest surface in the ramp. */
    surfaceHigh: '#232B22',
    /** Unselected chip / control fill. */
    control: '#151B14',
    /** Muted control fill used inside sheets. */
    controlAlt: '#171E16',

    ink: '#F1F5EE',
    inkSoft: '#D6DED2',
    muted: '#97A599',
    faint: '#63715F',
    dim: '#4E5A4C',

    border: 'rgba(241, 245, 238, 0.08)',
    borderSoft: 'rgba(241, 245, 238, 0.06)',
    borderStrong: 'rgba(241, 245, 238, 0.14)',
    divider: 'rgba(241, 245, 238, 0.06)',

    primary: palette.green,
    primaryBright: palette.greenBright,
    primarySoft: palette.greenSoft,
    onPrimary: '#F5FBF2',
    /** Translucent green wash behind selected states. */
    primaryFill: 'rgba(45, 138, 71, 0.18)',
    primaryFillSoft: 'rgba(45, 138, 71, 0.12)',

    /** Selected chip / card: filled panel plus a green rim. */
    selected: '#1A2419',
    selectedBorder: 'rgba(63, 166, 96, 0.45)',
    /** Focused input: darker panel, brighter rim, soft outer wash. */
    focus: '#121A12',
    focusBorder: 'rgba(63, 166, 96, 0.55)',
    focusRing: 'rgba(45, 138, 71, 0.10)',

    gold: palette.gold,
    goldBright: palette.goldBright,
    onGold: '#141005',
    goldFill: 'rgba(201, 162, 39, 0.14)',
    goldBorder: 'rgba(201, 162, 39, 0.30)',

    danger: palette.red,
    dangerFill: 'rgba(209, 67, 67, 0.12)',
    dangerBorder: 'rgba(209, 67, 67, 0.28)',

    warning: palette.amber,
    warningFill: 'rgba(217, 154, 43, 0.10)',
    warningBorder: 'rgba(217, 154, 43, 0.34)',
    warningInk: '#C3B48E',

    /** Admin premium / entitlement signal. */
    lime: palette.lime,
    limeFill: 'rgba(208, 232, 54, 0.14)',

    tabActive: palette.greenSoft,
    tabInactive: '#8A9E8E',
    /** Floating capsule behind the tab bar. */
    tabBarSurface: 'rgba(18, 23, 17, 0.92)',
    tabBarBorder: 'rgba(241, 245, 238, 0.10)',
    tabSelection: 'rgba(45, 138, 71, 0.20)',
    tabSelectionRim: 'rgba(255, 255, 255, 0.06)',

    /** Opaque overlay bars — reader header, sticky footers. */
    chrome: 'rgba(10, 14, 10, 0.94)',
    chromeBorder: 'rgba(241, 245, 238, 0.08)',
    /** Scrim painted behind sheets and modals. */
    scrim: 'rgba(4, 6, 5, 0.60)',

    /** Placeholder cover weave when a book has no artwork. */
    coverBase: '#1B3A24',
    coverStripe: '#15301D',

    // --- Legacy aliases (older screens still reference these) ---
    fill: 'rgba(45, 138, 71, 0.18)',
    highlight: palette.gold,
    onHighlight: '#141005',
    warm: palette.goldBright,
    secondary: palette.greenBright,
    accent: palette.greenSoft,
    glassTint: 'rgba(18, 23, 17, 0.55)',
    glassRim: 'rgba(255, 255, 255, 0.06)',
    glassEdge: 'rgba(241, 245, 238, 0.10)',
    glassShadow: '#000000',
    glassSelection: 'rgba(45, 138, 71, 0.20)',
    glassSelectionRim: 'rgba(255, 255, 255, 0.06)',
  },

  light: {
    background: '#F5F8F2',
    surface: '#FFFFFF',
    surfaceAlt: '#FAFCF7',
    surfaceRaised: '#F0F4EC',
    surfaceHigh: '#E7EEE2',
    control: '#EEF3EA',
    controlAlt: '#E9F0E5',

    ink: '#101A12',
    inkSoft: '#2C3D30',
    muted: '#4A634F',
    faint: '#6E856F',
    dim: '#8FA292',

    border: 'rgba(16, 26, 18, 0.10)',
    borderSoft: 'rgba(16, 26, 18, 0.07)',
    borderStrong: 'rgba(16, 26, 18, 0.16)',
    divider: 'rgba(16, 26, 18, 0.07)',

    primary: palette.green,
    primaryBright: '#247A3D',
    primarySoft: '#3D7A2E',
    onPrimary: '#FFFFFF',
    primaryFill: 'rgba(45, 138, 71, 0.14)',
    primaryFillSoft: 'rgba(45, 138, 71, 0.08)',

    selected: '#E4F0E4',
    selectedBorder: 'rgba(45, 138, 71, 0.45)',
    focus: '#FFFFFF',
    focusBorder: 'rgba(45, 138, 71, 0.55)',
    focusRing: 'rgba(45, 138, 71, 0.12)',

    gold: '#A4801A',
    goldBright: palette.gold,
    onGold: '#FFFFFF',
    goldFill: 'rgba(201, 162, 39, 0.16)',
    goldBorder: 'rgba(164, 128, 26, 0.34)',

    danger: '#C0392B',
    dangerFill: 'rgba(192, 57, 43, 0.10)',
    dangerBorder: 'rgba(192, 57, 43, 0.26)',

    warning: '#9A6A12',
    warningFill: 'rgba(217, 154, 43, 0.14)',
    warningBorder: 'rgba(154, 106, 18, 0.30)',
    warningInk: '#6B5417',

    lime: '#6F8C0F',
    limeFill: 'rgba(111, 140, 15, 0.14)',

    tabActive: palette.green,
    tabInactive: '#6E856F',
    tabBarSurface: 'rgba(255, 255, 255, 0.94)',
    tabBarBorder: 'rgba(16, 26, 18, 0.10)',
    tabSelection: 'rgba(45, 138, 71, 0.14)',
    tabSelectionRim: 'rgba(255, 255, 255, 0.70)',

    chrome: 'rgba(245, 248, 242, 0.96)',
    chromeBorder: 'rgba(16, 26, 18, 0.08)',
    scrim: 'rgba(16, 26, 18, 0.42)',

    coverBase: '#2D8A47',
    coverStripe: '#247A3D',

    // --- Legacy aliases ---
    fill: 'rgba(45, 138, 71, 0.12)',
    highlight: '#A4801A',
    onHighlight: '#FFFFFF',
    warm: palette.gold,
    secondary: '#247A3D',
    accent: '#3D7A2E',
    glassTint: 'rgba(248, 252, 245, 0.42)',
    glassRim: 'rgba(255, 255, 255, 0.90)',
    glassEdge: 'rgba(16, 26, 18, 0.10)',
    glassShadow: '#0B1F10',
    glassSelection: 'rgba(45, 138, 71, 0.16)',
    glassSelectionRim: 'rgba(255, 255, 255, 0.55)',
  },
} as const;

/**
 * Reader page tones. These are deliberately independent of the app theme —
 * a reader picks a page tone once and it holds in light and dark alike.
 */
export const readerTones = {
  paper: { background: '#E8E3D8', ink: '#30302B', muted: 'rgba(48, 48, 43, 0.55)' },
  sepia: { background: '#161512', ink: '#E8E3D8', muted: 'rgba(232, 227, 216, 0.45)' },
  midnight: { background: '#0B0E0C', ink: '#C8D2C4', muted: 'rgba(200, 210, 196, 0.42)' },
} as const;

export type ReaderTone = keyof typeof readerTones;

/** The stage behind a reader page, regardless of tone. */
export const readerStage = '#050706';

export const layout = {
  screenPadding: 20,
  /** Admin screens run denser than the reader app. */
  adminPadding: 18,
  sectionGap: 22,
  rowHeight: 52,
} as const;

/** Corner radii, named by the role they play rather than their value. */
export const radius = {
  chip: 12,
  control: 13,
  field: 15,
  button: 16,
  card: 18,
  cardLarge: 20,
  hero: 24,
  sheet: 26,
  pill: 999,
} as const;

/**
 * The tab bar is a floating capsule, so it overlays the scene instead of
 * consuming layout height. Screens reserve room for it through `useAppInsets`.
 */
export const tabBar = {
  height: 62,
  inset: 16,
  gap: 10,
  radius: 31,
} as const;

/** Admin uses a squarer, tool-like bar so it never feels like the reader app. */
export const adminTabBar = {
  height: 60,
  inset: 12,
  gap: 8,
  radius: 22,
} as const;

/** Cover swatches offered in the admin book editor. */
export const coverColors = {
  forest: { light: '#2D8A47', dark: '#3FA660' },
  emerald: { light: '#1F7A54', dark: '#2E9470' },
  lime: { light: '#5A9E2F', dark: '#72B842' },
  olive: { light: '#6B8E23', dark: '#84A832' },
  pine: { light: '#247A3D', dark: '#359655' },
  sage: { light: '#4A8C55', dark: '#62A66E' },
} as const;
