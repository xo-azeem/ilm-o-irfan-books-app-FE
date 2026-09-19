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
import { useStrings } from '@/i18n';
import { strings } from '@/i18n/strings';

type Filter = Extract<AdminDeletionFilter, string>;

type FilterChip = 'open' | 'completed' | 'rejected' | 'cancelled';

const FILTER_VALUES: FilterChip[] = [
  'open',
  'completed',
  'rejected',
  'cancelled',
];

const STATUS_TONE: Record<DeletionRequestStatus, AdminTagTone> = {
  pending: 'warning',
  approved: 'danger',
  processing: 'danger',
  failed: 'warning',
  completed: 'neutral',
  rejected: 'neutral',
  cancelled: 'neutral',
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
  const words = strings().adminPeople.deletions;
  const status = row.snapshot.entitlementStatus;
  if (!status || status === 'expired') {
    return words.noMembership;
  }
  const parts = [row.snapshot.planName ?? words.membership, status];
  if (row.snapshot.expiresAt) {
    parts.push(words.until(formatDate(row.snapshot.expiresAt)));
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
  const s = useStrings();
  const words = s.adminPeople.deletions;
  const tag = {
    label: words.statuses[row.status],
    tone: STATUS_TONE[row.status],
  };
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
          {words.requested(
            formatRelative(row.requestedAt),
            formatDate(row.requestedAt),
          )}
        </Text>
        <Text size={12} tone="muted">
          {membershipLine(row)}
        </Text>
        {row.status === 'approved' ? (
          <Text size={12} tone={isDue(row) ? 'gold' : 'muted'}>
            {isDue(row)
              ? words.dueNow
              : words.runsAfter(formatDate(row.scheduledFor))}
          </Text>
        ) : null}
        {row.decidedAt ? (
          <Text size={12} tone="muted">
            {row.status === 'rejected' ? words.declined : words.decided}{' '}
            {formatRelative(row.decidedAt)}
            {row.decidedByEmail ? words.by(row.decidedByEmail) : ''}
          </Text>
        ) : null}
        {row.completedAt ? (
          <Text size={12} tone="muted">
            {words.deletedOn(formatDate(row.completedAt))}
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
          {words.note(row.decisionNote)}
        </Text>
      ) : null}

      {row.status === 'failed' && row.lastError ? (
        <Text size={12.5} tone="gold">
          {row.lastError}
        </Text>
      ) : null}

      {decidable && blocker ? (
        <Text size={12.5} tone="gold">
          {words.cannotApprove(blocker.message)}
        </Text>
      ) : null}

      {decidable ? (
        <View style={styles.actions}>
          <AdminButton
            label={
              row.status === 'failed'
                ? words.approveAgain
                : words.approveRunsIn(graceDays)
            }
            variant="destructive"
            compact
            onPress={() => onApprove(row, false)}
            disabled={busy}
            blockedReason={blocker ? blocker.code.replace(/_/g, ' ') : null}
          />
          <View style={styles.actionRow}>
            <AdminButton
              label={words.decline}
              variant="ghost"
              compact
              fullWidth={false}
              onPress={() => onReject(row)}
              disabled={busy}
            />
            {!blocker ? (
              <AdminButton
                label={words.approveDeleteNow}
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
          label={words.openReader}
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
  const s = useStrings();
  const words = s.adminPeople.deletions;
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
    return FILTER_VALUES.map(value => ({
      value,
      label: words.filters[value],
      count:
        value === 'open'
          ? (counts.pending ?? 0) +
            (counts.approved ?? 0) +
            (counts.processing ?? 0) +
            (counts.failed ?? 0)
          : counts[value as DeletionRequestStatus],
    }));
  }, [list.data?.counts, words]);

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
                ? words.approvedNextTick
                : words.approvedAfter(graceDays)
              : words.declinedTold,
          );
        },
        onError: caught => toast.error(errorMessage(caught)),
      },
    );
  }, [decide, decision, graceDays, note, toast, words]);

  const runNow = useCallback(() => {
    run.mutate(undefined, {
      onSuccess: result => {
        if (result.claimed === 0) {
          toast.info(words.nothingDue);
          return;
        }
        toast.success(words.runResult(result.completed, result.failed));
      },
      onError: caught => toast.error(errorMessage(caught)),
    });
  }, [run, toast, words]);

  return (
    <>
      <View style={styles.controls}>
        <AdminChipRow options={chips} value={filter} onChange={setFilter} />
        {filter === 'open' ? (
          <AdminButton
            label={
              run.isPending
                ? words.running
                : dueCount > 0
                  ? words.runNowDue(dueCount)
                  : words.runNow
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
            message={words.loadFailed}
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
              title={filter === 'open' ? words.noOpen : words.nothingHere}
              message={
                filter === 'open' ? words.noOpenMessage : words.decidedStay
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
              ? words.approveAndDeleteNow
              : words.approveDeletion
            : words.declineRequest
        }
        footer={
          <AdminButton
            label={
              decide.isPending
                ? words.saving
                : decision?.approve
                  ? decision.immediate
                    ? words.approveNextRun
                    : words.approveAfterDays(graceDays)
                  : words.decline
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
                ? words.immediateSentence(
                    decision.row.email ?? words.thisReader,
                  )
                : words.graceSentence(
                    decision?.row.email ?? words.thisReader,
                    graceDays,
                  )
              : words.declineSentence(decision?.row.email ?? words.theReader)}
          </Text>
          <AdminField
            label={
              decision?.approve ? words.noteOptional : words.reasonOptional
            }
            value={note}
            onChangeText={value => setNote(value.slice(0, 1000))}
            placeholder={
              decision?.approve
                ? words.notePlaceholder
                : words.reasonPlaceholder
            }
            multiline
          />
          <Text size={12} tone="muted">
            {words.auditNote}
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
