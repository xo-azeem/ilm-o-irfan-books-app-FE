import { useColorScheme } from 'react-native';

export function useAppTheme() {
  const colorScheme = useColorScheme();

  return {
    colorScheme: colorScheme ?? 'light',
    isDark: colorScheme === 'dark',
  };
}
