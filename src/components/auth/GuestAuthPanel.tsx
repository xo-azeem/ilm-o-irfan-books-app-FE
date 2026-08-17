import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AuthReturnTo, RootStackParamList } from '@/app/navigation/types';
import { EmptyState } from '@/components/layout';
import { Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';

type GuestAuthPanelProps = {
  title: string;
  message: string;
  returnTo?: AuthReturnTo;
};

export function GuestAuthPanel({ title, message, returnTo }: GuestAuthPanelProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View className="gap-4">
      <EmptyState title={title} message={message} />
      <Pressable
        onPress={() => navigation.navigate(ROUTES.LOGIN, returnTo ? { returnTo } : undefined)}
        accessibilityRole="button"
        className="h-[50px] items-center justify-center rounded-[14px] bg-app-primary active:opacity-90 dark:bg-app-primary-dark">
        <Text className="text-[16px] font-semibold text-app-on-primary dark:text-app-on-primary-dark">
          Sign in
        </Text>
      </Pressable>
      <Pressable
        onPress={() => navigation.navigate(ROUTES.SIGN_UP, returnTo ? { returnTo } : undefined)}
        accessibilityRole="button"
        className="h-[50px] items-center justify-center rounded-[14px] border border-app-border bg-app-surface active:opacity-80 dark:border-app-border-dark dark:bg-app-surface-dark">
        <Text className="text-[16px] font-semibold text-app-ink dark:text-app-ink-dark">
          Create account
        </Text>
      </Pressable>
    </View>
  );
}
