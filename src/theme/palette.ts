/** Balanced brand palette — vivid but refined, not neon. */
export const palette = {
  green: '#2D8A47',
  yellowGreen: '#9ACD32',
  chartreuse: '#9AE638',
  limelight: '#D0E836',
  sunflower: '#E5BE2B',
} as const;

export const theme = {
  light: {
    background: '#F5F8F2',
    surface: '#FFFFFF',
    surfaceRaised: '#FAFCF7',
    ink: '#142818',
    muted: '#4A634F',
    faint: '#7A917F',
    border: 'rgba(20, 40, 24, 0.10)',
    fill: 'rgba(45, 138, 71, 0.12)',
    primary: palette.green,
    secondary: palette.yellowGreen,
    accent: palette.chartreuse,
    highlight: palette.limelight,
    warm: palette.sunflower,
    onPrimary: '#FFFFFF',
    onHighlight: '#142818',
    tabActive: palette.green,
    tabInactive: '#5F7565',
    /** Opaque overlay bars, e.g. the reader header and footer. */
    chrome: 'rgba(255, 255, 255, 0.97)',
    chromeBorder: 'rgba(45, 138, 71, 0.10)',
    /** Tint painted over the native blur so the glass keeps the brand cast. */
    glassTint: 'rgba(248, 252, 245, 0.42)',
    /** Bright inner hairline that reads as a light-catching bevel. */
    glassRim: 'rgba(255, 255, 255, 0.90)',
    /** Outer edge of the glass, slightly darker than the surface behind it. */
    glassEdge: 'rgba(20, 40, 24, 0.10)',
    glassShadow: '#0B1F10',
    /** Capsule sitting behind the focused tab icon. */
    glassSelection: 'rgba(45, 138, 71, 0.16)',
    glassSelectionRim: 'rgba(255, 255, 255, 0.55)',
  },
  dark: {
    background: '#0E1410',
    surface: '#182018',
    surfaceRaised: '#1F2A22',
    ink: '#F0F6EC',
    muted: '#9AAD9E',
    faint: '#6B806F',
    border: 'rgba(240, 246, 236, 0.10)',
    fill: 'rgba(154, 205, 50, 0.14)',
    primary: palette.yellowGreen,
    secondary: palette.chartreuse,
    accent: palette.limelight,
    highlight: '#3A4528',
    warm: palette.sunflower,
    onPrimary: '#0E1410',
    onHighlight: '#F0F6EC',
    tabActive: palette.yellowGreen,
    tabInactive: '#8A9E8E',
    chrome: 'rgba(24, 32, 24, 0.97)',
    chromeBorder: 'rgba(154, 205, 50, 0.12)',
    glassTint: 'rgba(16, 24, 18, 0.38)',
    glassRim: 'rgba(255, 255, 255, 0.16)',
    glassEdge: 'rgba(0, 0, 0, 0.45)',
    glassShadow: '#000000',
    glassSelection: 'rgba(154, 205, 50, 0.20)',
    glassSelectionRim: 'rgba(255, 255, 255, 0.14)',
  },
} as const;

export const fonts = {
  sans: 'DMSans',
} as const;

/** Shared letter-spacing for a modern, airy type rhythm. */
export const typography = {
  tight: -0.4,
  snug: -0.2,
  normal: 0,
  wide: 0.4,
  wider: 0.8,
  label: 1.1,
} as const;

export const layout = {
  screenPadding: 20,
  sectionGap: 24,
  rowHeight: 52,
} as const;

/**
 * The tab bar is a floating glass capsule, so it overlays the scene instead of
 * consuming layout height. Screens reserve room for it through `useAppInsets`.
 */
export const tabBar = {
  height: 62,
  /** Distance from the screen edges to the capsule. */
  inset: 16,
  /** Breathing room between the capsule and the bottom safe area. */
  gap: 10,
  radius: 31,
} as const;

export const coverColors = {
  forest: { light: '#2D8A47', dark: '#3FA660' },
  emerald: { light: '#1F7A54', dark: '#2E9470' },
  lime: { light: '#5A9E2F', dark: '#72B842' },
  olive: { light: '#6B8E23', dark: '#84A832' },
  pine: { light: '#247A3D', dark: '#359655' },
  sage: { light: '#4A8C55', dark: '#62A66E' },
} as const;
