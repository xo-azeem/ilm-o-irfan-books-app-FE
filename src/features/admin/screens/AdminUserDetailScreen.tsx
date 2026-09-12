import { memo, useCallback, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';

import { Display, Label, Text } from '@/components/ui';
import {
  AdminConfirmSheet,
  AdminPickerSheet,
} from '@/features/admin/components/AdminControls';
import { AdminMenuSkeleton } from '@/features/admin/components/AdminSkeletons';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  ADMIN_GUTTER,
  AdminAvatar,
  AdminBackLink,
  AdminButton,
  AdminErrorState,
  AdminEyebrow,
  AdminMeter,
  AdminRowGroup,
  AdminStat,
  AdminStatRow,
  AdminTag,
  AdminTextAction,
  AdminToggleRow,
} from '@/features/admin/components/AdminUi';
import {
  daysFromNow,
  formatBytes,
  formatCountdown,
  formatDate,
  formatRelative,
  monthsFromNow,
} from '@/features/admin/utils/format';
import { useAppInsets } from '@/hooks/useAppInsets';
import {
  useAdminPlans,
  useAdminUserDetail,
  useSetEntitlement,
  useSetUserRole,
} from '@/hooks/useAdmin';
import type { AdminUserRow, EntitlementStatus } from '@/services/admin';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminPeopleStackParamList } from '../navigation/types';

type GrantOption = {
  id: string;
  label: string;
  months: number | null;
  days?: number;
};

const GRANT_OPTIONS: GrantOption[] = [
  { id: '14d', label: '14 days', months: null, days: 14 },
  { id: '1', label: '1 month', months: 1 },
  { id: '3', label: '3 months', months: 3 },
  { id: '12', label: '12 months', months: 12 },
  { id: 'forever', label: 'No expiry', months: null },
];

const STATUS_LABEL: Record<EntitlementStatus, string> = {
  active: 'Active',
  trial: 'Trial',
  grace: 'Grace period',
  billing_issue: 'Billing issue',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

/**
 * A reader, as seen from admin.
 *
 * Access first, because it is the reason support opened this screen; then what
 * they have actually been reading; then the two changes that are hard to
 * reverse, last and clearly marked.
 */
export function AdminUserDetailScreen() {
  const route =
    useRoute<RouteProp<AdminPeopleStackParamList, 'AdminUserDetail'>>();
  const { userId } = route.params;
  const { colors } = useTheme();
  const { scrollEndPadding } = useAppInsets();
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
    () =>
      plans.find(plan => plan.id === (pendingPlanId ?? user?.plan_id)) ??
      plans[0],
    [plans, pendingPlanId, user?.plan_id],
  );

  const grant = useCallback(
    (option: GrantOption) => {
      setEntitlement.mutate(
        {
          userId,
          status: 'active' as EntitlementStatus,
          planId: activePlan?.id ?? null,
          expiresAt: option.days
            ? daysFromNow(option.days)
            : option.months === null
              ? null
              : monthsFromNow(option.months),
        },
        {
          onSuccess: () => {
            setShowGrant(false);
            toast.success(`Access granted — ${option.label.toLowerCase()}.`);
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
      <Shell>
        <AdminMenuSkeleton count={5} />
      </Shell>
    );
  }

  if (error || !user) {
    return (
      <Shell>
        <AdminErrorState
          title={error ? 'Could not load this reader' : 'Reader not found'}
          message={
            error
              ? 'The request did not complete. This is usually the server rather than your connection.'
              : 'This account may have been deleted since the list was loaded.'
          }
          detail={error ? errorMessage(error) : undefined}
          onRetry={() => void refetch()}
        />
      </Shell>
    );
  }

  const reading = data?.reading.slice(0, 4) ?? [];
  const downloads = data?.downloads.slice(0, 4) ?? [];
  const access = describeAccess(user, activePlan?.name);

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AdminBackLink
          label="People"
          action={
            user.role === 'admin' ? (
              <AdminTag label="ADMIN" tone="success" />
            ) : undefined
          }
        />
      </View>

      <ScrollView
        style={styles.grow}
        contentContainerStyle={{
          paddingHorizontal: ADMIN_GUTTER,
          paddingTop: 16,
          paddingBottom: scrollEndPadding + 20,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identity}>
          <AdminAvatar
            name={user.full_name ?? user.email ?? '?'}
            size={56}
            tone={
              access.tone === 'warning'
                ? 'warning'
                : user.is_subscriber
                  ? 'primary'
                  : 'neutral'
            }
          />
          <View style={styles.identityBody}>
            <Display size={22} weight="500" tracking={-0.4} numberOfLines={1}>
              {user.full_name || 'Reader'}
            </Display>
            <Text size={12} leading={1.35} tone="muted">
              {[
                user.email,
                user.phone,
                user.country,
                `joined ${formatDate(user.created_at)}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        </View>

        {/* Access, first and in a sentence. */}
        <View
          style={[
            styles.accessCard,
            access.tone === 'warning'
              ? {
                  backgroundColor: colors.warningFill,
                  borderColor: colors.warningBorder,
                }
              : access.tone === 'active'
                ? {
                    backgroundColor: colors.primaryFillSoft,
                    borderColor: colors.selectedBorder,
                  }
                : {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
          ]}
        >
          <View style={styles.between}>
            <AdminEyebrow
              tone={access.tone === 'warning' ? 'warning' : 'action'}
            >
              {access.eyebrow}
            </AdminEyebrow>
            <Label
              size={10.5}
              leading={1}
              weight="400"
              tracking={0.6}
              tone="muted"
            >
              {user.store ?? 'Manual'}
            </Label>
          </View>

          <Text size={13} leading={1.5}>
            {access.sentence}
          </Text>

          <View style={styles.accessActions}>
            <View style={styles.grow}>
              <AdminButton
                label="Grant access"
                variant="secondary"
                compact
                loading={setEntitlement.isPending && showGrant}
                onPress={() => setShowGrant(true)}
              />
            </View>
            <View style={styles.grow}>
              <AdminButton
                label="Email reader"
                variant="secondary"
                compact
                disabled={!user.email}
                onPress={() => {
                  if (user.email) {
                    void Linking.openURL(`mailto:${user.email}`);
                  }
                }}
              />
            </View>
          </View>

          {plans.length > 0 ? (
            <View style={styles.between}>
              <Text size={11.5} leading={1.4} tone="muted">
                {`Grants use the ${activePlan?.name ?? 'first'} plan`}
              </Text>
              <AdminTextAction
                label="Change"
                size={11.5}
                tone={access.tone === 'warning' ? 'warning' : 'action'}
                onPress={() => setShowPlanPicker(true)}
              />
            </View>
          ) : null}
        </View>

        {/* Then behaviour. */}
        <AdminStatRow>
          <AdminStat
            label="Day streak"
            value={data?.streak?.current_streak ?? 0}
            tone="success"
          />
          <AdminStat label="Started" value={user.books_started} />
          <AdminStat label="Finished" value={user.books_finished} />
          <AdminStat label="Downloads" value={user.downloads_count} />
        </AdminStatRow>

        {reading.length > 0 ? (
          <AdminRowGroup title="Reading now">
            {reading.map(entry => (
              <View key={entry.book_id} style={styles.readingRow}>
                <View
                  style={[
                    styles.readingCover,
                    { backgroundColor: entry.cover_color ?? colors.coverBase },
                  ]}
                />
                <View style={styles.readingBody}>
                  <Text size={13} leading={1.2} numberOfLines={1}>
                    {entry.title}
                  </Text>
                  <AdminMeter value={entry.progress} height={4} />
                  <Text size={10.5} leading={1} tone="faint">
                    {`${Math.round(entry.progress * 100)}% · page ${
                      entry.current_page
                    } · ${formatRelative(entry.last_read_at)}`}
                  </Text>
                </View>
              </View>
            ))}
          </AdminRowGroup>
        ) : null}

        {downloads.length > 0 ? (
          <AdminRowGroup title="Downloads">
            {downloads.map(entry => (
              <View
                key={`${entry.book_id}-${entry.downloaded_at}`}
                style={styles.downloadRow}
              >
                <View style={styles.grow}>
                  <Text size={13} leading={1.2} numberOfLines={1}>
                    {entry.title}
                  </Text>
                  <Text
                    size={10.5}
                    leading={1.3}
                    tone="faint"
                    numberOfLines={1}
                  >
                    {`${formatRelative(entry.downloaded_at)} · ${formatBytes(
                      entry.file_size_bytes,
                    )}`}
                  </Text>
                </View>
                <AdminTag
                  label={entry.status.toUpperCase()}
                  tone={entry.status === 'completed' ? 'success' : 'warning'}
                />
              </View>
            ))}
          </AdminRowGroup>
        ) : null}

        {/* Then the two things that are hard to take back. */}
        <AdminRowGroup>
          <View style={styles.actionRow}>
            {isSelf ? (
              <Text size={14} leading={1.2} tone="muted" style={styles.grow}>
                You cannot change your own role.
              </Text>
            ) : (
              <AdminToggleRow
                label="Make this reader an admin"
                value={user.role === 'admin'}
                disabled={setRole.isPending}
                onValueChange={next => setConfirmRole(next ? 'admin' : 'user')}
              />
            )}
          </View>

          {user.is_subscriber ? (
            <View style={styles.actionRow}>
              <Text size={14} leading={1.2} tone="danger" style={styles.grow}>
                Revoke subscription access
              </Text>
              <AdminTextAction
                label="Revoke"
                destructive
                size={12.5}
                onPress={() => setConfirmRevoke(true)}
              />
            </View>
          ) : null}
        </AdminRowGroup>

        <Text size={11.5} leading={1.45} tone="faint">
          Store purchases stay owned by RevenueCat — a webhook will overwrite a
          manual grant on the next event. Use grants for comps and support
          fixes.
        </Text>
      </ScrollView>

      <AdminPickerSheet
        visible={showGrant}
        title="Grant for how long?"
        searchable={false}
        items={GRANT_OPTIONS.map(option => ({
          id: option.id,
          label: option.label,
        }))}
        selected={[]}
        onClose={() => setShowGrant(false)}
        onChange={next => {
          const option = GRANT_OPTIONS.find(item => item.id === next[0]);
          if (option) {
            grant(option);
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
        title="Revoke premium access?"
        message="It stops immediately. What that means:"
        consequences={[
          'Premium titles lock on their next open',
          'Downloaded premium files stop opening',
          'A future store event can restore it',
        ]}
        confirmLabel="Revoke"
        destructive
        loading={setEntitlement.isPending}
        onCancel={() => setConfirmRevoke(false)}
        onConfirm={() =>
          setEntitlement.mutate(
            {
              userId,
              status: 'expired',
              planId: user.plan_id,
              expiresAt: null,
            },
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
        title={
          confirmRole === 'admin'
            ? 'Grant admin access?'
            : 'Remove admin access?'
        }
        message={
          confirmRole === 'admin'
            ? 'This account opens the admin panel on its next sign-in. What it gains:'
            : 'CMS access stops once their session refreshes. What they lose:'
        }
        consequences={
          confirmRole === 'admin'
            ? [
                'Every book, author, category and shelf becomes editable',
                'Every premium PDF opens without a subscription',
                'Their email is written against every change they make',
              ]
            : ['The admin panel', 'Unrestricted access to premium PDFs']
        }
        confirmLabel={confirmRole === 'admin' ? 'Grant' : 'Remove'}
        cancelLabel="Cancel"
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
                  confirmRole === 'admin'
                    ? 'Admin access granted.'
                    : 'Admin access removed.',
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
    </SafeAreaView>
  );
}

/** Access as one sentence, plus the colour it should be read in. */
function describeAccess(
  user: AdminUserRow,
  planName?: string,
): { eyebrow: string; sentence: string; tone: 'warning' | 'active' | 'none' } {
  const plan = user.plan_name ?? planName ?? 'Premium';
  const status = user.entitlement_status;

  if (status === 'billing_issue' || status === 'grace') {
    return {
      eyebrow: `Access · ${STATUS_LABEL[status]}`,
      sentence: `${plan} plan, payment has not gone through. Premium titles stay open ${formatCountdown(
        user.expires_at,
      )}, then the account drops to free.`,
      tone: 'warning',
    };
  }

  if (user.is_subscriber) {
    return {
      eyebrow: `Access · ${status ? STATUS_LABEL[status] : 'Active'}`,
      sentence: user.expires_at
        ? `${plan} plan, renewing ${formatDate(user.expires_at)}. Every premium title is open.`
        : `${plan} plan with no end date. Every premium title is open.`,
      tone: 'active',
    };
  }

  return {
    eyebrow: 'Access · Free',
    sentence:
      'Free account. Premium titles are locked until this reader subscribes, or you grant access below.',
    tone: 'none',
  };
}

/** The screen frame, reused by the loading and error states. */
const Shell = memo(function Shell({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AdminBackLink label="People" />
      </View>
      <View style={styles.shellBody}>{children}</View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  shellBody: {
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 16,
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  identityBody: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  accessCard: {
    gap: 12,
    padding: 15,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  accessActions: {
    flexDirection: 'row',
    gap: 9,
  },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readingCover: {
    width: 32,
    height: 44,
    borderRadius: 6,
  },
  readingBody: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  downloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
});
