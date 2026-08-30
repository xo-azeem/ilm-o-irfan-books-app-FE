import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';

import { Screen } from '@/components/layout';
import { ListRowsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { Avatar, Display, Label, ProgressBar, Text } from '@/components/ui';
import { AdminConfirmSheet, AdminPickerSheet } from '@/features/admin/components/AdminControls';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  AdminBackLink,
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminErrorState,
  AdminRowGroup,
  AdminStat,
  AdminStatRow,
} from '@/features/admin/components/AdminUi';
import {
  formatBytes,
  formatDate,
  formatRelative,
  monthsFromNow,
} from '@/features/admin/utils/format';
import {
  useAdminPlans,
  useAdminUserDetail,
  useSetEntitlement,
  useSetUserRole,
} from '@/hooks/useAdmin';
import type { EntitlementStatus } from '@/services/admin';
import { useAuthStore } from '@/stores/authStore';
import { layout } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminPeopleStackParamList } from '../navigation/types';

type GrantOption = { id: string; label: string; months: number | null };

const GRANT_OPTIONS: GrantOption[] = [
  { id: '1', label: '1 month', months: 1 },
  { id: '3', label: '3 months', months: 3 },
  { id: '12', label: '12 months', months: 12 },
  { id: 'forever', label: 'No expiry', months: null },
];

/**
 * A reader, as seen from admin.
 *
 * Entitlement facts, then behaviour, then the two irreversible actions last —
 * the order support staff actually work in.
 */
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

  const grant = useCallback(
    (months: number | null) => {
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
    },
    [activePlan?.id, setEntitlement, toast, userId],
  );

  if (isLoading) {
    return (
      <Screen padding={layout.adminPadding} gap={16}>
        <AdminBackLink label="People" />
        <ListRowsSkeleton count={5} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen padding={layout.adminPadding} gap={16}>
        <AdminBackLink label="People" />
        <AdminErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen padding={layout.adminPadding} gap={16}>
        <AdminBackLink label="People" />
        <Text size={fontSize.body} leading={1.4} tone="muted">
          User not found.
        </Text>
      </Screen>
    );
  }

  const reading = data?.reading.slice(0, 6) ?? [];
  const downloads = data?.downloads.slice(0, 6) ?? [];

  return (
    <Screen padding={layout.adminPadding} gap={16}>
      <AdminBackLink label="People" />

      <View style={styles.identity}>
        <Avatar
          name={user.full_name ?? user.email}
          size={52}
          shape="squircle"
          tone={user.role === 'admin' ? 'danger' : user.is_subscriber ? 'primary' : 'neutral'}
        />
        <View style={styles.identityBody}>
          <Display size={22} numberOfLines={1}>
            {user.full_name || 'Reader'}
          </Display>
          <Text size={fontSize.captionSmall} leading={1.2} tone="muted" numberOfLines={1}>
            {user.email ?? user.id}
          </Text>
        </View>
        {user.role === 'admin' ? <AdminBadge label="Admin" tone="danger" /> : null}
      </View>

      {/* Entitlement facts first — the reason support opened this screen. */}
      <AdminCard>
        <DetailRow label="Role" value={user.role === 'admin' ? 'Admin' : 'Reader'} />
        <DetailRow
          label="Entitlement"
          value={
            user.is_subscriber
              ? `${user.plan_name ?? 'Premium'} · ${user.entitlement_status ?? 'active'}`
              : 'None'
          }
          accent={user.is_subscriber}
        />
        <DetailRow
          label="Renews"
          value={
            user.expires_at ? formatDate(user.expires_at) : user.is_subscriber ? 'Never' : '—'
          }
        />
        <DetailRow label="Joined" value={formatDate(user.created_at)} />
        <DetailRow label="Last seen" value={formatRelative(user.last_read_at)} />
      </AdminCard>

      {/* Then behaviour. */}
      <AdminStatRow>
        <AdminStat label="Books read" value={user.books_finished} />
        <AdminStat label="Downloads" value={user.downloads_count} />
        <AdminStat label="Wishlist" value={data?.wishlist_count ?? 0} />
      </AdminStatRow>

      {reading.length > 0 ? (
        <AdminRowGroup title="Recent reading">
          {reading.map(entry => (
            <View key={entry.book_id} style={styles.readingRow}>
              <View style={styles.readingHeader}>
                <Text size={13} leading={1.2} numberOfLines={1} style={styles.grow}>
                  {entry.title}
                </Text>
                <Label tone="primary" tracking={0.6}>
                  {`${Math.round(entry.progress * 100)}%`}
                </Label>
              </View>
              <ProgressBar value={entry.progress} height={3} />
              <Text size={10.5} leading={1.2} tone="faint">
                {`p. ${entry.current_page} · ${formatRelative(entry.last_read_at)}`}
              </Text>
            </View>
          ))}
        </AdminRowGroup>
      ) : null}

      {downloads.length > 0 ? (
        <AdminRowGroup title="Downloads">
          {downloads.map(entry => (
            <View key={`${entry.book_id}-${entry.downloaded_at}`} style={styles.downloadRow}>
              <View style={styles.grow}>
                <Text size={13} leading={1.2} numberOfLines={1}>
                  {entry.title}
                </Text>
                <Text size={10.5} leading={1.3} tone="faint" numberOfLines={1}>
                  {`${formatRelative(entry.downloaded_at)} · ${formatBytes(entry.file_size_bytes)}`}
                </Text>
              </View>
              <AdminBadge
                label={entry.status}
                tone={entry.status === 'completed' ? 'success' : 'warning'}
              />
            </View>
          ))}
        </AdminRowGroup>
      ) : null}

      <AdminCard title="Subscription">
        <DetailRow label="Source" value={user.store ?? 'Manual'} />

        {plans.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowPlanPicker(true)}
            style={({ pressed }) => [
              styles.planRow,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              pressed && styles.pressed,
            ]}>
            <Text size={13} leading={1} tone="muted">
              Plan to grant
            </Text>
            <Text size={13} leading={1} weight="500" tone="primary">
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

        <Text size={12} leading={1.45} tone="faint">
          Store purchases stay owned by RevenueCat — a webhook will overwrite a manual grant on the
          next event. Use this for comps and support fixes.
        </Text>
      </AdminCard>

      {/* The irreversible actions, last. */}
      <View style={styles.dangerZone}>
        {isSelf ? (
          <Text size={fontSize.caption} leading={1.4} tone="muted" align="center">
            You cannot change your own role.
          </Text>
        ) : user.role === 'admin' ? (
          <AdminButton
            label="Remove admin access"
            variant="secondary"
            loading={setRole.isPending}
            onPress={() => setConfirmRole('user')}
          />
        ) : (
          <AdminButton
            label="Grant admin access"
            variant="secondary"
            loading={setRole.isPending}
            onPress={() => setConfirmRole('admin')}
          />
        )}

        {user.is_subscriber ? (
          <AdminButton
            label="Revoke subscription"
            variant="destructive"
            onPress={() => setConfirmRevoke(true)}
          />
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
          if (option) {
            grant(option.months);
          }
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
        title={confirmRole === 'admin' ? 'Grant admin access?' : 'Remove admin access?'}
        message={
          confirmRole === 'admin'
            ? 'This account will open the admin panel on its next sign-in and can edit the whole catalog.'
            : 'They lose CMS access once their session refreshes. The last remaining admin cannot be demoted.'
        }
        confirmLabel={confirmRole === 'admin' ? 'Grant' : 'Remove'}
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
                toast.success(
                  confirmRole === 'admin' ? 'Admin access granted.' : 'Admin access removed.',
                );
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

const DetailRow = memo(function DetailRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  /** Highlights an entitlement so the revenue state is readable at a glance. */
  accent?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text size={13} leading={1} tone="muted">
        {label}
      </Text>
      <Text
        size={13}
        leading={1}
        weight="500"
        tone={accent ? 'lime' : 'ink'}
        numberOfLines={1}
        style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  identityBody: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailValue: {
    maxWidth: '62%',
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  readingRow: {
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  readingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  downloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },
  dangerZone: {
    gap: 10,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.75,
  },
});
