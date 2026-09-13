import { memo, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, Layers } from 'lucide-react-native';

import { Icon, Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import { AdminRowsSkeleton } from '@/features/admin/components/AdminSkeletons';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  ADMIN_GUTTER,
  AdminBackLink,
  AdminEmpty,
  AdminErrorState,
  AdminHelper,
  AdminNewButton,
  AdminScreenTitle,
  AdminTag,
} from '@/features/admin/components/AdminUi';
import { formatDate } from '@/features/admin/utils/format';
import { useAppInsets } from '@/hooks/useAppInsets';
import { useCreateUploadBatch, useUploadBatches } from '@/hooks/useAdmin';
import type { UploadBatch } from '@/services/admin';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminLibraryStackParamList } from '../navigation/types';

/** Module-level so the list is not handed a new function every render. */
const keyExtractor = (item: UploadBatch) => item.id;

function plural(count: number, noun: string) {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

/** A batch is named after the day it was started until the admin renames it. */
function defaultTitle(): string {
  return `Upload · ${new Date().toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })}`;
}

/**
 * Bulk uploads.
 *
 * Every batch the admin has started: the ones still being filled, and the
 * ones already live. A batch is the smallest thing that holds a set of books
 * back until all of them are ready — so a series lands on Home whole, not
 * three titles at a time over an afternoon.
 */
export function AdminUploadBatchesScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AdminLibraryStackParamList>>();
  const { colors } = useTheme();
  const { scrollEndPadding } = useAppInsets();
  const toast = useToast();

  const batches = useUploadBatches();
  const create = useCreateUploadBatch();

  const openBatch = useCallback(
    (batchId: string) =>
      navigation.navigate(ADMIN_ROUTES.UPLOAD_BATCH, { batchId }),
    [navigation],
  );

  // One tap starts a batch and opens it; the name is editable inside. Asking
  // for a name first would be a form in front of the actual work.
  const startBatch = useCallback(() => {
    create.mutate(
      { title: defaultTitle(), collection_id: null, category_id: null },
      {
        onSuccess: batchId => openBatch(batchId),
        onError: caught =>
          toast.error(errorMessage(caught, 'Could not start a batch.')),
      },
    );
  }, [create, openBatch, toast]);

  const renderBatch = useCallback(
    ({ item }: { item: UploadBatch }) => (
      <BatchRow batch={item} onPress={openBatch} />
    ),
    [openBatch],
  );

  const drafts = (batches.data ?? []).filter(
    batch => batch.status === 'draft',
  ).length;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AdminBackLink
          label="Library"
          action={
            <AdminNewButton
              label={create.isPending ? 'Starting…' : 'New batch'}
              onPress={startBatch}
            />
          }
        />
      </View>

      {batches.isPending ? (
        <View style={styles.gutter}>
          <AdminRowsSkeleton count={4} />
        </View>
      ) : batches.error ? (
        <View style={styles.gutter}>
          <AdminErrorState
            message="The batches could not be loaded."
            detail={errorMessage(batches.error)}
            onRetry={() => void batches.refetch()}
          />
        </View>
      ) : (
        <FlatList
          data={batches.data ?? []}
          keyExtractor={keyExtractor}
          renderItem={renderBatch}
          ItemSeparatorComponent={ListGap}
          refreshing={batches.isRefetching}
          onRefresh={() => void batches.refetch()}
          ListHeaderComponent={
            <View style={styles.title}>
              <AdminScreenTitle
                title="Bulk uploads"
                subtitle={
                  batches.data?.length
                    ? `${plural(batches.data.length, 'batch')}${
                        drafts ? ` · ${drafts} still being filled` : ''
                      }`
                    : 'Add a set of PDFs and publish them together.'
                }
              />
            </View>
          }
          ListEmptyComponent={
            <View style={styles.gutter}>
              <AdminEmpty
                title="No batches yet"
                message="Start a batch, drop in every PDF of a series or a subject, set where they go, and publish the whole set with one tap."
                actionLabel="Start a batch"
                onAction={startBatch}
                art={<Icon icon={Layers} size={28} tone="primary" />}
              />
            </View>
          }
          ListFooterComponent={
            batches.data?.length ? (
              <View style={styles.footer}>
                <AdminHelper>
                  A published batch keeps its list for the record. Its books are
                  ordinary titles in the Library from then on.
                </AdminHelper>
              </View>
            ) : null
          }
          contentContainerStyle={{
            paddingHorizontal: ADMIN_GUTTER,
            paddingBottom: scrollEndPadding + 20,
          }}
          showsVerticalScrollIndicator={false}
          style={styles.grow}
        />
      )}
    </SafeAreaView>
  );
}

function ListGap() {
  return <View style={styles.listGap} />;
}

/** One line under the name that says where the batch stands. */
function describe(batch: UploadBatch): { text: string; warn: boolean } {
  if (batch.status === 'published') {
    return {
      text: `${plural(batch.published_count, 'book')} live${
        batch.published_at ? ` · ${formatDate(batch.published_at)}` : ''
      }`,
      warn: false,
    };
  }
  if (batch.book_count === 0) {
    return { text: 'Empty — add PDFs to begin', warn: false };
  }
  const missing = batch.book_count - batch.ready_count;
  return {
    text:
      missing > 0
        ? `${plural(batch.book_count, 'book')} · ${missing} without a PDF`
        : `${plural(batch.book_count, 'book')} · ready to publish`,
    warn: missing > 0,
  };
}

const BatchRow = memo(function BatchRow({
  batch,
  onPress,
}: {
  batch: UploadBatch;
  onPress: (batchId: string) => void;
}) {
  const { colors } = useTheme();
  const handlePress = useCallback(() => onPress(batch.id), [batch.id, onPress]);
  const line = describe(batch);
  const destination = [batch.collection_title, batch.category_label]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={batch.title}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.glyph,
          {
            backgroundColor:
              batch.status === 'published'
                ? colors.primaryFillSoft
                : colors.control,
          },
        ]}
      >
        <Icon
          icon={Layers}
          size={16}
          tone={batch.status === 'published' ? 'primary' : 'muted'}
          strokeWidth={1.9}
        />
      </View>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text
            size={14}
            leading={1.2}
            weight="500"
            numberOfLines={1}
            style={styles.shrink}
          >
            {batch.title}
          </Text>
          {batch.status === 'published' ? (
            <AdminTag label="LIVE" tone="success" small />
          ) : (
            <AdminTag label="DRAFT" tone="warning" small />
          )}
        </View>
        <Text
          size={11}
          leading={1.2}
          tone={line.warn ? 'warning' : 'faint'}
          numberOfLines={1}
        >
          {line.text}
        </Text>
        {destination ? (
          <Text size={11} leading={1.2} tone="faint" numberOfLines={1}>
            {`→ ${destination}`}
          </Text>
        ) : null}
      </View>

      <Icon icon={ChevronRight} size={15} color={colors.dim} strokeWidth={2} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  gutter: {
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 16,
  },
  grow: {
    flex: 1,
  },
  title: {
    paddingTop: 16,
    paddingBottom: 14,
  },
  footer: {
    paddingTop: 16,
  },
  listGap: {
    height: 9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  glyph: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  shrink: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.78,
  },
});
