import { ActivityIndicator, View } from 'react-native';

import { Text } from '@/components/ui';

export function AuthSplash() {
  return (
    <View className="flex-1 items-center justify-center bg-app-bg dark:bg-app-bg-dark">
      <ActivityIndicator />
      <Text className="mt-3 text-[15px] text-app-muted dark:text-app-muted-dark">
        Loading library…
      </Text>
    </View>
  );
}
