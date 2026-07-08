import { useColorScheme } from 'react-native';

import { useThemeStore } from '@/stores/themeStore';

export function useAppTheme() {
  const colorScheme = useColorScheme();
  const themePreference = useThemeStore(state => state.themePreference);

  return {
    themePreference,
    colorScheme: colorScheme ?? 'light',
    isDark: colorScheme === 'dark',
  };
}
