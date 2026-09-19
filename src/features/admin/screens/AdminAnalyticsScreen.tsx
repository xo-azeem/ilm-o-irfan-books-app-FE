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
import { useStrings, type Strings } from '@/i18n';

type Range = '7' | '30' | '90';

const RANGES: Range[] = ['7', '30', '90'];

/**
 * Analytics.
 *
 * One chart at a time, in plain words. Every figure is stated against the
 * window before it, because a number with nothing to compare it to is a number
 * nobody can act on.
 */
export function AdminAnalyticsScreen() {
  const { colors } = useTheme();
  const s = useStrings();
  const words = s.admin.analytics;
  const rangeOptions = useMemo(
    () => RANGES.map(value => ({ value, label: words.ranges[value] })),
    [words],
  );
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
        <AdminBackLink label={s.admin.system.title} />
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
          <AdminScreenTitle title={words.title} />
          <AdminSegmented
            options={rangeOptions}
            value={range}
            onChange={setRange}
            compact
          />
        </View>

        {isLoading ? (
          <AdminStatsSkeleton />
        ) : error || !data ? (
          <AdminErrorState
            title={words.loadFailed}
            message={words.loadFailedMessage}
            detail={error ? errorMessage(error) : undefined}
            onRetry={() => void refetch()}
          />
        ) : (
          <>
            <AdminBarChart
              title={words.readingSessions}
              total={sum(data.reads)}
              delta={
                readsDelta === null
                  ? null
                  : {
                      label: words.vsLast(
                        formatDelta(readsDelta, s),
                        words.rangeWords[range],
                      ),
                      up: readsDelta >= 0,
                    }
              }
              points={data.reads}
            />

            <AdminStatRow>
              <AdminStat
                label={words.newReaders}
                value={data.audience.new_in_period}
                hint={
                  signupsDelta === null
                    ? undefined
                    : formatDelta(signupsDelta, s)
                }
                tone="success"
              />
              <AdminStat label={words.downloads} value={sum(data.downloads)} />
              <AdminStat
                label={words.activeReaders}
                value={data.audience.active_in_period}
                hint={words.ofTotal(data.audience.total)}
              />
            </AdminStatRow>

            <AdminBarChart
              title={words.newReaders}
              total={sum(data.signups)}
              delta={
                signupsDelta === null
                  ? null
                  : {
                      label: words.vsLast(
                        formatDelta(signupsDelta, s),
                        words.rangeWords[range],
                      ),
                      up: signupsDelta >= 0,
                    }
              }
              points={data.signups}
            />

            <AdminRowGroup title={words.mostRead(words.rangeWords[range])}>
              {data.top_books.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text size={12.5} leading={1.45} tone="muted">
                    {words.noBookOpened}
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
                      sublabel={words.readersProgress(
                        book.readers,
                        Math.round(book.avg_progress * 100),
                      )}
                      accent={book.cover_color}
                    />
                  ))
              )}
            </AdminRowGroup>

            <View style={styles.block}>
              <AdminEyebrow>{words.whereReadingHappens}</AdminEyebrow>
              <AdminShareBars
                rows={categoryRows}
                emptyLabel={words.noCategoryOpened}
              />
            </View>

            <AdminStatRow>
              <AdminStat
                label={words.published}
                value={data.catalog.published}
                tone="success"
              />
              <AdminStat label={words.drafts} value={data.catalog.draft} />
              <AdminStat
                label={words.premium}
                value={data.catalog.premium}
                tone="accent"
              />
              <AdminStat
                label={words.missingFiles}
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

function formatDelta(change: number, s: Strings): string {
  if (change === 0) return s.admin.analytics.level;
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
