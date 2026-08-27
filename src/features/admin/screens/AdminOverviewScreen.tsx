import { Alert, Pressable, Switch, View } from 'react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { AdminStatsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { DisplayText, Text } from '@/components/ui';
import { usePdfAccessPolicy, useUpdatePdfAccessPolicy } from '@/hooks/useAccount';
import { useAdminStats } from '@/hooks/useAdmin';
import type { AdminDashboardStats } from '@/services/admin';
import { useAuthStore } from '@/stores/authStore';
import { palette } from '@/theme/palette';

const CARDS: Array<{ key: keyof AdminDashboardStats; label: string }> = [
  { key: 'user_count', label: 'Users' },
  { key: 'subscriber_count', label: 'Subscribers' },
  { key: 'guest_signed_in_count', label: 'Signed-in guests' },
  { key: 'admin_count', label: 'Admins' },
  { key: 'book_published_count', label: 'Published books' },
  { key: 'book_draft_count', label: 'Drafts' },
  { key: 'author_count', label: 'Authors' },
  { key: 'download_completed_count', label: 'Downloads' },
];

export function AdminOverviewScreen() {
  const email = useAuthStore(state => state.email);
  const signOut = useAuthStore(state => state.signOut);
  const { data, isLoading, error, refetch } = useAdminStats();
  const policy = usePdfAccessPolicy();
  const updatePolicy = useUpdatePdfAccessPolicy();
  const freePdfAccess = Boolean(policy.data?.allowPdfWithoutEntitlement);

  return (
    <Screen>
      <ScreenHeader
        title="Overview"
        subtitle="Catalog, readers, and subscriptions."
        action={
          <Pressable
            onPress={() => {
              Alert.alert('Sign out', 'Leave the admin panel?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign out',
                  style: 'destructive',
                  onPress: () => {
                    void signOut();
                  },
                },
              ]);
            }}
            hitSlop={8}
            className="active:opacity-70">
            <Text className="text-[14px] font-semibold text-app-primary dark:text-app-primary-dark">
              Sign out
            </Text>
          </Pressable>
        }
      />

      <Text className="mb-5 text-[14px] text-app-muted dark:text-app-muted-dark">
        Signed in as {email || 'admin'}
      </Text>

      <View className="mb-5 flex-row items-center gap-3 rounded-[16px] bg-app-surface p-4 dark:bg-app-surface-dark">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-[16px] font-semibold text-app-ink dark:text-app-ink-dark">
            Free PDF access
          </Text>
          <Text className="text-[13px] leading-[18px] text-app-muted dark:text-app-muted-dark">
            When on, signed-in users can open books without a subscription. Admins
            always can. Turn this off before a public release.
          </Text>
        </View>
        <Switch
          value={freePdfAccess}
          disabled={policy.isLoading || updatePolicy.isPending}
          onValueChange={value => {
            updatePolicy.mutate(value, {
              onError: () => {
                Alert.alert('Could not update', 'Free PDF access was not saved.');
              },
            });
          }}
          trackColor={{ false: '#D8E0D9', true: palette.green }}
          thumbColor="#FFFFFF"
        />
      </View>

      {isLoading ? (
        <AdminStatsSkeleton />
      ) : error ? (
        <Pressable onPress={() => refetch()} className="rounded-[16px] bg-app-surface p-5 dark:bg-app-surface-dark">
          <Text className="text-[15px] text-app-muted dark:text-app-muted-dark">
            Could not load stats. Tap to retry.
          </Text>
        </Pressable>
      ) : (
        <View className="flex-row flex-wrap gap-3">
          {CARDS.map(card => (
            <View
              key={card.key}
              className="min-w-[46%] flex-1 rounded-[16px] bg-app-surface p-4 dark:bg-app-surface-dark">
              <Text className="text-[12px] font-medium uppercase tracking-widest text-app-faint dark:text-app-faint-dark">
                {card.label}
              </Text>
              <DisplayText className="mt-2 text-[28px] font-bold text-app-ink dark:text-app-ink-dark">
                {data?.[card.key] ?? 0}
              </DisplayText>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
