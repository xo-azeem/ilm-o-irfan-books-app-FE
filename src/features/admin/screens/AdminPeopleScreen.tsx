import { useMemo, useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ListRow, Screen, ScreenHeader } from '@/components/layout';
import { Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import type { AdminPeopleStackParamList } from '@/features/admin/navigation/types';
import { useAdminUsers } from '@/hooks/useAdmin';
import { isEntitlementActive } from '@/services/mappers';
import { useTheme } from '@/theme/ThemeContext';

export function AdminPeopleScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminPeopleStackParamList>>();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const { data = [], isLoading } = useAdminUsers(query);

  const rows = useMemo(() => data, [data]);

  return (
    <Screen>
      <ScreenHeader title="People" subtitle="Roles and subscription status." />

      <View className="mb-4 rounded-[12px] border border-app-border bg-app-surface px-4 dark:border-app-border-dark dark:bg-app-surface-dark">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name or email"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          className="h-[48px] text-[16px] text-app-ink dark:text-app-ink-dark"
        />
      </View>

      {isLoading ? (
        <ActivityIndicator className="py-10" />
      ) : rows.length === 0 ? (
        <Text className="text-[15px] text-app-muted dark:text-app-muted-dark">No users found.</Text>
      ) : (
        <View className="overflow-hidden rounded-[14px] bg-app-surface dark:bg-app-surface-dark">
          {rows.map((user, index) => {
            const subscribed = isEntitlementActive(user.entitlement_status, user.expires_at);
            return (
              <ListRow
                key={user.id}
                title={user.full_name || user.email || 'Unnamed'}
                subtitle={`${user.email ?? 'No email'} · ${user.role}${subscribed ? ' · Subscriber' : ''}`}
                isLast={index === rows.length - 1}
                onPress={() =>
                  navigation.navigate(ADMIN_ROUTES.USER_DETAIL, { userId: user.id })
                }
              />
            );
          })}
        </View>
      )}
    </Screen>
  );
}
