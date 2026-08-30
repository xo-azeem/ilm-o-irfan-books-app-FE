import { memo, useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { ListRowsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { SegmentedControl, Text } from '@/components/ui';
import { AdminConfirmSheet } from '@/features/admin/components/AdminControls';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  AdminBackLink,
  AdminBadge,
  AdminEmpty,
  AdminErrorState,
  AdminRowGroup,
  AdminStat,
  AdminStatRow,
  useAdminRefresh,
} from '@/features/admin/components/AdminUi';
import { formatBytes, formatRelative } from '@/features/admin/utils/format';
import { useDeleteStorageObject, useStorageAudit } from '@/hooks/useAdmin';
import { layout } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

type Tab = 'orphans' | 'broken';

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'orphans', label: 'Unreferenced' },
  { value: 'broken', label: 'Missing files' },
];

type StorageTarget = { bucket: 'covers' | 'pdfs'; name: string };

/**
 * Media library.
 *
 * Two problems, one screen: files nothing points at, and books pointing at
 * files that are gone. Only the first is deletable here — the second is fixed
 * in the book editor, where the replacement belongs.
 */
export function AdminMediaScreen() {
  const toast = useToast();
  const { data, isLoading, error, refetch, isRefetching } = useStorageAudit();
  const refreshProps = useAdminRefresh(isRefetching, () => {
    void refetch();
  });
  const remove = useDeleteStorageObject();

  const [tab, setTab] = useState<Tab>('orphans');
  const [target, setTarget] = useState<StorageTarget | null>(null);

  const clearTarget = useCallback(() => setTarget(null), []);

  return (
    <Screen padding={layout.adminPadding} gap={15} scrollViewProps={refreshProps}>
      <AdminBackLink label="System" />
      <ScreenHeader
        title="Media library"
        dense
        subtitle="Storage usage and files worth cleaning up."
      />

      {isLoading ? (
        <ListRowsSkeleton count={6} height={62} />
      ) : error || !data ? (
        <AdminErrorState
          message={error ? errorMessage(error) : 'No storage data returned.'}
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          <AdminStatRow>
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
          </AdminStatRow>

          <SegmentedControl options={TABS} value={tab} onChange={setTab} />

          {tab === 'orphans' ? (
            data.orphans.length === 0 ? (
              <AdminEmpty
                title="Nothing to clean up"
                message="Every stored file is referenced by a book or an author."
              />
            ) : (
              <AdminRowGroup title={`${data.orphans.length} unreferenced files`}>
                {data.orphans.map(object => (
                  <OrphanRow
                    key={`${object.bucket}/${object.name}`}
                    bucket={object.bucket}
                    name={object.name}
                    size={object.size}
                    createdAt={object.created_at}
                    onDelete={setTarget}
                  />
                ))}
              </AdminRowGroup>
            )
          ) : data.broken.length === 0 ? (
            <AdminEmpty
              title="No broken links"
              message="Every book points at a file that exists in storage."
            />
          ) : (
            <AdminRowGroup title={`${data.broken.length} books with a missing file`}>
              {data.broken.map(book => (
                <View key={book.book_id} style={styles.brokenRow}>
                  <Text size={13.5} leading={1.2} numberOfLines={1}>
                    {book.title}
                  </Text>
                  <View style={styles.badges}>
                    {book.missing_pdf ? <AdminBadge label="PDF missing" tone="danger" /> : null}
                    {book.missing_cover ? (
                      <AdminBadge label="Cover missing" tone="warning" />
                    ) : null}
                  </View>
                </View>
              ))}
            </AdminRowGroup>
          )}

          <Text size={11.5} leading={1.45} tone="faint">
            Files referenced by a book cannot be deleted here — remove or replace them from the book
            editor instead.
          </Text>
        </>
      )}

      <AdminConfirmSheet
        visible={target !== null}
        title="Delete this file?"
        message={`${target?.name ?? ''} will be permanently removed from storage.`}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onCancel={clearTarget}
        onConfirm={() =>
          target &&
          remove.mutate(target, {
            onSuccess: () => {
              clearTarget();
              toast.success('File deleted.');
            },
            onError: caught => {
              clearTarget();
              toast.error(errorMessage(caught));
            },
          })
        }
      />
    </Screen>
  );
}

const OrphanRow = memo(function OrphanRow({
  bucket,
  name,
  size,
  createdAt,
  onDelete,
}: {
  bucket: 'covers' | 'pdfs';
  name: string;
  /** Storage occasionally reports no size for an object. */
  size: number | null;
  createdAt: string;
  onDelete: (target: StorageTarget) => void;
}) {
  const { colors } = useTheme();
  const handleDelete = useCallback(() => onDelete({ bucket, name }), [bucket, name, onDelete]);

  return (
    <View style={styles.row}>
      <AdminBadge label={bucket} tone="neutral" />
      <View style={styles.body}>
        <Text size={12.5} leading={1.2} numberOfLines={1}>
          {name}
        </Text>
        <Text size={11} leading={1.2} tone="faint" numberOfLines={1}>
          {`${formatBytes(size ?? 0)} · uploaded ${formatRelative(createdAt)}`}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${name}`}
        onPress={handleDelete}
        hitSlop={8}
        style={({ pressed }) => [
          styles.deleteButton,
          { backgroundColor: colors.dangerFill, borderColor: colors.dangerBorder },
          pressed && styles.pressed,
        ]}>
        <Text size={12} leading={1} weight="600" tone="danger">
          Delete
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  brokenRow: {
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  pressed: {
    opacity: 0.72,
  },
});
