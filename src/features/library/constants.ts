import { Platform, type PressableAndroidRippleConfig } from 'react-native';

import { theme } from '@/theme/palette';

export const LIBRARY_COVER_WIDTH = 76;

export function getLibraryPressHighlight(isDark: boolean) {
  return isDark ? theme.dark.fill : theme.light.fill;
}

export function getLibraryRipple(isDark: boolean): PressableAndroidRippleConfig | undefined {
  if (Platform.OS !== 'android') {
    return undefined;
  }

  return {
    color: isDark ? 'rgba(154, 205, 50, 0.14)' : 'rgba(45, 138, 71, 0.10)',
    borderless: false,
  };
}

export function getLibraryCardShadow(isDark: boolean) {
  const ink = isDark ? theme.dark.ink : theme.light.ink;

  return Platform.select({
    ios: {
      shadowColor: ink,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.22 : 0.06,
      shadowRadius: 20,
    },
    android: { elevation: isDark ? 3 : 1 },
    default: {},
  });
}

export function getBookSpineShadow(isDark: boolean) {
  const ink = isDark ? theme.dark.ink : theme.light.ink;

  return Platform.select({
    ios: {
      shadowColor: ink,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.28 : 0.1,
      shadowRadius: 8,
    },
    android: { elevation: isDark ? 4 : 2 },
    default: {},
  });
}
