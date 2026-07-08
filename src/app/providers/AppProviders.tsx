import type { PropsWithChildren } from 'react';
import { Platform, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';

import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { ThemeStateProvider, useTheme } from '@/theme/ThemeContext';

function AppShell({ children }: PropsWithChildren) {
  const { isDark } = useTheme();

  return (
    <GestureHandlerRootView className="flex-1 bg-app-bg dark:bg-app-bg-dark">
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent={Platform.OS === 'android'}
        />
        {children}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <ThemeStateProvider>
        <AppShell>{children}</AppShell>
      </ThemeStateProvider>
    </ThemeProvider>
  );
}
