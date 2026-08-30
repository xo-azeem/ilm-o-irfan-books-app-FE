import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { ListRowsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { Text } from '@/components/ui';
import { AdminConfirmSheet, AdminSegmented } from '@/features/admin/components/AdminControls';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  AdminBackLink,
  AdminBadge,
  AdminCard,
  AdminEmpty,
  AdminErrorState,
  AdminStat,
  DANGER,
  useAdminRefresh,
} from '@/features/admin/components/AdminUi';
import { formatBytes, formatRelative } from '@/features/admin/utils/format';
import { useDeleteStorageObject, useStorageAudit } from '@/hooks/useAdmin';
import { useTheme } from '@/theme/ThemeContext';

type Tab = 'orphans' | 'broken';

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'orphans', label: 'Unreferenced' },
  { value: 'broken', label: 'Missing files' },
];

export function AdminMediaScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { data, isLoading, error, refetch, isRefetching } = useStorageAudit();
  const refreshProps = useAdminRefresh(isRefetching, () => {
    void refetch();
  });
  const remove = useDeleteStorageObject();

  const [tab, setTab] = useState<Tab>('orphans');
  const [target, setTarget] = useState<{ bucket: 'covers' | 'pdfs'; name: string } | null>(null);

  return (
    <Screen scrollViewProps={refreshProps}>
      <AdminBackLink label="System" />
      <ScreenHeader title="Media library" subtitle="Storage usage and files worth cleaning up." />

      {isLoading ? (
        <ListRowsSkeleton rows={6} />
      ) : error || !data ? (
        <AdminErrorState
          message={error ? errorMessage(error) : 'No storage data returned.'}
          onRetry={() => void refetch()}
        />
      ) : (
        <View className="gap-5">
          <View className="flex-row flex-wrap gap-3">
            <AdminStat
              label="Covers"
              value={data.totals.covers_count}
              hint={formatBytes(data.totals.covers_bytes)}
            />
            <AdminStat
              label="PDFs"
              value={data.totals.pdfs_count}
              hint={formatBytes(data.totals.pdfs_bytes)}
            />
          </View>

          <AdminSegmented options={TABS} value={tab} onChange={setTab} />

          {tab === 'orphans' ? (
            data.orphans.length === 0 ? (
              <AdminEmpty
                title="Nothing to clean up"
                message="Every stored file is referenced by a book or an author."
              />
            ) : (
              <AdminCard title={`${data.orphans.length} unreferenced files`} padded={false}>
                {data.orphans.map((object, index) => (
                  <View
                    key={`${object.bucket}/${object.name}`}
                    className={`flex-row items-center gap-3 px-4 py-3 ${
                      index === data.orphans.length - 1
                        ? ''
                        : 'border-b border-app-border dark:border-app-border-dark'
                    }`}>
                    <AdminBadge label={object.bucket} tone="neutral" />
                    <View className="min-w-0 flex-1">
                      <Text
                        className="text-[13px] text-app-ink dark:text-app-ink-dark"
                        numberOfLines={1}>
                        {object.name}
                      </Text>
                      <Text className="text-[11px] text-app-faint dark:text-app-faint-dark">
                        {formatBytes(object.size)} · uploaded {formatRelative(object.created_at)}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setTarget({ bucket: object.bucket, name: object.name })}
                      hitSlop={8}
                      className="rounded-full px-3 py-1.5 active:opacity-70"
                      style={{ backgroundColor: `${DANGER}1A` }}>
                      <Text className="text-[12px] font-semibold" style={{ color: DANGER }}>
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </AdminCard>
            )
          ) : data.broken.length === 0 ? (
            <AdminEmpty
              title="No broken links"
              message="Every book points at a file that exists in storage."
            />
          ) : (
            <AdminCard title={`${data.broken.length} books with a missing file`} padded={false}>
              {data.broken.map((book, index) => (
                <View
                  key={book.book_id}
                  className={`gap-1 px-4 py-3 ${
                    index === data.broken.length - 1
                      ? ''
                      : 'border-b border-app-border dark:border-app-border-dark'
                  }`}>
                  <Text
                    className="text-[14px] text-app-ink dark:text-app-ink-dark"
                    numberOfLines={1}>
                    {book.title}
                  </Text>
                  <View className="flex-row gap-1.5">
                    {book.missing_pdf ? <AdminBadge label="PDF missing" tone="danger" /> : null}
                    {book.missing_cover ? (
                      <AdminBadge label="Cover missing" tone="warning" />
                    ) : null}
                  </View>
                </View>
              ))}
            </AdminCard>
          )}

          <Text className="px-1 text-[12px] leading-[17px]" style={{ color: colors.faint }}>
            Files referenced by a book cannot be deleted here — remove or replace them from the book
            editor instead.
          </Text>
        </View>
      )}

      <AdminConfirmSheet
        visible={target !== null}
        title="Delete this file?"
        message={`${target?.name ?? ''} will be permanently removed from storage.`}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onCancel={() => setTarget(null)}
        onConfirm={() =>
          target &&
          remove.mutate(target, {
            onSuccess: () => {
              setTarget(null);
              toast.success('File deleted.');
            },
            onError: caught => {
              setTarget(null);
              toast.error(errorMessage(caught));
            },
          })
        }
      />
    </Screen>
  );
}
