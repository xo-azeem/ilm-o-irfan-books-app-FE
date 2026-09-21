import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { usePreventScreenCapture } from 'expo-screen-capture';

import { AppErrorBoundary } from '@/app/AppErrorBoundary';
import { RootNavigator } from '@/app/navigation/RootNavigator';
import { AppProviders } from '@/app/providers/AppProviders';
import { bootVault } from '@/services/bookVault';
import { useTheme } from '@/theme/ThemeContext';

function AppRoot() {
  const { colors } = useTheme();

  // No screenshots or screen recording anywhere in the app. Android's window
  // flag is also set natively in MainActivity so it holds from the first
  // frame; this covers iOS, where the only way is to blank captured frames.
  usePreventScreenCapture('ilm-o-irfan');

  // Housekeeping for downloaded books — sweeping plaintext a killed session
  // left in the cache, sealing anything the pre-vault app stored in the
  // clear. Off the render path, and before any book can be opened.
  useEffect(() => {
    void bootVault();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <RootNavigator />
    </View>
  );
}

export function App() {
  return (
    <AppProviders>
      <AppErrorBoundary>
        <AppRoot />
      </AppErrorBoundary>
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
