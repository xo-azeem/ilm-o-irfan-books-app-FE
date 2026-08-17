import { Alert, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';

import { Screen, ScreenHeader } from '@/components/layout';
import { Text } from '@/components/ui';
import { AdminBackLink, AdminPrimaryButton } from '@/features/admin/components/AdminUi';
import type { AdminPeopleStackParamList } from '@/features/admin/navigation/types';
import { useAdminUser, useSetUserRole } from '@/hooks/useAdmin';
import { isEntitlementActive } from '@/services/mappers';
import { useAuthStore } from '@/stores/authStore';

export function AdminUserDetailScreen() {
  const route = useRoute<RouteProp<AdminPeopleStackParamList, 'AdminUserDetail'>>();
  const currentUserId = useAuthStore(state => state.userId);
  const { data: user } = useAdminUser(route.params.userId);
  const setRole = useSetUserRole();

  const subscribed = isEntitlementActive(user?.entitlement_status, user?.expires_at);

  const changeRole = (role: 'user' | 'admin') => {
    if (!user) return;
    Alert.alert(
      role === 'admin' ? 'Promote to admin' : 'Remove admin access',
      role === 'admin'
        ? 'This user will open the admin panel on next sign-in.'
        : 'They will lose CMS access after their session refreshes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            setRole.mutate(
              { userId: user.id, role },
              {
                onError: error =>
                  Alert.alert(
                    'Could not change role',
                    error instanceof Error ? error.message : 'Try again.',
                  ),
              },
            );
          },
        },
      ],
    );
  };

  if (!user) {
    return (
      <Screen>
        <AdminBackLink />
        <Text>User not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <AdminBackLink />
      <ScreenHeader title={user.full_name || 'User'} subtitle={user.email ?? user.id} />

      <View className="mb-6 gap-2 rounded-[16px] bg-app-surface p-4 dark:bg-app-surface-dark">
        <Text className="text-[15px] text-app-ink dark:text-app-ink-dark">Role: {user.role}</Text>
        <Text className="text-[15px] text-app-ink dark:text-app-ink-dark">
          Subscription: {subscribed ? user.plan_name || 'Active' : 'None'}
        </Text>
        <Text className="text-[13px] text-app-muted dark:text-app-muted-dark">
          Joined {new Date(user.created_at).toLocaleDateString()}
        </Text>
      </View>

      {user.id === currentUserId ? (
        <Text className="text-[14px] text-app-muted dark:text-app-muted-dark">
          You cannot change your own role here.
        </Text>
      ) : user.role === 'admin' ? (
        <AdminPrimaryButton
          label={setRole.isPending ? 'Updating…' : 'Demote to user'}
          disabled={setRole.isPending}
          destructive
          onPress={() => changeRole('user')}
        />
      ) : (
        <AdminPrimaryButton
          label={setRole.isPending ? 'Updating…' : 'Promote to admin'}
          disabled={setRole.isPending}
          onPress={() => changeRole('admin')}
        />
      )}
    </Screen>
  );
}
