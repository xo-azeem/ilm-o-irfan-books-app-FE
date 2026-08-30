import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';

import { Screen, ScreenHeader } from '@/components/layout';
import { ListRowsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { DisplayText, Text } from '@/components/ui';
import {
  AdminConfirmSheet,
  AdminPickerSheet,
} from '@/features/admin/components/AdminControls';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  AdminBackLink,
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminErrorState,
} from '@/features/admin/components/AdminUi';
import {
  formatBytes,
  formatDate,
  formatRelative,
  monthsFromNow,
} from '@/features/admin/utils/format';
import { useAdminPlans, useAdminUserDetail, useSetEntitlement, useSetUserRole } from '@/hooks/useAdmin';
import type { EntitlementStatus } from '@/services/admin';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminPeopleStackParamList } from '../navigation/types';

type GrantOption = { id: string; label: string; months: number | null };

const GRANT_OPTIONS: GrantOption[] = [
  { id: '1', label: '1 month', months: 1 },
  { id: '3', label: '3 months', months: 3 },
  { id: '12', label: '12 months', months: 12 },
  { id: 'forever', label: 'No expiry', months: null },
];

export function AdminUserDetailScreen() {
  const route = useRoute<RouteProp<AdminPeopleStackParamList, 'AdminUserDetail'>>();
  const { userId } = route.params;
  const { colors } = useTheme();
  const toast = useToast();

  const currentUserId = useAuthStore(state => state.userId);
  const { data, isLoading, error, refetch } = useAdminUserDetail(userId);
  const { data: plans = [] } = useAdminPlans();
  const setRole = useSetUserRole();
  const setEntitlement = useSetEntitlement();

  const [showGrant, setShowGrant] = useState(false);
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [confirmRole, setConfirmRole] = useState<'user' | 'admin' | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const user = data?.profile ?? null;
  const isSelf = userId === currentUserId;

  const activePlan = useMemo(
    () => plans.find(plan => plan.id === (pendingPlanId ?? user?.plan_id)) ?? plans[0],
    [plans, pendingPlanId, user?.plan_id],
  );

  const grant = (months: number | null) => {
    setEntitlement.mutate(
      {
        userId,
        status: 'active' as EntitlementStatus,
        planId: activePlan?.id ?? null,
        expiresAt: months === null ? null : monthsFromNow(months),
      },
      {
        onSuccess: () => {
          setShowGrant(false);
          toast.success('Subscription granted.');
        },
        onError: caught => {
          setShowGrant(false);
          toast.error(errorMessage(caught));
        },
      },
    );
  };

  if (isLoading) {
    return (
      <Screen>
        <AdminBackLink label="People" />
        <ListRowsSkeleton rows={5} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <AdminBackLink label="People" />
        <AdminErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen>
        <AdminBackLink label="People" />
        <Text className="text-[15px] text-app-muted dark:text-app-muted-dark">User not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <AdminBackLink label="People" />
      <ScreenHeader
        title={user.full_name || 'Reader'}
        subtitle={user.email ?? user.id}
        action={
          <View className="items-end gap-1">
            {user.role === 'admin' ? <AdminBadge label="Admin" tone="danger" /> : null}
            {user.is_subscriber ? <AdminBadge label="Subscriber" tone="accent" /> : null}
          </View>
        }
      />

      <View className="gap-5">
        <View className="flex-row flex-wrap gap-3">
          <Metric label="Reading" value={user.books_started} />
          <Metric label="Finished" value={user.books_finished} />
          <Metric label="Downloads" value={user.downloads_count} />
          <Metric label="Streak" value={data?.streak?.current_streak ?? 0} />
        </View>

        <AdminCard title="Account">
          <View className="gap-2">
            <DetailRow label="Joined" value={formatDate(user.created_at)} />
            <DetailRow label="Last read" value={formatRelative(user.last_read_at)} />
            <DetailRow label="Phone" value={user.phone ?? '—'} />
            <DetailRow label="Country" value={user.country ?? '—'} />
            <DetailRow label="Wishlist" value={String(data?.wishlist_count ?? 0)} />
            <DetailRow label="Highlights" value={String(data?.highlight_count ?? 0)} />
          </View>
        </AdminCard>

        <AdminCard title="Subscription">
          <View className="gap-3">
            <DetailRow label="Status" value={user.entitlement_status ?? 'none'} />
            <DetailRow label="Plan" value={user.plan_name ?? '—'} />
            <DetailRow label="Source" value={user.store ?? '—'} />
            <DetailRow
              label="Expires"
              value={user.expires_at ? formatDate(user.expires_at) : user.is_subscriber ? 'Never' : '—'}
            />

            {plans.length > 0 ? (
              <Pressable
                onPress={() => setShowPlanPicker(true)}
                className="flex-row items-center justify-between rounded-[10px] px-3 py-2.5 active:opacity-70"
                style={{ backgroundColor: colors.fill }}>
                <Text className="text-[13px] text-app-muted dark:text-app-muted-dark">
                  Plan to grant
                </Text>
                <Text className="text-[13px] font-medium text-app-primary dark:text-app-primary-dark">
                  {activePlan?.name ?? 'Choose'}
                </Text>
              </Pressable>
            ) : null}

            <AdminButton
              label="Grant subscription"
              variant="secondary"
              loading={setEntitlement.isPending && showGrant}
              onPress={() => setShowGrant(true)}
            />
            {user.is_subscriber ? (
              <AdminButton
                label="Revoke access"
                variant="destructive"
                onPress={() => setConfirmRevoke(true)}
              />
            ) : null}

            <Text className="px-1 text-[12px] leading-[17px] text-app-faint dark:text-app-faint-dark">
              Store purchases stay owned by RevenueCat — a webhook will overwrite a manual grant on
              the next event. Use this for comps and support fixes.
            </Text>
          </View>
        </AdminCard>

        <AdminCard title="Role">
          <View className="gap-3">
            <Text className="text-[14px] text-app-muted dark:text-app-muted-dark">
              Admins get the CMS instead of the reader app on their next sign-in.
            </Text>
            {isSelf ? (
              <Text className="text-[13px] text-app-muted dark:text-app-muted-dark">
                You cannot change your own role.
              </Text>
            ) : user.role === 'admin' ? (
              <AdminButton
                label="Demote to reader"
                variant="destructive"
                loading={setRole.isPending}
                onPress={() => setConfirmRole('user')}
              />
            ) : (
              <AdminButton
                label="Promote to admin"
                loading={setRole.isPending}
                onPress={() => setConfirmRole('admin')}
              />
            )}
          </View>
        </AdminCard>

        {data && data.reading.length > 0 ? (
          <AdminCard title="Recent reading" padded={false}>
            {data.reading.slice(0, 8).map((entry, index) => (
              <View
                key={entry.book_id}
                className={`gap-1.5 px-4 py-3 ${
                  index === Math.min(data.reading.length, 8) - 1
                    ? ''
                    : 'border-b border-app-border dark:border-app-border-dark'
                }`}>
                <View className="flex-row items-center justify-between gap-3">
                  <Text
                    className="min-w-0 flex-1 text-[14px] text-app-ink dark:text-app-ink-dark"
                    numberOfLines={1}>
                    {entry.title}
                  </Text>
                  <Text className="text-[12px] text-app-muted dark:text-app-muted-dark">
                    {Math.round(entry.progress * 100)}%
                  </Text>
                </View>
                <View
                  className="h-[5px] overflow-hidden rounded-full"
                  style={{ backgroundColor: colors.fill }}>
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(entry.progress * 100, 2)}%`,
                      backgroundColor: entry.cover_color ?? colors.primary,
                    }}
                  />
                </View>
                <Text className="text-[11px] text-app-faint dark:text-app-faint-dark">
                  Page {entry.current_page} · {formatRelative(entry.last_read_at)}
                </Text>
              </View>
            ))}
          </AdminCard>
        ) : null}

        {data && data.downloads.length > 0 ? (
          <AdminCard title="Downloads" padded={false}>
            {data.downloads.slice(0, 8).map((entry, index) => (
              <View
                key={`${entry.book_id}-${entry.downloaded_at}`}
                className={`flex-row items-center justify-between gap-3 px-4 py-3 ${
                  index === Math.min(data.downloads.length, 8) - 1
                    ? ''
                    : 'border-b border-app-border dark:border-app-border-dark'
                }`}>
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-[14px] text-app-ink dark:text-app-ink-dark"
                    numberOfLines={1}>
                    {entry.title}
                  </Text>
                  <Text className="text-[11px] text-app-faint dark:text-app-faint-dark">
                    {formatRelative(entry.downloaded_at)} · {formatBytes(entry.file_size_bytes)}
                  </Text>
                </View>
                <AdminBadge
                  label={entry.status}
                  tone={entry.status === 'completed' ? 'success' : 'warning'}
                />
              </View>
            ))}
          </AdminCard>
        ) : null}
      </View>

      <AdminPickerSheet
        visible={showGrant}
        title="Grant for how long?"
        searchable={false}
        items={GRANT_OPTIONS.map(option => ({ id: option.id, label: option.label }))}
        selected={[]}
        onClose={() => setShowGrant(false)}
        onChange={next => {
          const option = GRANT_OPTIONS.find(item => item.id === next[0]);
          if (option) grant(option.months);
        }}
      />

      <AdminPickerSheet
        visible={showPlanPicker}
        title="Plan"
        searchable={false}
        items={plans.map(plan => ({
          id: plan.id,
          label: plan.name,
          sublabel: `${plan.currency} ${plan.price_cents / 100} / ${plan.interval}`,
        }))}
        selected={activePlan ? [activePlan.id] : []}
        onClose={() => setShowPlanPicker(false)}
        onChange={next => setPendingPlanId(next[0] ?? null)}
      />

      <AdminConfirmSheet
        visible={confirmRevoke}
        title="Revoke subscription access?"
        message="The reader loses premium access immediately. A future RevenueCat event can restore it."
        confirmLabel="Revoke"
        destructive
        loading={setEntitlement.isPending}
        onCancel={() => setConfirmRevoke(false)}
        onConfirm={() =>
          setEntitlement.mutate(
            { userId, status: 'expired', planId: user.plan_id, expiresAt: null },
            {
              onSuccess: () => {
                setConfirmRevoke(false);
                toast.success('Access revoked.');
              },
              onError: caught => {
                setConfirmRevoke(false);
                toast.error(errorMessage(caught));
              },
            },
          )
        }
      />

      <AdminConfirmSheet
        visible={confirmRole !== null}
        title={confirmRole === 'admin' ? 'Promote to admin?' : 'Remove admin access?'}
        message={
          confirmRole === 'admin'
            ? 'This account will open the admin panel on its next sign-in and can edit the whole catalog.'
            : 'They lose CMS access once their session refreshes. The last remaining admin cannot be demoted.'
        }
        confirmLabel={confirmRole === 'admin' ? 'Promote' : 'Demote'}
        destructive={confirmRole === 'user'}
        loading={setRole.isPending}
        onCancel={() => setConfirmRole(null)}
        onConfirm={() =>
          confirmRole &&
          setRole.mutate(
            { userId, role: confirmRole },
            {
              onSuccess: () => {
                setConfirmRole(null);
                toast.success(confirmRole === 'admin' ? 'Promoted to admin.' : 'Admin access removed.');
              },
              onError: caught => {
                setConfirmRole(null);
                toast.error(errorMessage(caught));
              },
            },
          )
        }
      />
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View className="min-w-[46%] flex-1 rounded-[14px] bg-app-surface p-3.5 dark:bg-app-surface-dark">
      <DisplayText className="text-[22px] font-bold text-app-ink dark:text-app-ink-dark">
        {value}
      </DisplayText>
      <Text className="text-[11px] text-app-muted dark:text-app-muted-dark">{label}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-[13px] text-app-muted dark:text-app-muted-dark">{label}</Text>
      <Text
        className="max-w-[60%] text-[14px] text-app-ink dark:text-app-ink-dark"
        numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
