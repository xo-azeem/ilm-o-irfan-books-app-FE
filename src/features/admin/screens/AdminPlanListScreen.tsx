import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, Plus } from 'lucide-react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { ListRowsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { Card, Display, FloatingAction, Icon, Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import { errorMessage } from '@/features/admin/components/AdminToast';
import {
  AdminBackLink,
  AdminBadge,
  AdminEmpty,
  AdminErrorState,
} from '@/features/admin/components/AdminUi';
import { formatMoney } from '@/features/admin/utils/format';
import { useAppInsets } from '@/hooks/useAppInsets';
import { useAdminPlans } from '@/hooks/useAdmin';
import type { AdminPlan } from '@/services/admin';
import { layout, radius } from '@/theme/palette';

import type { AdminSystemStackParamList } from '../navigation/types';

const VISIBLE_FEATURES = 4;

export function AdminPlanListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminSystemStackParamList>>();
  const { tabBarHeight } = useAppInsets();
  const { data = [], isLoading, error, refetch } = useAdminPlans();

  const newPlan = useCallback(
    () => navigation.navigate(ADMIN_ROUTES.PLAN_EDITOR, {}),
    [navigation],
  );

  const openPlan = useCallback(
    (planId: string) => navigation.navigate(ADMIN_ROUTES.PLAN_EDITOR, { planId }),
    [navigation],
  );

  return (
    <Screen
      padding={layout.adminPadding}
      gap={14}
      overlay={
        <FloatingAction
          label="New plan"
          icon={Plus}
          onPress={newPlan}
          style={[styles.fab, { bottom: tabBarHeight + 14 }]}
        />
      }>
      <AdminBackLink label="System" />
      <ScreenHeader title="Plans" dense subtitle="Subscription tiers offered in the app." />

      {isLoading ? (
        <ListRowsSkeleton count={3} height={140} />
      ) : error ? (
        <AdminErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <AdminEmpty
          title="No plans yet"
          message="Define at least one plan so store entitlements map to something readers recognise."
          actionLabel="Add plan"
          onAction={newPlan}
        />
      ) : (
        <View style={styles.list}>
          {data.map(plan => (
            <PlanCard key={plan.id} plan={plan} onPress={openPlan} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const PlanCard = memo(function PlanCard({
  plan,
  onPress,
}: {
  plan: AdminPlan;
  onPress: (planId: string) => void;
}) {
  const handlePress = useCallback(() => onPress(plan.id), [onPress, plan.id]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={plan.name}
      onPress={handlePress}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
      <Card tone="surface" rounded={radius.button} padded={16} gap={12}>
        <View style={styles.header}>
          <View style={styles.headerBody}>
            <Display size={18} numberOfLines={1}>
              {plan.name}
            </Display>
            <Text size={11.5} leading={1.2} tone="faint" numberOfLines={1}>
              {`${plan.code} · ${plan.revenuecat_product_id ?? 'no store id'}`}
            </Text>
          </View>
          <AdminBadge
            label={plan.is_active ? 'Active' : 'Hidden'}
            tone={plan.is_active ? 'success' : 'neutral'}
          />
        </View>

        <View style={styles.price}>
          <Display size={26}>{formatMoney(plan.price_cents, plan.currency)}</Display>
          <Text size={13} leading={1.2} tone="muted">
            {`/ ${plan.interval}`}
          </Text>
        </View>

        {plan.features.length ? (
          <View style={styles.features}>
            {plan.features.slice(0, VISIBLE_FEATURES).map(feature => (
              <View key={feature} style={styles.feature}>
                <Icon icon={Check} size={12} tone="primary" strokeWidth={2.6} />
                <Text size={13} leading={1.3} tone="muted" numberOfLines={1} style={styles.grow}>
                  {feature}
                </Text>
              </View>
            ))}
            {plan.features.length > VISIBLE_FEATURES ? (
              <Text size={11.5} leading={1.2} tone="faint">
                {`+${plan.features.length - VISIBLE_FEATURES} more`}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text size={11.5} leading={1.4} tone="warning">
            No features listed — the paywall will look empty.
          </Text>
        )}
      </Card>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerBody: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  price: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  features: {
    gap: 7,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  grow: {
    flex: 1,
  },
  pressed: {
    opacity: 0.8,
  },
  fab: {
    position: 'absolute',
    right: layout.adminPadding,
  },
});
