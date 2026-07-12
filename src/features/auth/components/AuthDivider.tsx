import { View } from 'react-native';

import { Text } from '@/components/ui';

export function AuthDivider() {
  return (
    <View className="flex-row items-center gap-4 py-1">
      <View className="h-px flex-1 bg-app-border dark:bg-app-border-dark" />
      <Text className="text-[13px] font-medium uppercase tracking-widest text-app-faint dark:text-app-faint-dark">
        or
      </Text>
      <View className="h-px flex-1 bg-app-border dark:bg-app-border-dark" />
    </View>
  );
}
