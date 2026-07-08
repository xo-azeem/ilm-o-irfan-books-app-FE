import { useThemeStore } from '@/stores/themeStore';
import { useTheme } from '@/theme/ThemeContext';

export function useAppTheme() {
  const themePreference = useThemeStore(state => state.themePreference);
  const { colorScheme, isDark, colors } = useTheme();

  return {
    themePreference,
    colorScheme,
    isDark,
    colors,
  };
}
