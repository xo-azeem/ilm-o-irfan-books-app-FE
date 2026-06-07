import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ios, layout } from '@/theme/ios';

export function useTabBarOptions() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const palette = isDark ? ios.dark : ios.light;

  return {
    headerShown: false,
    tabBarActiveTintColor: palette.accent,
    tabBarInactiveTintColor: palette.secondaryLabel,
    tabBarLabelStyle: {
      fontSize: 10,
      fontWeight: '500' as const,
      marginTop: 2,
    },
    tabBarIconStyle: {
      marginTop: 2,
    },
    tabBarStyle: {
      position: 'absolute' as const,
      left: 0,
      right: 0,
      bottom: 0,
      height: layout.tabBarHeight + insets.bottom,
      paddingBottom: insets.bottom,
      paddingTop: 6,
      backgroundColor: palette.tabBar,
      borderTopWidth: 0.5,
      borderTopColor: palette.tabBarBorder,
      elevation: 0,
    },
  };
}
