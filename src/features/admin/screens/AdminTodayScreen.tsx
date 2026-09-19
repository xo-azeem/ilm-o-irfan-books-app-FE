import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ChartNoAxesColumn,
  FileWarning,
  LayoutGrid,
  Smartphone,
  Plus,
  Search,
  TriangleAlert,
  User,
  UserLock,
  UserX,
  Wrench,
  type LucideIcon,
} from 'lucide-react-native';

import { Screen } from '@/components/layout';
import { AdminStatsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { Icon, Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import { errorMessage } from '@/features/admin/components/AdminToast';
import {
  ADMIN_GUTTER,
  AdminAttentionGroup,
  AdminAttentionRow,
  AdminErrorState,
  AdminEyebrow,
  AdminNavRow,
  AdminPageTitle,
  AdminRowGroup,
  AdminSectionHeader,
  AdminStat,
  AdminStatRow,
  AdminTag,
  AdminTextAction,
  useAdminRefresh,
} from '@/features/admin/components/AdminUi';
import { formatRelative } from '@/features/admin/utils/format';
import {
  useAdminAnalytics,
  useAdminDeletionRequests,
  useAdminSettings,
  useAdminStats,
  useAuditLog,
  useStorageAudit,
} from '@/hooks/useAdmin';
import { useAuthStore } from '@/stores/authStore';
import type {
  AdminDeletionRequest,
  AuditEntry,
  TimeSeriesPoint,
} from '@/services/admin';
import { useTheme } from '@/theme/ThemeContext';

import type {
  AdminLibraryStackParamList,
  AdminPeopleStackParamList,
  AdminSystemStackParamList,
  AdminTabParamList,
} from '../navigation/types';
import { useDateLocale, useStrings, type Strings } from '@/i18n';

type Nav = {
  navigate: <T extends keyof AdminTabParamList>(
    screen: T,
    params?: AdminTabParamList[T],
  ) => void;
};

/** The pushable shape of a tab's params — a screen inside it, never raw state. */
type ScreenTarget<L extends object> = {
  [K in keyof L]: { screen: K; params?: L[K] };
}[keyof L];

/**
 * Today.
 *
 * The same data the old Overview carried, ordered as a to-do list: what is
 * blocked, what you can start, how the week went, what changed. Numbers come
 * last because none of them ask anything of you.
 */
export function AdminTodayScreen() {
  const s = useStrings();
  const words = s.admin.today;
  const locale = useDateLocale();
  const navigation = useNavigation() as unknown as Nav;
  const email = useAuthStore(state => state.email);
  const setViewingAsReader = useAuthStore(state => state.setViewingAsReader);

  const stats = useAdminStats();
  // Fourteen days, so this week can be stated against the one before it — a
  // bare "128 new readers" says nothing without the number it replaced.
  const analytics = useAdminAnalytics(14);
  const audit = useAuditLog(null);
  // The two queues that run on somebody else's clock: a reader waiting on a
  // decision about their account, and a title pointing at a file that is
  // gone. Both are cached with their own screens, so once either has been
  // opened this costs nothing extra.
  const deletions = useAdminDeletionRequests('open');
  const storage = useStorageAudit();
  // The two switches that are easy to leave on. An admin is never held out
  // by them, which is exactly why this screen has to say so — from inside
  // the tool nothing else looks any different.
  const settings = useAdminSettings();
  const maintenanceOn = settings.data?.maintenance_mode === true;
  const signupsClosed = settings.data?.signup_enabled === false;

  const refreshProps = useAdminRefresh(stats.isRefetching, () => {
    void stats.refetch();
    void analytics.refetch();
    void audit.refetch();
    void deletions.refetch();
    void storage.refetch();
    void settings.refetch();
  });

  const recent = audit.data?.pages[0]?.rows.slice(0, 3) ?? [];

  const missingPdf = stats.data?.missing_pdf_count ?? 0;
  const missingCover = stats.data?.missing_cover_count ?? 0;
  const blocked = missingPdf + missingCover;

  const deletionCounts = deletions.data?.counts ?? {};
  const awaitingDecision = deletionCounts.pending ?? 0;
  const failedRuns = deletionCounts.failed ?? 0;
  const dueNow = useMemo(
    () => (deletions.data?.rows ?? []).filter(isDueToRun).length,
    [deletions.data?.rows],
  );
  const deletionAttention = awaitingDecision + failedRuns + dueNow;

  const brokenFiles = storage.data?.broken.length ?? 0;

  const attentionCount =
    (maintenanceOn ? 1 : 0) +
    (signupsClosed ? 1 : 0) +
    (deletionAttention > 0 ? 1 : 0) +
    (blocked > 0 ? 1 : 0) +
    (brokenFiles > 0 ? 1 : 0);

  const readers = useWeek(analytics.data?.signups);
  const sessions = useWeek(analytics.data?.reads);
  const downloads = useWeek(analytics.data?.downloads);

  // Every jump into another tab's stack carries `initial: false`. Without it
  // a tab that has never been opened would start its stack *on* the editor,
  // with no list beneath it — back would do nothing and the hardware back
  // button would bounce out to Today.
  const openLibrary = useCallback(
    (target: ScreenTarget<AdminLibraryStackParamList>) =>
      navigation.navigate(ADMIN_ROUTES.LIBRARY, {
        ...target,
        initial: false,
      } as AdminTabParamList['AdminLibrary']),
    [navigation],
  );
  const openSystem = useCallback(
    (target: ScreenTarget<AdminSystemStackParamList>) =>
      navigation.navigate(ADMIN_ROUTES.SYSTEM, {
        ...target,
        initial: false,
      } as AdminTabParamList['AdminSystem']),
    [navigation],
  );
  const openPeople = useCallback(
    (target: ScreenTarget<AdminPeopleStackParamList>) =>
      navigation.navigate(ADMIN_ROUTES.PEOPLE, {
        ...target,
        initial: false,
      } as AdminTabParamList['AdminPeople']),
    [navigation],
  );

  return (
    <Screen padding={ADMIN_GUTTER} gap={16} scrollViewProps={refreshProps}>
      <AdminPageTitle
        title={greeting(s)}
        subtitle={`${email || s.admin.ui.admin} · ${today(locale)}`}
        action={
          <IconTile
            icon={Search}
            label={words.searchLibrary}
            onPress={() =>
              openLibrary({
                screen: ADMIN_ROUTES.LIBRARY_HOME,
                params: { segment: 'books' },
              })
            }
          />
        }
      />

      {/* What is blocked, first. Nothing else on this screen asks for a tap.
          People before files: a reader waiting on a decision about their
          account is on a legal clock; a draft without a PDF is not. */}
      {attentionCount > 0 ? (
        <AdminAttentionGroup title={words.needsYou(attentionCount)}>
          {maintenanceOn ? (
            <AdminAttentionRow
              icon={Wrench}
              title={words.maintenanceOn}
              detail={words.maintenanceOnDetail}
              actionLabel={s.admin.ui.settings}
              onPress={() => openSystem({ screen: ADMIN_ROUTES.SETTINGS })}
            />
          ) : null}
          {signupsClosed ? (
            <AdminAttentionRow
              icon={UserLock}
              title={words.signupsClosed}
              detail={words.signupsClosedDetail}
              actionLabel={s.admin.ui.settings}
              onPress={() => openSystem({ screen: ADMIN_ROUTES.SETTINGS })}
            />
          ) : null}
          {deletionAttention > 0 ? (
            <AdminAttentionRow
              icon={UserX}
              title={describeDeletions(awaitingDecision, dueNow, failedRuns, s)}
              detail={
                awaitingDecision > 0
                  ? words.deletionsAwaitingDetail
                  : dueNow > 0
                    ? words.deletionsDueDetail
                    : words.deletionsFailedDetail
              }
              actionLabel={s.admin.ui.review}
              onPress={() =>
                openPeople({
                  screen: ADMIN_ROUTES.PEOPLE_HOME,
                  params: { segment: 'deletions' },
                })
              }
            />
          ) : null}
          {blocked > 0 ? (
            <AdminAttentionRow
              icon={TriangleAlert}
              title={words.blocked(blocked)}
              detail={describeBlockers(missingPdf, missingCover, s)}
              actionLabel={s.admin.ui.fix}
              onPress={() =>
                openLibrary({
                  screen: ADMIN_ROUTES.LIBRARY_HOME,
                  params: { segment: 'books', status: 'incomplete' },
                })
              }
            />
          ) : null}
          {brokenFiles > 0 ? (
            <AdminAttentionRow
              icon={FileWarning}
              title={words.brokenFiles(brokenFiles)}
              detail={words.brokenFilesDetail}
              actionLabel={s.admin.ui.open}
              onPress={() => openSystem({ screen: ADMIN_ROUTES.STORAGE })}
            />
          ) : null}
        </AdminAttentionGroup>
      ) : null}

      {/* Then what you can start. */}
      <View style={styles.block}>
        <AdminEyebrow>{words.create}</AdminEyebrow>
        <View style={styles.createRow}>
          <CreateTile
            icon={Plus}
            label={words.book}
            accent
            onPress={() =>
              openLibrary({ screen: ADMIN_ROUTES.BOOK_EDITOR, params: {} })
            }
          />
          <CreateTile
            icon={User}
            label={words.author}
            onPress={() =>
              openLibrary({ screen: ADMIN_ROUTES.AUTHOR_EDITOR, params: {} })
            }
          />
          <CreateTile
            icon={LayoutGrid}
            label={words.shelf}
            onPress={() =>
              openLibrary({
                screen: ADMIN_ROUTES.COLLECTION_EDITOR,
                params: {},
              })
            }
          />
          <CreateTile
            icon={ChartNoAxesColumn}
            label={words.report}
            onPress={() => openSystem({ screen: ADMIN_ROUTES.ANALYTICS })}
          />
        </View>
      </View>

      {/* Then the app itself. The admin tool shows the catalogue as rows and
          counts; this is the only way to see what a reader sees — the Home
          feed, search, a book page, the reader — with this same account. The
          way back is on the profile tab over there, and the row says so. */}
      <AdminRowGroup title={words.readerView}>
        <AdminNavRow
          label={words.openAsReader}
          sublabel={words.openAsReaderHint}
          Icon={Smartphone}
          onPress={() => setViewingAsReader(true)}
        />
      </AdminRowGroup>

      {/* Then the week. */}
      <View style={styles.block}>
        <AdminSectionHeader
          title={words.last7Days}
          action={
            <AdminTextAction
              label={words.seeAnalytics}
              size={11.5}
              onPress={() => openSystem({ screen: ADMIN_ROUTES.ANALYTICS })}
            />
          }
        />

        {analytics.isLoading ? (
          <AdminStatsSkeleton />
        ) : analytics.error ? (
          <AdminErrorState
            message={errorMessage(analytics.error)}
            onRetry={() => void analytics.refetch()}
          />
        ) : (
          <AdminStatRow>
            <AdminStat
              label={words.newReaders}
              value={readers.total}
              hint={readers.delta}
              tone="success"
            />
            <AdminStat
              label={words.readingSessions}
              value={sessions.total}
              hint={sessions.delta}
            />
            <AdminStat
              label={words.downloads}
              value={downloads.total}
              hint={downloads.delta}
            />
          </AdminStatRow>
        )}
      </View>

      {/* Then what changed, and by whom. */}
      <AdminRowGroup
        title={words.recentChanges}
        action={
          <AdminTextAction
            label={words.viewAll}
            size={11.5}
            onPress={() => openSystem({ screen: ADMIN_ROUTES.HISTORY })}
          />
        }
      >
        {recent.length === 0 ? (
          <View style={styles.emptyActivity}>
            <Text size={12.5} leading={1.4} tone="muted">
              {words.noChangesYet}
            </Text>
          </View>
        ) : (
          recent.map(entry => <ChangeRow key={entry.id} entry={entry} />)
        )}
      </AdminRowGroup>
    </Screen>
  );
}

/** Totals for the last seven days, and how they compare with the seven before. */
function useWeek(points: TimeSeriesPoint[] | undefined) {
  const s = useStrings();
  return useMemo(() => {
    const series = points ?? [];
    const sum = (slice: TimeSeriesPoint[]) =>
      slice.reduce((total, point) => total + point.value, 0);

    const current = sum(series.slice(-7));
    const previous = sum(series.slice(-14, -7));

    if (series.length < 14 || previous === 0) {
      return { total: current, delta: undefined };
    }

    const change = Math.round(((current - previous) / previous) * 100);
    return {
      total: current,
      delta: s.admin.today.onLastWeek(
        `${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change)}%`,
      ),
    };
  }, [points, s]);
}

function greeting(s: Strings): string {
  const hour = new Date().getHours();
  if (hour < 12) return s.admin.today.morning;
  if (hour < 18) return s.admin.today.afternoon;
  return s.admin.today.evening;
}

function today(locale: string): string {
  return new Date().toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

/** An approved request whose grace period has run out and is waiting on a tick. */
function isDueToRun(row: AdminDeletionRequest): boolean {
  return (
    row.status === 'approved' &&
    row.scheduledFor !== null &&
    new Date(row.scheduledFor).getTime() <= Date.now()
  );
}

/** The people first, then the runs — one sentence for whichever is waiting. */
function describeDeletions(
  awaiting: number,
  due: number,
  failed: number,
  s: Strings,
): string {
  if (awaiting > 0) {
    return s.admin.today.deletionsAwaiting(awaiting);
  }
  if (due > 0) {
    return s.admin.today.deletionsDue(due);
  }
  return s.admin.today.deletionsFailed(failed);
}

/** "2 missing a PDF · 1 missing a cover" — the sentence, not the counter. */
function describeBlockers(
  missingPdf: number,
  missingCover: number,
  s: Strings,
): string {
  const parts: string[] = [];
  if (missingPdf > 0) parts.push(s.admin.today.missingPdf(missingPdf));
  if (missingCover > 0) parts.push(s.admin.today.missingCover(missingCover));
  return parts.join(' · ');
}

const IconTile = memo(function IconTile({
  icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconTile,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <Icon icon={icon} size={16} tone="action" strokeWidth={1.9} />
    </Pressable>
  );
});

/** One of the four things worth starting from a standing start. */
const CreateTile = memo(function CreateTile({
  icon,
  label,
  accent = false,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  /** The primary create — a book — carries a green rim. */
  accent?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const s = useStrings();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={s.admin.today.newTile(label)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.createTile,
        {
          backgroundColor: colors.surface,
          borderColor: accent ? colors.selectedBorder : colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <Icon
        icon={icon}
        size={17}
        color={accent ? colors.primaryBright : colors.actionIcon}
        strokeWidth={accent ? 2 : 1.9}
      />
      <Text
        size={10.5}
        leading={1}
        weight="500"
        tone={accent ? 'ink' : 'soft'}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
});

const ChangeRow = memo(function ChangeRow({ entry }: { entry: AuditEntry }) {
  const s = useStrings();
  return (
    <View style={styles.changeRow}>
      <AdminTag
        label={s.admin.ui.actions[entry.action]}
        tone={
          entry.action === 'delete'
            ? 'danger'
            : entry.action === 'insert'
              ? 'success'
              : 'neutral'
        }
      />
      <View style={styles.changeBody}>
        <Text size={13} leading={1.2} numberOfLines={1}>
          {entry.entity_label ?? entry.entity_type}
        </Text>
        <Text size={10.5} leading={1.2} tone="faint" numberOfLines={1}>
          {`${entry.entity_type} · ${entry.actor_email ?? s.admin.ui.system}`}
        </Text>
      </View>
      <Text size={10.5} leading={1} tone="dim">
        {formatRelative(entry.created_at)}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  block: {
    gap: 9,
  },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  createRow: {
    flexDirection: 'row',
    gap: 8,
  },
  createTile: {
    flex: 1,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  changeBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  emptyActivity: {
    padding: 14,
  },
  pressed: {
    opacity: 0.72,
  },
});
