export const ios = {
  light: {
    background: '#F2F2F7',
    surface: '#FFFFFF',
    grouped: '#FFFFFF',
    label: '#000000',
    secondaryLabel: '#8E8E93',
    tertiaryLabel: '#C7C7CC',
    separator: 'rgba(60, 60, 67, 0.12)',
    fill: 'rgba(120, 120, 128, 0.12)',
    accent: '#007AFF',
    tabBar: 'rgba(255, 255, 255, 0.94)',
    tabBarBorder: 'rgba(0, 0, 0, 0.12)',
  },
  dark: {
    background: '#000000',
    surface: '#1C1C1E',
    grouped: '#1C1C1E',
    label: '#FFFFFF',
    secondaryLabel: '#8E8E93',
    tertiaryLabel: '#48484A',
    separator: 'rgba(84, 84, 88, 0.65)',
    fill: 'rgba(120, 120, 128, 0.24)',
    accent: '#0A84FF',
    tabBar: 'rgba(28, 28, 30, 0.94)',
    tabBarBorder: 'rgba(255, 255, 255, 0.12)',
  },
} as const;

export const layout = {
  screenPadding: 20,
  sectionGap: 24,
  rowHeight: 52,
  tabBarHeight: 49,
} as const;
