import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from 'react';
import { useColorScheme } from 'react-native';

import { useThemeStore } from '@/stores/themeStore';
import { theme } from '@/theme/palette';
import { fontScaleMultiplier, scaleFont, type FontScale } from '@/theme/typography';

export type AppColors = (typeof theme)['light'] | (typeof theme)['dark'];

type ThemeContextValue = {
  isDark: boolean;
  colorScheme: 'light' | 'dark';
  colors: AppColors;
  /** The step the reader picked in Appearance. */
  fontScaleKey: FontScale;
  /** That step as a multiplier, ready to apply to any size on the ramp. */
  fontScale: number;
  /** `scaleFont` with the multiplier already bound. */
  scale: (size: number) => number;
};

const defaultValue: ThemeContextValue = {
  isDark: false,
  colorScheme: 'light',
  colors: theme.light,
  fontScaleKey: 'default',
  fontScale: 1,
  scale: size => size,
};

const ThemeContext = createContext<ThemeContextValue>(defaultValue);

/**
 * Subscribes to the device/app color scheme exactly ONCE and shares the
 * resolved `isDark` + `colors` with the whole tree via context. This replaces
 * dozens of independent `useColorScheme()` subscriptions across the app, so a
 * light/dark switch is a single context propagation instead of many separate
 * re-render triggers.
 *
 * The reader's text size rides along for the same reason: every glyph in the
 * app already reads this context for its colour, so carrying the multiplier
 * here costs nothing and keeps size and palette changing in one pass.
 */
export function ThemeStateProvider({ children }: PropsWithChildren) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const fontScaleKey = useThemeStore(state => state.fontScale);

  const value = useMemo<ThemeContextValue>(() => {
    const fontScale = fontScaleMultiplier(fontScaleKey);
    return {
      isDark,
      colorScheme: isDark ? 'dark' : 'light',
      colors: isDark ? theme.dark : theme.light,
      fontScaleKey,
      fontScale,
      scale: size => scaleFont(size, fontScale),
    };
  }, [fontScaleKey, isDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * The text-size multiplier alone, for components that size a container rather
 * than a glyph — a button's height, a fixed-height control.
 */
export function useFontScale() {
  return useContext(ThemeContext).fontScale;
}
