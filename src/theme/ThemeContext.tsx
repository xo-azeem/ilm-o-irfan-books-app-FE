import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from 'react';
import { useColorScheme } from 'react-native';

import { theme } from '@/theme/palette';

export type AppColors = (typeof theme)['light'] | (typeof theme)['dark'];

type ThemeContextValue = {
  isDark: boolean;
  colorScheme: 'light' | 'dark';
  colors: AppColors;
};

const defaultValue: ThemeContextValue = {
  isDark: false,
  colorScheme: 'light',
  colors: theme.light,
};

const ThemeContext = createContext<ThemeContextValue>(defaultValue);

/**
 * Subscribes to the device/app color scheme exactly ONCE and shares the
 * resolved `isDark` + `colors` with the whole tree via context. This replaces
 * dozens of independent `useColorScheme()` subscriptions across the app, so a
 * light/dark switch is a single context propagation instead of many separate
 * re-render triggers.
 */
export function ThemeStateProvider({ children }: PropsWithChildren) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const value = useMemo<ThemeContextValue>(
    () => ({
      isDark,
      colorScheme: isDark ? 'dark' : 'light',
      colors: isDark ? theme.dark : theme.light,
    }),
    [isDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
