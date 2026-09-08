import { memo, useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Label, Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import { AdminConfirmSheet } from '@/features/admin/components/AdminControls';
import { AdminMenuSkeleton } from '@/features/admin/components/AdminSkeletons';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  ADMIN_GUTTER,
  AdminAttentionGroup,
  AdminBackLink,
  AdminEmpty,
  AdminErrorState,
  AdminRowGroup,
  AdminScreenTitle,
  AdminSectionHeader,
  AdminTextAction,
} from '@/features/admin/components/AdminUi';
import { formatBytes, formatRelative } from '@/features/admin/utils/format';
import { useAppInsets } from '@/hooks/useAppInsets';
import { useDeleteStorageObject, useStorageAudit } from '@/hooks/useAdmin';
import { palette } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

type StorageTarget = { bucket: 'covers' | 'pdfs'; name: string };

/**
 * Storage.
 *
 * Two problems, one screen, each paired with its fix: files nothing points at,
 * which can be deleted here; and books pointing at files that are gone, which
 * are fixed in the editor where the replacement belongs.
 */
export function AdminStorageScreen() {
  // Opening a broken book means crossing into the Library tab, so this reaches
  // past its own stack rather than duplicating the editor.
  const navigation = useNavigation<{
    navigate: (screen: string, params?: object) => void;
  }>();
  const { colors } = useTheme();
  const { scrollEndPadding } = useAppInsets();
  const toast = useToast();

  const { data, isLoading, error, refetch } = useStorageAudit();
  const remove = useDeleteStorageObject();

  const [target, setTarget] = useState<StorageTarget | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const clearTarget = useCallback(() => setTarget(null), []);

  const orphanBytes = useMemo(
    () => (data?.orphans ?? []).reduce((total, object) => total + (object.size ?? 0), 0),
    [data?.orphans],
  );

  const pdfBytes = data?.totals.pdfs_bytes ?? 0;
  const coverBytes = data?.totals.covers_bytes ?? 0;
  const totalBytes = pdfBytes + coverBytes;
  const fileCount = (data?.totals.pdfs_count ?? 0) + (data?.totals.covers_count ?? 0);

  const deleteAll = useCallback(() => {
    const orphans = data?.orphans ?? [];
    void Promise.allSettled(
      orphans.map(object => remove.mutateAsync({ bucket: object.bucket, name: object.name })),
    ).then(results => {
      const failed = results.filter(result => result.status === 'rejected').length;
      setConfirmAll(false);
      if (failed === 0) {
        toast.success(`${orphans.length} files deleted.`);
      } else {
        toast.error(`${orphans.length - failed} deleted, ${failed} could not be removed.`);
      }
    });
  }, [data?.orphans, remove, toast]);

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}>
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
        showsVerticalScrollIndicator={false}>
        <AdminScreenTitle
          title="Storage"
          subtitle={
            data ? `${formatBytes(totalBytes)} across ${fileCount} files` : 'Counting the files…'
          }
        />

        {isLoading ? (
          <AdminMenuSkeleton count={4} height={72} />
        ) : error || !data ? (
          <AdminErrorState
            title="Couldn't read storage"
            message="The audit did not come back. Nothing has been changed."
            detail={error ? errorMessage(error) : undefined}
            onRetry={() => void refetch()}
          />
        ) : (
          <>
            {/* What is there, as one bar and three lines. */}
            <View
              style={[
                styles.usage,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}>
              <View style={[styles.bar, { backgroundColor: colors.border }]}>
                <View style={{ flex: Math.max(pdfBytes, 1), backgroundColor: palette.green }} />
                <View style={{ flex: Math.max(coverBytes, 1), backgroundColor: palette.lime }} />
                {orphanBytes > 0 ? (
                  <View style={{ flex: orphanBytes, backgroundColor: colors.warning }} />
                ) : null}
              </View>

              <View style={styles.legend}>
                <LegendRow
                  color={palette.green}
                  label="Book PDFs"
                  value={`${formatBytes(pdfBytes)} · ${data.totals.pdfs_count}`}
                />
                <LegendRow
                  color={palette.lime}
                  label="Covers"
                  value={`${formatBytes(coverBytes)} · ${data.totals.covers_count}`}
                />
                <LegendRow
                  color={colors.warning}
                  label="Not linked to a book"
                  value={`${formatBytes(orphanBytes)} · ${data.orphans.length}`}
                  warn
                />
              </View>
            </View>

            {data.orphans.length > 0 ? (
              <View style={styles.block}>
                <AdminSectionHeader
                  title={`Orphaned files · ${data.orphans.length}`}
                  tone="warning"
                  action={
                    <AdminTextAction
                      label="Delete all"
                      size={11.5}
                      destructive
                      onPress={() => setConfirmAll(true)}
                    />
                  }
                />
                <AdminAttentionGroup>
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
                </AdminAttentionGroup>
              </View>
            ) : null}

            {data.broken.length > 0 ? (
              <AdminRowGroup
                title={`Books with a missing file · ${data.broken.length}`}
                tone="warning">
                {data.broken.map(book => (
                  <View key={book.book_id} style={styles.brokenRow}>
                    <View style={[styles.brokenCover, { backgroundColor: colors.coverBase }]} />
                    <View style={styles.grow}>
                      <Text size={13} leading={1.2} numberOfLines={1}>
                        {book.title}
                      </Text>
                      <Text size={10.5} leading={1.2} tone="warning" numberOfLines={1}>
                        {book.missing_pdf && book.missing_cover
                          ? 'No PDF, no cover'
                          : book.missing_pdf
                          ? 'No PDF'
                          : 'No cover'}
                      </Text>
                    </View>
                    <AdminTextAction
                      label="Open"
                      size={11.5}
                      onPress={() =>
                        navigation.navigate(ADMIN_ROUTES.LIBRARY, {
                          screen: ADMIN_ROUTES.BOOK_EDITOR,
                          params: { bookId: book.book_id },
                        })
                      }
                    />
                  </View>
                ))}
              </AdminRowGroup>
            ) : null}

            {data.orphans.length === 0 && data.broken.length === 0 ? (
              <AdminEmpty
                title="Nothing to clean up"
                message="Every stored file belongs to a book or an author, and every book points at a file that exists."
              />
            ) : null}

            <Text size={11.5} leading={1.45} tone="faint">
              A file a book still points at cannot be deleted here — replace it from the book
              editor instead, so the record and the file change together.
            </Text>
          </>
        )}
      </ScrollView>

      <AdminConfirmSheet
        visible={target !== null}
        title="Delete this file?"
        message={`${target?.name ?? ''} is removed from storage permanently.`}
        consequences={['Nothing points at it, so no book changes']}
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

      <AdminConfirmSheet
        visible={confirmAll}
        title={`Delete ${data?.orphans.length ?? 0} orphaned files?`}
        message={`${formatBytes(orphanBytes)} is removed from storage permanently.`}
        consequences={[
          'No book or author points at any of them',
          'This cannot be undone — there is no bin',
        ]}
        confirmLabel="Delete all"
        destructive
        loading={remove.isPending}
        onCancel={() => setConfirmAll(false)}
        onConfirm={deleteAll}
      />
    </SafeAreaView>
  );
}

const LegendRow = memo(function LegendRow({
  color,
  label,
  value,
  warn = false,
}: {
  color: string;
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text size={12.5} leading={1} tone={warn ? 'warning' : 'ink'} style={styles.grow}>
        {label}
      </Text>
      <Label
        size={11.5}
        leading={1}
        weight="400"
        tracking={0}
        uppercase={false}
        tone={warn ? 'warning' : 'muted'}>
        {value}
      </Label>
    </View>
  );
});

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
    <View style={styles.orphanRow}>
      <View style={[styles.typeChip, { backgroundColor: colors.controlActive }]}>
        <Label
          size={8}
          leading={1}
          weight="700"
          tracking={0.4}
          tone={bucket === 'pdfs' ? 'action' : 'lime'}>
          {bucket === 'pdfs' ? 'PDF' : 'IMG'}
        </Label>
      </View>

      <View style={styles.grow}>
        <Label
          size={11.5}
          leading={1.2}
          weight="400"
          tracking={0}
          uppercase={false}
          tone="soft"
          numberOfLines={1}>
          {name}
        </Label>
        <Text size={10.5} leading={1.2} tone="faint" numberOfLines={1}>
          {`${formatBytes(size)} · uploaded ${formatRelative(createdAt)}`}
        </Text>
      </View>

      <AdminTextAction label="Delete" size={11.5} destructive onPress={handleDelete} />
    </View>
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
  grow: { flex: 1, minWidth: 0 },
  block: { gap: 9 },
  usage: {
    gap: 13,
    padding: 15,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  bar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  legend: {
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  orphanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  typeChip: {
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderRadius: 4,
  },
  brokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  brokenCover: {
    width: 26,
    height: 36,
    borderRadius: 5,
  },
});
