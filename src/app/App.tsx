import { StyleSheet, View } from 'react-native';

import { RootNavigator } from '@/app/navigation/RootNavigator';
import { AppProviders } from '@/app/providers/AppProviders';
import { useTheme } from '@/theme/ThemeContext';

function AppRoot() {
  const { colors } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <RootNavigator />
    </View>
  );
}

export function App() {
  return (
    <AppProviders>
      <AppRoot />
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
