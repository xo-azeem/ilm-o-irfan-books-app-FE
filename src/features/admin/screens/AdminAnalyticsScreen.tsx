import { useState } from 'react';
import { View } from 'react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { AdminStatsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { Text } from '@/components/ui';
import { AdminSegmented } from '@/features/admin/components/AdminControls';
import { AdminRankBar, AdminTrendChart } from '@/features/admin/components/AdminCharts';
import { errorMessage } from '@/features/admin/components/AdminToast';
import {
  AdminBackLink,
  AdminCard,
  AdminErrorState,
  AdminStat,
  useAdminRefresh,
} from '@/features/admin/components/AdminUi';
import { useAdminAnalytics } from '@/hooks/useAdmin';
import { palette } from '@/theme/palette';

const RANGE_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

export function AdminAnalyticsScreen() {
  const [range, setRange] = useState('30');
  const { data, isLoading, error, refetch, isRefetching } = useAdminAnalytics(Number(range));
  const refreshProps = useAdminRefresh(isRefetching, () => {
    void refetch();
  });

  const topBookMax = data?.top_books[0]?.readers ?? 0;
  const topCategoryMax = data?.top_categories[0]?.readers ?? 0;

  return (
    <Screen scrollViewProps={refreshProps}>
      <AdminBackLink label="System" />
      <ScreenHeader title="Analytics" subtitle="Reader activity and catalog performance." />

      <View className="mb-5">
        <AdminSegmented options={RANGE_OPTIONS} value={range} onChange={setRange} />
      </View>

      {isLoading ? (
        <AdminStatsSkeleton />
      ) : error || !data ? (
        <AdminErrorState
          message={error ? errorMessage(error) : 'No analytics returned.'}
          onRetry={() => void refetch()}
        />
      ) : (
        <View className="gap-6">
          <View className="flex-row flex-wrap gap-3">
            <AdminStat
              label="New readers"
              value={data.audience.new_in_period}
              hint={`of ${data.audience.total} total`}
              tone="success"
            />
            <AdminStat
              label="Active readers"
              value={data.audience.active_in_period}
              hint="opened a book"
            />
            <AdminStat
              label="Subscribers"
              value={data.audience.subscribers}
              tone="accent"
              hint={`${
                data.audience.total > 0
                  ? Math.round((data.audience.subscribers / data.audience.total) * 100)
                  : 0
              }% of accounts`}
            />
            <AdminStat label="Admins" value={data.audience.admins} />
          </View>

          <AdminTrendChart title="Sign-ups" points={data.signups} unit="new" />
          <AdminTrendChart
            title="Reading sessions"
            points={data.reads}
            accent={palette.yellowGreen}
          />
          <AdminTrendChart title="Downloads" points={data.downloads} accent={palette.sunflower} />

          <AdminCard title="Most read titles">
            {data.top_books.length === 0 ? (
              <Text className="text-[13px] text-app-muted dark:text-app-muted-dark">
                No reading activity recorded yet.
              </Text>
            ) : (
              data.top_books.map(book => (
                <AdminRankBar
                  key={book.book_id}
                  label={book.title}
                  sublabel={`${book.author_name} · ${Math.round(
                    book.avg_progress * 100,
                  )}% average progress`}
                  value={book.readers}
                  max={topBookMax}
                  accent={book.cover_color}
                />
              ))
            )}
          </AdminCard>

          <AdminCard title="Categories by readership">
            {data.top_categories.length === 0 ? (
              <Text className="text-[13px] text-app-muted dark:text-app-muted-dark">
                No categories yet.
              </Text>
            ) : (
              data.top_categories.map(category => (
                <AdminRankBar
                  key={category.category_id}
                  label={category.label}
                  sublabel={`${category.book_count} ${
                    category.book_count === 1 ? 'book' : 'books'
                  } assigned`}
                  value={category.readers}
                  max={topCategoryMax}
                  accent={category.accent}
                />
              ))
            )}
          </AdminCard>

          <View className="flex-row flex-wrap gap-3">
            <AdminStat label="Published" value={data.catalog.published} tone="success" />
            <AdminStat label="Drafts" value={data.catalog.draft} />
            <AdminStat label="Premium titles" value={data.catalog.premium} tone="accent" />
            <AdminStat
              label="Missing files"
              value={data.catalog.missing_pdf + data.catalog.missing_cover}
              tone={data.catalog.missing_pdf + data.catalog.missing_cover > 0 ? 'warning' : undefined}
            />
          </View>
        </View>
      )}
    </Screen>
  );
}
