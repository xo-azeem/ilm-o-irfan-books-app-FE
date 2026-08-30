import type { PropsWithChildren } from 'react';
import { Platform, StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';

import { AuthSessionProvider } from '@/app/providers/AuthSessionProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { queryClient } from '@/lib/queryClient';
import { ThemeStateProvider, useTheme } from '@/theme/ThemeContext';

function AppShell({ children }: PropsWithChildren) {
  const { colors, isDark } = useTheme();

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.background }]}>
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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemeStateProvider>
          <AuthSessionProvider>
            <AppShell>{children}</AppShell>
          </AuthSessionProvider>
        </ThemeStateProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
