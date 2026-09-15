import type { PropsWithChildren } from 'react';
import { Platform, StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';

import { AccessProvider } from '@/app/providers/AccessProvider';
import { AuthLinkProvider } from '@/app/providers/AuthLinkProvider';
import { AuthSessionProvider } from '@/app/providers/AuthSessionProvider';
import { PushProvider } from '@/app/providers/PushProvider';
import { ReadingSyncProvider } from '@/app/providers/ReadingSyncProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { VaultSyncProvider } from '@/app/providers/VaultSyncProvider';
import { DialogLayer } from '@/components/ui/Dialog';
import { PushBannerLayer } from '@/components/ui/PushBanner';
import { queryClient } from '@/lib/queryClient';
import { ThemeStateProvider, useTheme } from '@/theme/ThemeContext';

function AppShell({ children }: PropsWithChildren) {
  const { colors, isDark } = useTheme();

  return (
    <GestureHandlerRootView
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent={Platform.OS === 'android'}
        />
        {children}
        {/* A push that arrives while the app is open, drawn in-app. */}
        <PushBannerLayer />
        {/* Popups draw above the navigator; sheets carry their own layer. */}
        <DialogLayer root />
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
            <AuthLinkProvider>
              <AccessProvider>
                <ReadingSyncProvider>
                  <VaultSyncProvider>
                    <PushProvider>
                      <AppShell>{children}</AppShell>
                    </PushProvider>
                  </VaultSyncProvider>
                </ReadingSyncProvider>
              </AccessProvider>
            </AuthLinkProvider>
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
