import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminStatsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { Text } from '@/components/ui';
import {
  AdminBarChart,
  AdminRankRow,
  AdminShareBars,
} from '@/features/admin/components/AdminCharts';
import { AdminSegmented } from '@/features/admin/components/AdminControls';
import { errorMessage } from '@/features/admin/components/AdminToast';
import {
  ADMIN_GUTTER,
  AdminBackLink,
  AdminErrorState,
  AdminEyebrow,
  AdminRowGroup,
  AdminScreenTitle,
  AdminStat,
  AdminStatRow,
} from '@/features/admin/components/AdminUi';
import { useAppInsets } from '@/hooks/useAppInsets';
import { useAdminAnalytics } from '@/hooks/useAdmin';
import type { TimeSeriesPoint } from '@/services/admin';
import { useTheme } from '@/theme/ThemeContext';

type Range = '7' | '30' | '90';

const RANGE_OPTIONS: ReadonlyArray<{ value: Range; label: string }> = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

const RANGE_WORD: Record<Range, string> = {
  '7': 'week',
  '30': '30 days',
  '90': '90 days',
};

/**
 * Analytics.
 *
 * One chart at a time, in plain words. Every figure is stated against the
 * window before it, because a number with nothing to compare it to is a number
 * nobody can act on.
 */
export function AdminAnalyticsScreen() {
  const { colors } = useTheme();
  const { scrollEndPadding } = useAppInsets();
  const [range, setRange] = useState<Range>('7');

  const days = Number(range);
  const { data, isLoading, error, refetch } = useAdminAnalytics(days);
  // A second, longer window used only to say whether this one is up or down.
  const previous = useAdminAnalytics(days * 2);

  const readsDelta = useDelta(previous.data?.reads, days);
  const signupsDelta = useDelta(previous.data?.signups, days);

  const categoryRows = useMemo(
    () =>
      (data?.top_categories ?? []).map(category => ({
        id: category.category_id,
        label: category.label,
        value: category.readers,
      })),
    [data?.top_categories],
  );

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AdminBackLink label="System" />
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
        <View style={styles.titleBlock}>
          <AdminScreenTitle title="Analytics" />
          <AdminSegmented
            options={RANGE_OPTIONS}
            value={range}
            onChange={setRange}
            compact
          />
        </View>

        {isLoading ? (
          <AdminStatsSkeleton />
        ) : error || !data ? (
          <AdminErrorState
            title="Couldn't load analytics"
            message="The report did not come back. This is usually the server rather than your connection."
            detail={error ? errorMessage(error) : undefined}
            onRetry={() => void refetch()}
          />
        ) : (
          <>
            <AdminBarChart
              title="Reading sessions"
              total={sum(data.reads)}
              delta={
                readsDelta === null
                  ? null
                  : {
                      label: `${formatDelta(readsDelta)} vs last ${RANGE_WORD[range]}`,
                      up: readsDelta >= 0,
                    }
              }
              points={data.reads}
            />

            <AdminStatRow>
              <AdminStat
                label="New readers"
                value={data.audience.new_in_period}
                hint={
                  signupsDelta === null ? undefined : formatDelta(signupsDelta)
                }
                tone="success"
              />
              <AdminStat label="Downloads" value={sum(data.downloads)} />
              <AdminStat
                label="Active readers"
                value={data.audience.active_in_period}
                hint={`of ${data.audience.total}`}
              />
            </AdminStatRow>

            <AdminBarChart
              title="New readers"
              total={sum(data.signups)}
              delta={
                signupsDelta === null
                  ? null
                  : {
                      label: `${formatDelta(signupsDelta)} vs last ${RANGE_WORD[range]}`,
                      up: signupsDelta >= 0,
                    }
              }
              points={data.signups}
            />

            <AdminRowGroup title={`Most read this ${RANGE_WORD[range]}`}>
              {data.top_books.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text size={12.5} leading={1.45} tone="muted">
                    No book has been opened in this window yet.
                  </Text>
                </View>
              ) : (
                data.top_books
                  .slice(0, 5)
                  .map((book, index) => (
                    <AdminRankRow
                      key={book.book_id}
                      rank={index + 1}
                      label={book.title}
                      sublabel={`${book.readers} readers · ${Math.round(
                        book.avg_progress * 100,
                      )}% average progress`}
                      accent={book.cover_color}
                    />
                  ))
              )}
            </AdminRowGroup>

            <View style={styles.block}>
              <AdminEyebrow>Where reading happens</AdminEyebrow>
              <AdminShareBars
                rows={categoryRows}
                emptyLabel="No category has been opened in this window yet."
              />
            </View>

            <AdminStatRow>
              <AdminStat
                label="Published"
                value={data.catalog.published}
                tone="success"
              />
              <AdminStat label="Drafts" value={data.catalog.draft} />
              <AdminStat
                label="Premium"
                value={data.catalog.premium}
                tone="accent"
              />
              <AdminStat
                label="Missing files"
                value={data.catalog.missing_pdf + data.catalog.missing_cover}
                tone={
                  data.catalog.missing_pdf + data.catalog.missing_cover > 0
                    ? 'warning'
                    : undefined
                }
              />
            </AdminStatRow>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function sum(points: TimeSeriesPoint[] | undefined): number {
  return (points ?? []).reduce((total, point) => total + point.value, 0);
}

/**
 * The percentage change between this window and the one before it, read off a
 * series twice as long. Returns null when there is nothing to compare against.
 */
function useDelta(
  doubled: TimeSeriesPoint[] | undefined,
  days: number,
): number | null {
  return useMemo(() => {
    const series = doubled ?? [];
    if (series.length < days * 2) {
      return null;
    }
    const current = sum(series.slice(-days));
    const before = sum(series.slice(-days * 2, -days));
    if (before === 0) {
      return null;
    }
    return Math.round(((current - before) / before) * 100);
  }, [days, doubled]);
}

function formatDelta(change: number): string {
  if (change === 0) return 'level';
  return `${change > 0 ? '+' : '−'}${Math.abs(change)}%`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  grow: { flex: 1 },
  titleBlock: {
    gap: 11,
  },
  block: {
    gap: 9,
  },
  emptyRow: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
});
