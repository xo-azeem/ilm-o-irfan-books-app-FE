import { memo, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import { api } from '@/api';
import type { PlanRow } from '@/api/types';
import {
  getMonthlyPackage,
  hasPurchasesApiKey,
  openManageSubscriptions,
  purchaseMonthlyPackage,
  restorePurchases,
} from '@/billing/purchases';
import { Section } from '@/components/layout';
import { DisplayText, Text } from '@/components/ui';
import { palette } from '@/theme/palette';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { useEntitlementStore } from '@/stores/entitlementStore';

function formatMoney(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(0);
  return `${currency} ${amount}`;
}

async function waitForEntitlementUnlock(
  refresh: () => Promise<unknown>,
  attempts = 8,
): Promise<boolean> {
  for (let i = 0; i < attempts; i += 1) {
    await refresh();
    if (useEntitlementStore.getState().canAccessPremium) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 750));
  }
  return useEntitlementStore.getState().canAccessPremium;
}

export const SubscriptionScreen = memo(function SubscriptionScreen() {
  const status = useEntitlementStore(s => s.status);
  const canAccessPremium = useEntitlementStore(s => s.canAccessPremium);
  const refresh = useEntitlementStore(s => s.refresh);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [rcPackage, setRcPackage] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
        const list = await api.plansList();
        let pkg: PurchasesPackage | null = null;
        if (hasPurchasesApiKey()) {
          try {
            pkg = await getMonthlyPackage();
          } catch {
            pkg = null;
          }
        }
        if (!cancelled) {
          setPlans(Array.isArray(list) ? list : []);
          setRcPackage(pkg);
        }
      } catch {
        if (!cancelled) {
          setPlans([]);
          setRcPackage(null);
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

  const handleSubscribe = useCallback(async () => {
    if (!hasPurchasesApiKey()) {
      Alert.alert(
        'Billing not configured',
        'Add REVENUECAT_API_KEY_IOS / REVENUECAT_API_KEY_ANDROID to .env, then rebuild. Until store products exist, ask an admin for a promotional entitlement on staging.',
      );
      return;
    }
    setBusy(true);
    try {
      const result = await purchaseMonthlyPackage();
      if (result.cancelled) {
        return;
      }
      const unlocked = await waitForEntitlementUnlock(refresh);
      if (unlocked) {
        Alert.alert('Welcome to Premium', 'Your membership is active.');
      } else {
        Alert.alert(
          'Purchase received',
          'The store confirmed the purchase. Membership unlocks when the RevenueCat webhook reaches the server — pull to refresh in a moment.',
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not complete the purchase.';
      Alert.alert('Subscribe', message);
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const handleRestore = useCallback(async () => {
    if (!hasPurchasesApiKey()) {
      Alert.alert(
        'Billing not configured',
        'RevenueCat API keys are not set in this build.',
      );
      return;
    }
    setBusy(true);
    try {
      await restorePurchases();
      const unlocked = await waitForEntitlementUnlock(refresh);
      Alert.alert(
        'Restore',
        unlocked
          ? 'Purchases restored. Premium is unlocked.'
          : 'No active membership found for this store account yet.',
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not restore purchases.';
      Alert.alert('Restore', message);
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const handleManage = useCallback(async () => {
    try {
      await openManageSubscriptions();
    } catch {
      Alert.alert(
        'Manage billing',
        'Open App Store or Google Play subscription settings on this device to change or cancel.',
      );
    }
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

  const storePrice = rcPackage?.product.priceString;
  const primaryLabel = canAccessPremium
    ? 'Manage billing'
    : storePrice
      ? `Subscribe · ${storePrice}`
      : 'Subscribe';

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
                  {storePrice && plan.code === 'premium_monthly'
                    ? `${storePrice} (store price)`
                    : `${formatMoney(plan.price_cents, plan.currency)}${
                        plan.interval ? ` / ${plan.interval}` : ''
                      } (catalog)`}
                </Text>
              </View>
            ))}
          </Section>
        </View>
      ) : null}

      <View className="mt-7 gap-3">
        <Pressable
          disabled={busy}
          onPress={canAccessPremium ? handleManage : handleSubscribe}
          className="items-center rounded-[14px] bg-app-primary py-3.5 active:opacity-90 dark:bg-app-primary-dark">
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-[16px] font-semibold text-app-on-primary dark:text-app-on-primary-dark">
              {primaryLabel}
            </Text>
          )}
        </Pressable>
        {!canAccessPremium ? (
          <Pressable
            disabled={busy}
            onPress={handleRestore}
            className="items-center rounded-[14px] border border-app-border py-3.5 active:opacity-90 dark:border-app-border-dark">
            <Text className="text-[15px] font-semibold text-app-ink dark:text-app-ink-dark">
              Restore purchases
            </Text>
          </Pressable>
        ) : null}
        <Text className="text-center text-[12px] text-app-muted dark:text-app-muted-dark">
          {hasPurchasesApiKey()
            ? 'Payment opens the App Store or Google Play sheet. Access unlocks after the server confirms the purchase.'
            : 'Store keys are not in this build yet — Subscribe will explain what is missing.'}
        </Text>
      </View>
    </ProfileSubScreenLayout>
  );
});
