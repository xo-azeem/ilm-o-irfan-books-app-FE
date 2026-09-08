import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ChartNoAxesColumn,
  LayoutGrid,
  Plus,
  Search,
  TriangleAlert,
  User,
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
import { useAdminAnalytics, useAdminStats, useAuditLog } from '@/hooks/useAdmin';
import { useAuthStore } from '@/stores/authStore';
import type { AuditEntry, TimeSeriesPoint } from '@/services/admin';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminTabParamList } from '../navigation/types';

type Nav = {
  navigate: <T extends keyof AdminTabParamList>(screen: T, params?: AdminTabParamList[T]) => void;
};

/**
 * Today.
 *
 * The same data the old Overview carried, ordered as a to-do list: what is
 * blocked, what you can start, how the week went, what changed. Numbers come
 * last because none of them ask anything of you.
 */
export function AdminTodayScreen() {
  const navigation = useNavigation() as unknown as Nav;
  const email = useAuthStore(state => state.email);

  const stats = useAdminStats();
  // Fourteen days, so this week can be stated against the one before it — a
  // bare "128 new readers" says nothing without the number it replaced.
  const analytics = useAdminAnalytics(14);
  const audit = useAuditLog(null);

  const refreshProps = useAdminRefresh(stats.isRefetching, () => {
    void stats.refetch();
    void analytics.refetch();
    void audit.refetch();
  });

  const recent = audit.data?.pages[0]?.rows.slice(0, 3) ?? [];

  const missingPdf = stats.data?.missing_pdf_count ?? 0;
  const missingCover = stats.data?.missing_cover_count ?? 0;
  const blocked = missingPdf + missingCover;

  const readers = useWeek(analytics.data?.signups);
  const sessions = useWeek(analytics.data?.reads);
  const downloads = useWeek(analytics.data?.downloads);

  const openLibrary = useCallback(
    (params?: AdminTabParamList['AdminLibrary']) =>
      navigation.navigate(ADMIN_ROUTES.LIBRARY, params),
    [navigation],
  );

  return (
    <Screen padding={ADMIN_GUTTER} gap={16} scrollViewProps={refreshProps}>
      <AdminPageTitle
        title={greeting()}
        subtitle={`${email || 'admin'} · ${today()}`}
        action={
          <IconTile
            icon={Search}
            label="Search the library"
            onPress={() =>
              openLibrary({ screen: ADMIN_ROUTES.LIBRARY_HOME, params: { segment: 'books' } })
            }
          />
        }
      />

      {/* What is blocked, first. Nothing else on this screen asks for a tap. */}
      {blocked > 0 ? (
        <AdminAttentionGroup title="Needs you · 1">
          <AdminAttentionRow
            icon={TriangleAlert}
            title={`${blocked} ${blocked === 1 ? 'title' : 'titles'} can't go live yet`}
            detail={describeBlockers(missingPdf, missingCover)}
            actionLabel="Fix"
            onPress={() =>
              openLibrary({
                screen: ADMIN_ROUTES.LIBRARY_HOME,
                params: { segment: 'books', status: 'incomplete' },
              })
            }
          />
        </AdminAttentionGroup>
      ) : null}

      {/* Then what you can start. */}
      <View style={styles.block}>
        <AdminEyebrow>Create</AdminEyebrow>
        <View style={styles.createRow}>
          <CreateTile
            icon={Plus}
            label="Book"
            accent
            onPress={() =>
              openLibrary({ screen: ADMIN_ROUTES.BOOK_EDITOR, params: {} })
            }
          />
          <CreateTile
            icon={User}
            label="Author"
            onPress={() =>
              openLibrary({ screen: ADMIN_ROUTES.AUTHOR_EDITOR, params: {} })
            }
          />
          <CreateTile
            icon={LayoutGrid}
            label="Shelf"
            onPress={() =>
              openLibrary({ screen: ADMIN_ROUTES.COLLECTION_EDITOR, params: {} })
            }
          />
          <CreateTile
            icon={ChartNoAxesColumn}
            label="Report"
            onPress={() =>
              navigation.navigate(ADMIN_ROUTES.SYSTEM, { screen: ADMIN_ROUTES.ANALYTICS })
            }
          />
        </View>
      </View>

      {/* Then the week. */}
      <View style={styles.block}>
        <AdminSectionHeader
          title="Last 7 days"
          action={
            <AdminTextAction
              label="See analytics"
              size={11.5}
              onPress={() =>
                navigation.navigate(ADMIN_ROUTES.SYSTEM, { screen: ADMIN_ROUTES.ANALYTICS })
              }
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
              label="New readers"
              value={readers.total}
              hint={readers.delta}
              tone="success"
            />
            <AdminStat label="Reading sessions" value={sessions.total} hint={sessions.delta} />
            <AdminStat label="Downloads" value={downloads.total} hint={downloads.delta} />
          </AdminStatRow>
        )}
      </View>

      {/* Then what changed, and by whom. */}
      <AdminRowGroup
        title="Recent changes"
        action={
          <AdminTextAction
            label="View all"
            size={11.5}
            onPress={() =>
              navigation.navigate(ADMIN_ROUTES.SYSTEM, { screen: ADMIN_ROUTES.HISTORY })
            }
          />
        }>
        {recent.length === 0 ? (
          <View style={styles.emptyActivity}>
            <Text size={12.5} leading={1.4} tone="muted">
              No admin changes recorded yet.
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
  return useMemo(() => {
    const series = points ?? [];
    const sum = (slice: TimeSeriesPoint[]) => slice.reduce((total, point) => total + point.value, 0);

    const current = sum(series.slice(-7));
    const previous = sum(series.slice(-14, -7));

    if (series.length < 14 || previous === 0) {
      return { total: current, delta: undefined };
    }

    const change = Math.round(((current - previous) / previous) * 100);
    return {
      total: current,
      delta: `${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change)}% on last week`,
    };
  }, [points]);
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function today(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

/** "2 missing a PDF · 1 missing a cover" — the sentence, not the counter. */
function describeBlockers(missingPdf: number, missingCover: number): string {
  const parts: string[] = [];
  if (missingPdf > 0) parts.push(`${missingPdf} missing a PDF`);
  if (missingCover > 0) parts.push(`${missingCover} missing a cover`);
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
      ]}>
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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`New ${label.toLowerCase()}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.createTile,
        {
          backgroundColor: colors.surface,
          borderColor: accent ? colors.selectedBorder : colors.border,
        },
        pressed && styles.pressed,
      ]}>
      <Icon
        icon={icon}
        size={17}
        color={accent ? colors.primaryBright : colors.actionIcon}
        strokeWidth={accent ? 2 : 1.9}
      />
      <Text size={10.5} leading={1} weight="500" tone={accent ? 'ink' : 'soft'} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
});

const ACTION_LABEL: Record<AuditEntry['action'], string> = {
  insert: 'NEW',
  update: 'EDIT',
  delete: 'DEL',
};

const ChangeRow = memo(function ChangeRow({ entry }: { entry: AuditEntry }) {
  return (
    <View style={styles.changeRow}>
      <AdminTag
        label={ACTION_LABEL[entry.action]}
        tone={entry.action === 'delete' ? 'danger' : entry.action === 'insert' ? 'success' : 'neutral'}
      />
      <View style={styles.changeBody}>
        <Text size={13} leading={1.2} numberOfLines={1}>
          {entry.entity_label ?? entry.entity_type}
        </Text>
        <Text size={10.5} leading={1.2} tone="faint" numberOfLines={1}>
          {`${entry.entity_type} · ${entry.actor_email ?? 'system'}`}
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
