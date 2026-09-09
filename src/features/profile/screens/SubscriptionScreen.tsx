import { memo, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { api } from '@/api';
import type { PlanRow } from '@/api/types';
import { Section } from '@/components/layout';
import { DisplayText, Text } from '@/components/ui';
import { palette } from '@/theme/palette';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { useEntitlementStore } from '@/stores/entitlementStore';

function formatMoney(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(0);
  return `${currency} ${amount}`;
}

export const SubscriptionScreen = memo(function SubscriptionScreen() {
  const status = useEntitlementStore(s => s.status);
  const canAccessPremium = useEntitlementStore(s => s.canAccessPremium);
  const refresh = useEntitlementStore(s => s.refresh);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
        const list = await api.plansList();
        if (!cancelled) {
          setPlans(Array.isArray(list) ? list : []);
        }
      } catch {
        if (!cancelled) {
          setPlans([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const handleManage = useCallback(() => {
    Alert.alert(
      'Coming soon',
      'In-app purchases via RevenueCat will be available once store products are configured. Until then, ask an admin for a promotional entitlement on staging.',
    );
  }, []);

  if (loading) {
    return (
      <ProfileSubScreenLayout title="Subscription" subtitle="Your plan and benefits.">
        <View className="items-center py-16">
          <ActivityIndicator color={palette.green} />
        </View>
      </ProfileSubScreenLayout>
    );
  }

  const planName =
    (status?.entitlement as { plan?: { name?: string } } | null)?.plan?.name ??
    (canAccessPremium ? 'Premium' : 'No active plan');
  const badge = canAccessPremium
    ? status?.isAdmin
      ? 'Admin'
      : status?.reason ?? 'Active'
    : status?.reason ?? 'Inactive';
  const renews =
    status?.expiresAt != null
      ? `Access through ${new Date(status.expiresAt).toLocaleDateString()}`
      : canAccessPremium
        ? 'No end date'
        : 'Subscribe to unlock the full catalog';

  const features = [
    'Full catalog access',
    'Offline downloads',
    'Reading progress sync',
    'Wishlist and highlights',
  ];

  return (
    <ProfileSubScreenLayout
      title="Subscription"
      subtitle="Your current plan and benefits.">
      <View className="mb-7 overflow-hidden rounded-[20px] bg-app-surface p-5 dark:bg-app-surface-dark">
        <View className="mb-1 flex-row items-center justify-between">
          <DisplayText className="text-[22px] font-bold text-app-ink dark:text-app-ink-dark">
            {planName}
          </DisplayText>
          <View className="rounded-full bg-app-fill px-3 py-1 dark:bg-app-fill-dark">
            <Text className="text-[11px] font-semibold uppercase tracking-wide text-app-primary dark:text-app-primary-dark">
              {badge}
            </Text>
          </View>
        </View>
        <Text className="mt-1 text-[13px] text-app-muted dark:text-app-muted-dark">
          {renews}
        </Text>
        {status?.secondsRemaining != null ? (
          <Text className="mt-1 text-[13px] text-app-muted dark:text-app-muted-dark">
            ~{Math.ceil(status.secondsRemaining / 86400)} days remaining
          </Text>
        ) : null}
      </View>

      <Section title="Included">
        {features.map((feature, index) => (
          <View
            key={feature}
            className={`flex-row items-center gap-3 px-4 py-3.5 ${
              index < features.length - 1
                ? 'border-b border-app-border dark:border-app-border-dark'
                : ''
            }`}>
            <Check size={16} color={palette.green} strokeWidth={2.5} />
            <Text className="flex-1 text-[15px] text-app-ink dark:text-app-ink-dark">
              {feature}
            </Text>
          </View>
        ))}
      </Section>

      {plans.length > 0 ? (
        <View className="mt-7">
          <Section title="Plans">
            {plans.map((plan, index) => (
              <View
                key={plan.id}
                className={`px-4 py-3.5 ${
                  index < plans.length - 1
                    ? 'border-b border-app-border dark:border-app-border-dark'
                    : ''
                }`}>
                <Text className="text-[15px] font-semibold text-app-ink dark:text-app-ink-dark">
                  {plan.name}
                </Text>
                <Text className="mt-0.5 text-[13px] text-app-muted dark:text-app-muted-dark">
                  {formatMoney(plan.price_cents, plan.currency)}
                  {plan.interval ? ` / ${plan.interval}` : ''}
                </Text>
              </View>
            ))}
          </Section>
        </View>
      ) : null}

      <View className="mt-7 gap-3">
        <Pressable
          onPress={handleManage}
          className="items-center rounded-[14px] bg-app-primary py-3.5 active:opacity-90 dark:bg-app-primary-dark">
          <Text className="text-[16px] font-semibold text-app-on-primary dark:text-app-on-primary-dark">
            {canAccessPremium ? 'Manage billing' : 'Subscribe'}
          </Text>
        </Pressable>
        <Text className="text-center text-[12px] text-app-muted dark:text-app-muted-dark">
          Store purchases (RevenueCat) are not wired in this build.
        </Text>
      </View>
    </ProfileSubScreenLayout>
  );
});
