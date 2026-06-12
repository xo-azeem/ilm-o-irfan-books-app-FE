import { View } from 'react-native';

import { RootNavigator } from '@/app/navigation/RootNavigator';
import { AppProviders } from '@/app/providers/AppProviders';

export function App() {
  return (
    <AppProviders>
      <View className="flex-1">
        <RootNavigator />
      </View>
    </AppProviders>
  );
}
