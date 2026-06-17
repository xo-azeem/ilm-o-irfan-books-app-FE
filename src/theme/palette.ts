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
    tabBar: 'rgba(255, 255, 255, 0.97)',
    tabBarBorder: 'rgba(45, 138, 71, 0.10)',
    tabActive: palette.green,
    tabInactive: '#7A917F',
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
    tabBar: 'rgba(24, 32, 24, 0.97)',
    tabBarBorder: 'rgba(154, 205, 50, 0.12)',
    tabActive: palette.yellowGreen,
    tabInactive: '#6B806F',
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
  tabBarHeight: 70,
} as const;

export const coverColors = {
  forest: { light: '#2D8A47', dark: '#3FA660' },
  emerald: { light: '#1F7A54', dark: '#2E9470' },
  lime: { light: '#5A9E2F', dark: '#72B842' },
  olive: { light: '#6B8E23', dark: '#84A832' },
  pine: { light: '#247A3D', dark: '#359655' },
  sage: { light: '#4A8C55', dark: '#62A66E' },
} as const;
