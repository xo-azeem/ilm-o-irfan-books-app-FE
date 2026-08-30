import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus } from 'lucide-react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { ListRowsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { DisplayText, Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import { errorMessage } from '@/features/admin/components/AdminToast';
import {
  AdminBackLink,
  AdminBadge,
  AdminEmpty,
  AdminErrorState,
} from '@/features/admin/components/AdminUi';
import { formatMoney } from '@/features/admin/utils/format';
import { useAdminPlans } from '@/hooks/useAdmin';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminSystemStackParamList } from '../navigation/types';

export function AdminPlanListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminSystemStackParamList>>();
  const { colors } = useTheme();
  const { data = [], isLoading, error, refetch } = useAdminPlans();

  return (
    <Screen>
      <AdminBackLink label="System" />
      <ScreenHeader
        title="Plans"
        subtitle="Subscription tiers offered in the app."
        action={
          <Pressable
            onPress={() => navigation.navigate(ADMIN_ROUTES.PLAN_EDITOR, {})}
            className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: colors.primary }}>
            <Plus size={19} color={colors.onPrimary} strokeWidth={2.4} />
          </Pressable>
        }
      />

      {isLoading ? (
        <ListRowsSkeleton rows={3} />
      ) : error ? (
        <AdminErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <AdminEmpty
          title="No plans"
          message="Define at least one plan so RevenueCat entitlements map to something readers recognise."
          actionLabel="Add plan"
          onAction={() => navigation.navigate(ADMIN_ROUTES.PLAN_EDITOR, {})}
        />
      ) : (
        <View className="gap-3">
          {data.map(plan => (
            <Pressable
              key={plan.id}
              onPress={() => navigation.navigate(ADMIN_ROUTES.PLAN_EDITOR, { planId: plan.id })}
              className="gap-3 rounded-[16px] bg-app-surface p-4 active:opacity-70 dark:bg-app-surface-dark">
              <View className="flex-row items-start justify-between gap-3">
                <View className="min-w-0 flex-1 gap-1">
                  <DisplayText
                    className="text-[18px] font-semibold text-app-ink dark:text-app-ink-dark"
                    numberOfLines={1}>
                    {plan.name}
                  </DisplayText>
                  <Text className="text-[12px] text-app-muted dark:text-app-muted-dark">
                    {plan.code} · {plan.revenuecat_product_id ?? 'no RevenueCat id'}
                  </Text>
                </View>
                <AdminBadge
                  label={plan.is_active ? 'Active' : 'Hidden'}
                  tone={plan.is_active ? 'success' : 'neutral'}
                />
              </View>

              <View className="flex-row items-baseline gap-1.5">
                <DisplayText className="text-[24px] font-bold text-app-ink dark:text-app-ink-dark">
                  {formatMoney(plan.price_cents, plan.currency)}
                </DisplayText>
                <Text className="text-[13px] text-app-muted dark:text-app-muted-dark">
                  / {plan.interval}
                </Text>
              </View>

              {plan.features.length ? (
                <View className="gap-1">
                  {plan.features.slice(0, 4).map(feature => (
                    <Text
                      key={feature}
                      className="text-[13px] text-app-muted dark:text-app-muted-dark"
                      numberOfLines={1}>
                      • {feature}
                    </Text>
                  ))}
                  {plan.features.length > 4 ? (
                    <Text className="text-[12px] text-app-faint dark:text-app-faint-dark">
                      +{plan.features.length - 4} more
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Text className="text-[12px] text-app-faint dark:text-app-faint-dark">
                  No features listed — the paywall will look empty.
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
