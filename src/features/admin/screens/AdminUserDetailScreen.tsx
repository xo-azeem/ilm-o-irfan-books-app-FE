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
  AdminOutlineButton,
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
import { useStrings } from '@/i18n';
import { strings } from '@/i18n/strings';

type GrantOption = {
  /** Keys `adminPeople.user.grants`, which names the option. */
  id: '14d' | '1' | '3' | '12' | 'forever';
  months: number | null;
  days?: number;
};

const GRANT_OPTIONS: GrantOption[] = [
  { id: '14d', months: null, days: 14 },
  { id: '1', months: 1 },
  { id: '3', months: 3 },
  { id: '12', months: 12 },
  { id: 'forever', months: null },
];

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
  const s = useStrings();
  const words = s.adminPeople.user;
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
            toast.success(
              words.accessGranted(words.grants[option.id].toLowerCase()),
            );
          },
          onError: caught => {
            setShowGrant(false);
            toast.error(errorMessage(caught));
          },
        },
      );
    },
    [activePlan?.id, setEntitlement, toast, userId, words],
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
          title={error ? words.loadFailed : words.notFound}
          message={error ? words.loadFailedMessage : words.notFoundMessage}
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
          label={words.people}
          action={
            user.role === 'admin' ? (
              <AdminTag label={words.admin} tone="success" />
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
              {user.full_name || words.reader}
            </Display>
            <Text size={12} leading={1.35} tone="muted">
              {[
                user.email,
                user.phone,
                user.country,
                words.joined(formatDate(user.created_at)),
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
              {user.store ?? words.manual}
            </Label>
          </View>

          <Text size={13} leading={1.5}>
            {access.sentence}
          </Text>

          <View style={styles.accessActions}>
            <View style={styles.grow}>
              <AdminButton
                label={words.grantAccess}
                variant="secondary"
                compact
                loading={setEntitlement.isPending && showGrant}
                onPress={() => setShowGrant(true)}
              />
            </View>
            <View style={styles.grow}>
              <AdminButton
                label={words.emailReader}
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
                {words.grantsUse(activePlan?.name ?? words.first)}
              </Text>
              <AdminTextAction
                label={words.change}
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
            label={words.dayStreak}
            value={data?.streak?.current_streak ?? 0}
            tone="success"
          />
          <AdminStat label={words.started} value={user.books_started} />
          <AdminStat label={words.finished} value={user.books_finished} />
          <AdminStat label={words.downloads} value={user.downloads_count} />
        </AdminStatRow>

        {reading.length > 0 ? (
          <AdminRowGroup title={words.readingNow}>
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
                    {words.readingLine(
                      Math.round(entry.progress * 100),
                      entry.current_page,
                      formatRelative(entry.last_read_at),
                    )}
                  </Text>
                </View>
              </View>
            ))}
          </AdminRowGroup>
        ) : null}

        {downloads.length > 0 ? (
          <AdminRowGroup title={words.downloads}>
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
                {words.cannotChangeOwnRole}
              </Text>
            ) : (
              <AdminToggleRow
                label={words.makeAdmin}
                value={user.role === 'admin'}
                disabled={setRole.isPending}
                onValueChange={next => setConfirmRole(next ? 'admin' : 'user')}
              />
            )}
          </View>

          {user.is_subscriber ? (
            <View style={styles.actionRow}>
              <Text size={14} leading={1.2} tone="danger" style={styles.grow}>
                {words.revokeAccess}
              </Text>
              <AdminOutlineButton
                label={words.revoke}
                small
                destructive
                fullWidth={false}
                onPress={() => setConfirmRevoke(true)}
              />
            </View>
          ) : null}
        </AdminRowGroup>

        <Text size={11.5} leading={1.45} tone="faint">
          {words.storeNote}
        </Text>
      </ScrollView>

      <AdminPickerSheet
        visible={showGrant}
        title={words.grantForHowLong}
        searchable={false}
        items={GRANT_OPTIONS.map(option => ({
          id: option.id,
          label: words.grants[option.id],
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
        title={words.plan}
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
        title={words.revokeTitle}
        message={words.revokeMessage}
        consequences={words.revokeConsequences}
        confirmLabel={words.revoke}
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
                toast.success(words.accessRevoked);
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
        title={confirmRole === 'admin' ? words.grantAdmin : words.removeAdmin}
        message={
          confirmRole === 'admin'
            ? words.grantAdminMessage
            : words.removeAdminMessage
        }
        consequences={
          confirmRole === 'admin'
            ? words.grantAdminConsequences
            : words.removeAdminConsequences
        }
        confirmLabel={confirmRole === 'admin' ? words.grant : words.remove}
        cancelLabel={words.cancel}
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
                    ? words.adminGranted
                    : words.adminRemoved,
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
  const words = strings().adminPeople.user;
  const plan = user.plan_name ?? planName ?? words.premium;
  const status = user.entitlement_status;

  if (status === 'billing_issue' || status === 'grace') {
    return {
      eyebrow: words.accessEyebrow(words.statuses[status]),
      sentence: words.paymentSentence(plan, formatCountdown(user.expires_at)),
      tone: 'warning',
    };
  }

  if (user.is_subscriber) {
    return {
      eyebrow: words.accessEyebrow(
        status ? words.statuses[status] : words.accessActive,
      ),
      sentence: user.expires_at
        ? words.renewingSentence(plan, formatDate(user.expires_at))
        : words.noEndSentence(plan),
      tone: 'active',
    };
  }

  return {
    eyebrow: words.accessFree,
    sentence: words.freeSentence,
    tone: 'none',
  };
}

/** The screen frame, reused by the loading and error states. */
const Shell = memo(function Shell({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const s = useStrings();

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AdminBackLink label={s.adminPeople.user.people} />
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
