import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';

export function AuthDivider() {
  return (
    <View style={styles.row}>
      <View className="h-px flex-1 bg-app-border dark:bg-app-border-dark" />
      <Text className="text-[13px] text-app-faint dark:text-app-faint-dark">
        or
      </Text>
      <View className="h-px flex-1 bg-app-border dark:bg-app-border-dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
});
