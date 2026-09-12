import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { Plus } from 'lucide-react-native';

import { Icon, Text } from '@/components/ui';
import {
  AdminConfirmSheet,
  AdminSegmented,
} from '@/features/admin/components/AdminControls';
import { AdminOrderableList } from '@/features/admin/components/AdminOrderableList';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  ADMIN_GUTTER,
  AdminBackLink,
  AdminButton,
  AdminCard,
  AdminChip,
  AdminField,
  AdminLabel,
  AdminScreenTitle,
  AdminSectionHeader,
  AdminTag,
  AdminTextAction,
  AdminToggleRow,
} from '@/features/admin/components/AdminUi';
import {
  useDirtyTracker,
  useUnsavedGuard,
} from '@/features/admin/hooks/useAdminForm';
import { formatMoney } from '@/features/admin/utils/format';
import { useAppInsets } from '@/hooks/useAppInsets';
import {
  useAdminPlans,
  useDeleteAdminPlan,
  useSaveAdminPlan,
} from '@/hooks/useAdmin';
import { PLAN_INTERVALS, slugify, type AdminPlan } from '@/services/admin';
import { radius } from '@/theme/palette';
import { sansFamily } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminPeopleStackParamList } from '../navigation/types';

const INTERVAL_OPTIONS = PLAN_INTERVALS.map(interval => ({
  value: interval,
  label:
    interval === 'lifetime' ? 'Once' : interval === 'year' ? 'Year' : 'Month',
}));

const CURRENCIES = ['PKR', 'USD', 'GBP', 'EUR'];

/**
 * A subscription plan.
 *
 * The price field opens with the one thing an operator is most likely to get
 * wrong: a change here does not reprice anybody who has already subscribed.
 * The store product id is the other trap — a plan with no matching product is
 * a plan whose purchases resolve to nothing.
 */
export function AdminPlanEditorScreen() {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<AdminPeopleStackParamList, 'AdminPlanEditor'>>();
  const planId = route.params?.planId;
  const { colors } = useTheme();
  const { scrollEndPadding } = useAppInsets();
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
  });
  const [draftFeature, setDraftFeature] = useState('');
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
    });
  }, [existing]);

  useEffect(() => {
    if (!planId || existing) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, existing]);

  const resolvedCode = form.code.trim() || slugify(form.name);

  const featureItems = useMemo(
    () => form.features.map(feature => ({ id: feature, label: feature })),
    [form.features],
  );

  const addFeature = () => {
    const value = draftFeature.trim();
    if (!value) return;
    if (
      !form.features.some(
        feature => feature.toLowerCase() === value.toLowerCase(),
      )
    ) {
      setForm(current => ({
        ...current,
        features: [...current.features, value],
      }));
    }
    setDraftFeature('');
  };

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
        sort_order: existing?.sort_order ?? plans.length,
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
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AdminBackLink
          label="Plans"
          action={
            <View style={styles.badges}>
              {isDirty ? <AdminTag label="UNSAVED" tone="warning" /> : null}
              <AdminTag
                label={form.isActive ? 'ON SALE' : 'OFF SALE'}
                tone={form.isActive ? 'success' : 'neutral'}
              />
            </View>
          }
        />
      </View>

      <ScrollView
        style={styles.grow}
        contentContainerStyle={{
          paddingHorizontal: ADMIN_GUTTER,
          paddingTop: 16,
          paddingBottom: scrollEndPadding + 80,
          gap: 15,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AdminScreenTitle
          title={form.name || (planId ? 'Edit plan' : 'New plan')}
          subtitle="Shown on the paywall and matched to a store product."
        />

        {/* The one thing an operator most often assumes wrongly. */}
        {planId && existing ? (
          <View
            style={[
              styles.note,
              {
                backgroundColor: colors.warningFill,
                borderColor: colors.warningBorder,
              },
            ]}
          >
            <Text
              size={12}
              leading={1.5}
              tone="inherit"
              style={{ color: colors.warningInk }}
            >
              {`Price changes apply to new subscribers only. Everyone already on this plan keeps ${formatMoney(
                existing.price_cents,
                existing.currency,
              )} until they cancel.`}
            </Text>
          </View>
        ) : null}

        <AdminField
          label="Name readers see"
          value={form.name}
          onChangeText={value =>
            setForm(current => ({ ...current, name: value }))
          }
          placeholder="Annual"
          maxLength={60}
        />

        <View style={styles.row}>
          <View style={styles.grow}>
            <AdminField
              label="Price"
              value={form.price}
              onChangeText={value =>
                setForm(current => ({
                  ...current,
                  price: value.replace(/[^0-9.]/g, ''),
                }))
              }
              keyboardType="decimal-pad"
              suffix={form.currency}
            />
          </View>
          <View style={styles.currency}>
            <AdminLabel>Currency</AdminLabel>
            <View style={styles.wrap}>
              {CURRENCIES.map(code => (
                <AdminChip
                  key={code}
                  label={code}
                  compact
                  selected={form.currency === code}
                  onPress={() =>
                    setForm(current => ({ ...current, currency: code }))
                  }
                />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.block}>
          <AdminLabel>Billed</AdminLabel>
          <AdminSegmented
            options={INTERVAL_OPTIONS}
            value={form.interval}
            onChange={interval =>
              setForm(current => ({ ...current, interval }))
            }
          />
        </View>

        <AdminField
          label="Store product id"
          value={form.productId}
          onChangeText={value =>
            setForm(current => ({ ...current, productId: value }))
          }
          placeholder="rc_annual_pk"
          autoCapitalize="none"
          mono
          helper={
            form.productId
              ? 'Must match the product configured in RevenueCat, character for character.'
              : 'Without a product id, purchases of this plan resolve to nothing.'
          }
          helperTone={form.productId ? 'faint' : 'warning'}
        />

        <AdminField
          label="Plan code"
          value={form.code}
          onChangeText={value =>
            setForm(current => ({ ...current, code: value }))
          }
          placeholder={slugify(form.name) || 'annual-v2'}
          autoCapitalize="none"
          mono
          helper={`A stable internal identifier — currently “${resolvedCode || '—'}”.`}
        />

        <View style={styles.block}>
          <AdminSectionHeader
            title="What it includes"
            action={
              <AdminTextAction
                label="Add line"
                size={11.5}
                onPress={addFeature}
              />
            }
          />

          <View
            style={[
              styles.featureInput,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
              },
            ]}
          >
            <TextInput
              value={draftFeature}
              onChangeText={setDraftFeature}
              onSubmitEditing={addFeature}
              blurOnSubmit={false}
              returnKeyType="done"
              placeholder="All premium titles"
              placeholderTextColor={colors.faint}
              style={[
                styles.featureText,
                { color: colors.ink, fontFamily: sansFamily('400') },
              ]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add benefit"
              onPress={addFeature}
              hitSlop={10}
              disabled={!draftFeature.trim()}
            >
              <Icon
                icon={Plus}
                size={18}
                color={draftFeature.trim() ? colors.actionIcon : colors.faint}
                strokeWidth={2.2}
              />
            </Pressable>
          </View>

          <AdminOrderableList
            items={featureItems}
            emptyLabel="No benefits yet — the paywall will show an empty card."
            onChange={next =>
              setForm(current => ({
                ...current,
                features: next.map(item => item.label),
              }))
            }
          />
        </View>

        <AdminCard>
          <AdminToggleRow
            label="Offer on the paywall"
            description="Turning this off keeps existing subscribers and hides the plan from everyone else."
            value={form.isActive}
            onValueChange={value =>
              setForm(current => ({ ...current, isActive: value }))
            }
          />
        </AdminCard>

        {planId ? (
          <View style={styles.deleteBlock}>
            <AdminTextAction
              label="Delete this plan"
              destructive
              size={13}
              onPress={() => setConfirmDelete(true)}
            />
            <Text size={11.5} leading={1.4} align="center" tone="faint">
              Taking it off sale is almost always the safer move.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.chrome,
            borderTopColor: colors.chromeBorder,
          },
        ]}
      >
        <AdminButton
          label={planId ? 'Save plan' : 'Create plan'}
          loading={save.isPending}
          disabled={!form.name.trim()}
          onPress={handleSave}
        />
      </View>

      <AdminConfirmSheet
        visible={confirmDelete}
        title={`Delete ${form.name || 'this plan'}?`}
        message="Subscribers keep their access, but the plan disappears. What goes:"
        consequences={[
          'The plan name against every existing subscriber',
          'The mapping from store purchases to this tier',
          'Its card on the paywall',
        ]}
        confirmLabel="Delete"
        destructive
        footnote="Taking it off sale keeps all of that."
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  grow: { flex: 1, minWidth: 0 },
  note: {
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  row: {
    flexDirection: 'row',
    gap: 11,
  },
  currency: {
    width: 130,
    gap: 8,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  block: { gap: 9 },
  featureInput: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 15,
    borderRadius: radius.field,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    includeFontPadding: false,
  },
  deleteBlock: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  footer: {
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 13,
    paddingBottom: 26,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
});
