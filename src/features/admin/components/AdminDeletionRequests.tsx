import { memo, useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Play } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Sheet, Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import { AdminChipRow } from '@/features/admin/components/AdminControls';
import { AdminMenuSkeleton } from '@/features/admin/components/AdminSkeletons';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  ADMIN_GUTTER,
  AdminButton,
  AdminCard,
  AdminEmpty,
  AdminErrorState,
  AdminField,
  AdminTag,
  AdminTextAction,
  type AdminTagTone,
} from '@/features/admin/components/AdminUi';
import { formatDate, formatRelative } from '@/features/admin/utils/format';
import {
  useAdminDeletionRequests,
  useDecideDeletionRequest,
  useRunDueDeletions,
} from '@/hooks/useAdmin';
import type {
  AdminDeletionFilter,
  AdminDeletionRequest,
} from '@/services/admin';
import type { DeletionRequestStatus } from '@/services/accountDeletion';

import type { AdminPeopleStackParamList } from '../navigation/types';

type Filter = Extract<AdminDeletionFilter, string>;

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'completed', label: 'Deleted' },
  { value: 'rejected', label: 'Declined' },
  { value: 'cancelled', label: 'Withdrawn' },
];

const STATUS_TAG: Record<
  DeletionRequestStatus,
  { label: string; tone: AdminTagTone }
> = {
  pending: { label: 'Awaiting review', tone: 'warning' },
  approved: { label: 'Approved', tone: 'danger' },
  processing: { label: 'Deleting', tone: 'danger' },
  failed: { label: 'On hold', tone: 'warning' },
  completed: { label: 'Deleted', tone: 'neutral' },
  rejected: { label: 'Declined', tone: 'neutral' },
  cancelled: { label: 'Withdrawn', tone: 'neutral' },
};

function isDue(row: AdminDeletionRequest): boolean {
  return (
    row.status === 'approved' &&
    Boolean(row.scheduledFor) &&
    new Date(row.scheduledFor as string).getTime() <= Date.now()
  );
}

/**
 * The membership as it stood when the reader asked, one line.
 *
 * The blockers are the live answer and are shown separately; this is context
 * — "they had a cancelled monthly paid through the 30th" — for the operator
 * deciding whether the timing is kind.
 */
function membershipLine(row: AdminDeletionRequest): string {
  const status = row.snapshot.entitlementStatus;
  if (!status || status === 'expired') {
    return 'No membership';
  }
  const parts = [row.snapshot.planName ?? 'Membership', status];
  if (row.snapshot.expiresAt) {
    parts.push(`until ${formatDate(row.snapshot.expiresAt)}`);
  }
  if (row.snapshot.store) {
    parts.push(row.snapshot.store.replace('_', ' '));
  }
  return parts.join(' · ');
}

const RequestCard = memo(function RequestCard({
  row,
  graceDays,
  onApprove,
  onReject,
  onOpenReader,
  busy,
}: {
  row: AdminDeletionRequest;
  graceDays: number;
  onApprove: (row: AdminDeletionRequest, immediate: boolean) => void;
  onReject: (row: AdminDeletionRequest) => void;
  onOpenReader: (userId: string) => void;
  busy: boolean;
}) {
  const tag = STATUS_TAG[row.status];
  const blocker = row.blockers[0];
  const decidable = row.status === 'pending' || row.status === 'failed';

  return (
    <AdminCard>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text size={14.5} weight="600" numberOfLines={1}>
            {row.fullName || row.email || row.userId}
          </Text>
          {row.email && row.fullName ? (
            <Text size={12} tone="muted" numberOfLines={1}>
              {row.email}
            </Text>
          ) : null}
        </View>
        <AdminTag label={tag.label} tone={tag.tone} />
      </View>

      <View style={styles.meta}>
        <Text size={12} tone="muted">
          Requested {formatRelative(row.requestedAt)} ·{' '}
          {formatDate(row.requestedAt)}
        </Text>
        <Text size={12} tone="muted">
          {membershipLine(row)}
        </Text>
        {row.status === 'approved' ? (
          <Text size={12} tone={isDue(row) ? 'gold' : 'muted'}>
            {isDue(row)
              ? 'Due now — runs on the next tick or Run now'
              : `Runs after ${formatDate(row.scheduledFor)}`}
          </Text>
        ) : null}
        {row.decidedAt ? (
          <Text size={12} tone="muted">
            {row.status === 'rejected' ? 'Declined' : 'Decided'}{' '}
            {formatRelative(row.decidedAt)}
            {row.decidedByEmail ? ` by ${row.decidedByEmail}` : ''}
          </Text>
        ) : null}
        {row.completedAt ? (
          <Text size={12} tone="muted">
            Deleted {formatDate(row.completedAt)}
          </Text>
        ) : null}
      </View>

      {row.reason ? (
        <Text size={13} tone="soft" style={styles.reason}>
          “{row.reason}”
        </Text>
      ) : null}

      {row.decisionNote ? (
        <Text size={12.5} tone="soft">
          Note: {row.decisionNote}
        </Text>
      ) : null}

      {row.status === 'failed' && row.lastError ? (
        <Text size={12.5} tone="gold">
          {row.lastError}
        </Text>
      ) : null}

      {decidable && blocker ? (
        <Text size={12.5} tone="gold">
          Cannot approve yet: {blocker.message}
        </Text>
      ) : null}

      {decidable ? (
        <View style={styles.actions}>
          <AdminButton
            label={
              row.status === 'failed'
                ? 'Approve again'
                : `Approve · runs in ${graceDays} days`
            }
            variant="destructive"
            compact
            onPress={() => onApprove(row, false)}
            disabled={busy}
            blockedReason={blocker ? blocker.code.replace(/_/g, ' ') : null}
          />
          <View style={styles.actionRow}>
            <AdminButton
              label="Decline"
              variant="ghost"
              compact
              fullWidth={false}
              onPress={() => onReject(row)}
              disabled={busy}
            />
            {!blocker ? (
              <AdminButton
                label="Approve · delete now"
                variant="ghostDanger"
                compact
                fullWidth={false}
                onPress={() => onApprove(row, true)}
                disabled={busy}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      {row.profileExists ? (
        <AdminTextAction
          label="Open reader"
          onPress={() => onOpenReader(row.userId)}
        />
      ) : null}
    </AdminCard>
  );
});

/**
 * Deletion requests — the People tab's third segment.
 *
 * Reads the backend's list, shows each open row's live blockers, and offers
 * the decision. Approval schedules the run after the grace period (the
 * reader is told, and may still withdraw); "delete now" skips it. "Run now"
 * executes whatever is due without waiting for the database's tick.
 */
export function AdminDeletionRequests({
  bottomPadding,
}: {
  bottomPadding: number;
}) {
  const toast = useToast();
  const navigation =
    useNavigation<NativeStackNavigationProp<AdminPeopleStackParamList>>();
  const [filter, setFilter] = useState<Filter>('open');
  const list = useAdminDeletionRequests(filter);
  const decide = useDecideDeletionRequest();
  const run = useRunDueDeletions();

  const [decision, setDecision] = useState<{
    row: AdminDeletionRequest;
    approve: boolean;
    immediate: boolean;
  } | null>(null);
  const [note, setNote] = useState('');

  const rows = useMemo(() => list.data?.rows ?? [], [list.data?.rows]);
  const graceDays = list.data?.graceDays ?? 7;
  const dueCount = useMemo(() => rows.filter(isDue).length, [rows]);

  const chips = useMemo(() => {
    const counts = list.data?.counts ?? {};
    return FILTERS.map(option => ({
      ...option,
      count:
        option.value === 'open'
          ? (counts.pending ?? 0) +
            (counts.approved ?? 0) +
            (counts.processing ?? 0) +
            (counts.failed ?? 0)
          : counts[option.value as DeletionRequestStatus],
    }));
  }, [list.data?.counts]);

  const openReader = useCallback(
    (userId: string) =>
      navigation.navigate(ADMIN_ROUTES.USER_DETAIL, { userId }),
    [navigation],
  );

  const startApprove = useCallback(
    (row: AdminDeletionRequest, immediate: boolean) => {
      setNote('');
      setDecision({ row, approve: true, immediate });
    },
    [],
  );

  const startReject = useCallback((row: AdminDeletionRequest) => {
    setNote('');
    setDecision({ row, approve: false, immediate: false });
  }, []);

  const confirmDecision = useCallback(() => {
    if (!decision) {
      return;
    }
    const { row, approve, immediate } = decision;
    decide.mutate(
      { requestId: row.id, approve, note, immediate },
      {
        onSuccess: () => {
          setDecision(null);
          toast.success(
            approve
              ? immediate
                ? 'Approved — runs on the next tick, or press Run now.'
                : `Approved — runs after ${graceDays} days unless withdrawn.`
              : 'Declined. The reader has been told.',
          );
        },
        onError: caught => toast.error(errorMessage(caught)),
      },
    );
  }, [decide, decision, graceDays, note, toast]);

  const runNow = useCallback(() => {
    run.mutate(undefined, {
      onSuccess: result => {
        if (result.claimed === 0) {
          toast.info('Nothing was due.');
          return;
        }
        toast.success(
          `${result.completed} deleted${
            result.failed ? `, ${result.failed} on hold` : ''
          }.`,
        );
      },
      onError: caught => toast.error(errorMessage(caught)),
    });
  }, [run, toast]);

  return (
    <>
      <View style={styles.controls}>
        <AdminChipRow options={chips} value={filter} onChange={setFilter} />
        {filter === 'open' ? (
          <AdminButton
            label={
              run.isPending
                ? 'Running…'
                : dueCount > 0
                  ? `Run now · ${dueCount} due`
                  : 'Run now'
            }
            Icon={Play}
            variant="secondary"
            compact
            onPress={runNow}
            loading={run.isPending}
          />
        ) : null}
      </View>

      {list.isPending ? (
        <View style={styles.gutter}>
          <AdminMenuSkeleton count={3} height={150} />
        </View>
      ) : list.error ? (
        <View style={styles.gutter}>
          <AdminErrorState
            message="Deletion requests could not be loaded."
            detail={errorMessage(list.error)}
            onRetry={() => void list.refetch()}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.grow}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: bottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {rows.length === 0 ? (
            <AdminEmpty
              title={
                filter === 'open' ? 'No open requests' : 'Nothing here yet'
              }
              message={
                filter === 'open'
                  ? 'Readers ask to delete their account from Profile → Privacy & security. Requests land here for review.'
                  : 'Decided requests stay on record here.'
              }
            />
          ) : (
            rows.map(row => (
              <RequestCard
                key={row.id}
                row={row}
                graceDays={graceDays}
                onApprove={startApprove}
                onReject={startReject}
                onOpenReader={openReader}
                busy={decide.isPending || run.isPending}
              />
            ))
          )}
        </ScrollView>
      )}

      <Sheet
        visible={decision != null}
        onClose={() => setDecision(null)}
        title={
          decision?.approve
            ? decision.immediate
              ? 'Approve and delete now'
              : 'Approve deletion'
            : 'Decline request'
        }
        footer={
          <AdminButton
            label={
              decide.isPending
                ? 'Saving…'
                : decision?.approve
                  ? decision.immediate
                    ? 'Approve · delete on next run'
                    : `Approve · delete after ${graceDays} days`
                  : 'Decline'
            }
            variant={decision?.approve ? 'destructive' : 'primary'}
            onPress={confirmDecision}
            loading={decide.isPending}
          />
        }
      >
        <View style={styles.sheetBody}>
          <Text size={13.5} tone="soft">
            {decision?.approve
              ? decision.immediate
                ? `${decision.row.email ?? 'This reader'} will be deleted on the next run — no grace period. They are notified now.`
                : `${decision?.row.email ?? 'This reader'} is notified now and can still withdraw for ${graceDays} days. After that their account, membership record, library and history are removed for good.`
              : `${decision?.row.email ?? 'The reader'} keeps their account and is told it was declined. A short reason helps.`}
          </Text>
          <AdminField
            label={decision?.approve ? 'Note (optional)' : 'Reason (optional)'}
            value={note}
            onChangeText={value => setNote(value.slice(0, 1000))}
            placeholder={
              decision?.approve
                ? 'Anything the reader should know'
                : 'e.g. Please cancel your membership first'
            }
            multiline
          />
          <Text size={12} tone="muted">
            Every decision is written to the audit log.
          </Text>
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  controls: {
    paddingHorizontal: ADMIN_GUTTER,
    gap: 10,
    paddingBottom: 6,
  },
  gutter: {
    paddingHorizontal: ADMIN_GUTTER,
  },
  grow: {
    flex: 1,
  },
  list: {
    paddingHorizontal: ADMIN_GUTTER,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    flex: 1,
    gap: 2,
  },
  meta: {
    gap: 3,
  },
  reason: {
    fontStyle: 'italic',
  },
  actions: {
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sheetBody: {
    gap: 14,
  },
});
