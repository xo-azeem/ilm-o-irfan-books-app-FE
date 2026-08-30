import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { Screen, ScreenHeader } from '@/components/layout';
import {
  AdminConfirmSheet,
  AdminSegmented,
  AdminTagInput,
} from '@/features/admin/components/AdminControls';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  AdminBackLink,
  AdminButton,
  AdminCard,
  AdminChip,
  AdminField,
  AdminHelper,
  AdminLabel,
  AdminToggleRow,
} from '@/features/admin/components/AdminUi';
import { useDirtyTracker, useUnsavedGuard } from '@/features/admin/hooks/useAdminForm';
import { useAdminPlans, useDeleteAdminPlan, useSaveAdminPlan } from '@/hooks/useAdmin';
import { PLAN_INTERVALS, slugify, type AdminPlan } from '@/services/admin';

import type { AdminSystemStackParamList } from '../navigation/types';

const INTERVAL_OPTIONS = PLAN_INTERVALS.map(interval => ({
  value: interval,
  label: interval === 'lifetime' ? 'Lifetime' : `Per ${interval}`,
}));

const CURRENCIES = ['PKR', 'USD', 'GBP', 'EUR'];

export function AdminPlanEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<AdminSystemStackParamList, 'AdminPlanEditor'>>();
  const planId = route.params?.planId;
  const toast = useToast();

  const { data: plans = [] } = useAdminPlans();
  const existing = plans.find(item => item.id === planId);
  const save = useSaveAdminPlan();
  const remove = useDeleteAdminPlan();

  const [form, setForm] = useState({
    code: '',
    name: '',
    price: '0',
    currency: 'PKR',
    interval: 'month' as AdminPlan['interval'],
    features: [] as string[],
    productId: '',
    isActive: true,
    sortOrder: '0',
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { isDirty, reset } = useDirtyTracker(form);
  useUnsavedGuard(isDirty);

  useEffect(() => {
    if (!existing) return;
    setForm({
      code: existing.code,
      name: existing.name,
      price: String(existing.price_cents / 100),
      currency: existing.currency,
      interval: existing.interval,
      features: existing.features,
      productId: existing.revenuecat_product_id ?? '',
      isActive: existing.is_active,
      sortOrder: String(existing.sort_order),
    });
  }, [existing]);

  useEffect(() => {
    if (!planId || existing) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, existing]);

  const resolvedCode = form.code.trim() || slugify(form.name);

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Enter a plan name.');
      return;
    }
    if (!resolvedCode) {
      toast.error('Enter a plan code.');
      return;
    }

    save.mutate(
      {
        id: planId,
        code: resolvedCode,
        name: form.name,
        price_cents: Math.round((Number(form.price) || 0) * 100),
        currency: form.currency,
        interval: form.interval,
        features: form.features,
        revenuecat_product_id: form.productId,
        is_active: form.isActive,
        sort_order: Number(form.sortOrder) || 0,
      },
      {
        onSuccess: () => {
          reset();
          toast.success(planId ? 'Plan saved.' : 'Plan created.');
          navigation.goBack();
        },
        onError: caught => toast.error(errorMessage(caught)),
      },
    );
  };

  return (
    <Screen>
      <AdminBackLink label="Plans" />
      <ScreenHeader
        title={planId ? 'Edit plan' : 'New plan'}
        subtitle="Shown on the subscription screen and matched to RevenueCat."
      />

      <View style={s.stack}>
        <AdminField
          label="Name"
          value={form.name}
          onChangeText={value => setForm(current => ({ ...current, name: value }))}
          placeholder="Premium yearly"
          maxLength={60}
        />
        <AdminField
          label="Code"
          value={form.code}
          onChangeText={value => setForm(current => ({ ...current, code: value }))}
          placeholder={slugify(form.name) || 'premium-yearly'}
          autoCapitalize="none"
          helper={`Stable identifier — currently “${resolvedCode || '—'}”.`}
        />

        <View style={s.row}>
          <View style={s.grow}>
            <AdminField
              label="Price"
              value={form.price}
              onChangeText={value =>
                setForm(current => ({ ...current, price: value.replace(/[^0-9.]/g, '') }))
              }
              keyboardType="decimal-pad"
            />
          </View>
          <View style={s.currency}>
            <AdminLabel>Currency</AdminLabel>
            <View style={s.wrap}>
              {CURRENCIES.map(code => (
                <AdminChip
                  key={code}
                  label={code}
                  compact
                  selected={form.currency === code}
                  onPress={() => setForm(current => ({ ...current, currency: code }))}
                />
              ))}
            </View>
          </View>
        </View>

        <View style={s.group}>
          <AdminLabel>Billing interval</AdminLabel>
          <AdminSegmented
            options={INTERVAL_OPTIONS}
            value={form.interval}
            onChange={interval => setForm(current => ({ ...current, interval }))}
          />
        </View>

        <AdminTagInput
          label="Features"
          tags={form.features}
          onChange={features => setForm(current => ({ ...current, features }))}
          helper="One bullet per line on the subscription screen."
        />

        <AdminField
          label="RevenueCat product id"
          value={form.productId}
          onChangeText={value => setForm(current => ({ ...current, productId: value }))}
          placeholder="ilm_premium_yearly"
          autoCapitalize="none"
          helper="Must match the product configured in RevenueCat, or the webhook cannot map purchases to this plan."
        />

        <AdminCard>
          <AdminToggleRow
            label="Active"
            description="Inactive plans stay in the database but are hidden from readers."
            value={form.isActive}
            onValueChange={value => setForm(current => ({ ...current, isActive: value }))}
          />
        </AdminCard>

        <AdminField
          label="Sort order"
          value={form.sortOrder}
          onChangeText={value =>
            setForm(current => ({ ...current, sortOrder: value.replace(/[^0-9]/g, '') }))
          }
          keyboardType="number-pad"
        />

        <AdminButton
          label={save.isPending ? 'Saving…' : planId ? 'Save changes' : 'Create plan'}
          loading={save.isPending}
          disabled={!form.name.trim()}
          onPress={handleSave}
        />

        {planId ? (
          <>
            <AdminButton
              label="Delete plan"
              variant="destructive"
              disabled={remove.isPending}
              onPress={() => setConfirmDelete(true)}
            />
            <AdminHelper>
              Deleting a plan clears it from existing entitlements but does not revoke access.
              Deactivating is usually safer.
            </AdminHelper>
          </>
        ) : null}
      </View>

      <AdminConfirmSheet
        visible={confirmDelete}
        title="Delete this plan?"
        message="Subscribers on this plan keep their access, but their plan name is cleared. Consider deactivating instead."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          planId &&
          remove.mutate(planId, {
            onSuccess: () => {
              setConfirmDelete(false);
              reset();
              toast.success('Plan deleted.');
              navigation.goBack();
            },
            onError: caught => {
              setConfirmDelete(false);
              toast.error(errorMessage(caught));
            },
          })
        }
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  stack: { gap: 16 },
  row: { flexDirection: 'row', gap: 11 },
  grow: { flex: 1 },
  currency: { width: 130, gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  group: { gap: 8 },
});
