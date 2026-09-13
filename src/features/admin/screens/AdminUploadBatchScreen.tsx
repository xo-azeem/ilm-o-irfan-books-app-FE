import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, Plus, Trash2, X } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';

import { BookCover, Divider, Icon, Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import {
  AdminConfirmSheet,
  AdminPickerSheet,
  RowBadges,
  type RowBadge,
} from '@/features/admin/components/AdminControls';
import { AdminMenuSkeleton } from '@/features/admin/components/AdminSkeletons';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  ADMIN_GUTTER,
  AdminActionBar,
  AdminBackLink,
  AdminButton,
  AdminCard,
  AdminEmpty,
  AdminErrorState,
  AdminField,
  AdminHelper,
  AdminOutlineButton,
  AdminPickerField,
  AdminSectionHeader,
  AdminTag,
} from '@/features/admin/components/AdminUi';
import { useDebouncedValue } from '@/features/admin/hooks/useAdminForm';
import { formatBytes, formatDate } from '@/features/admin/utils/format';
import { useAppInsets } from '@/hooks/useAppInsets';
import {
  useAdminCategories,
  useAdminCollections,
  useBatchBooks,
  useDeleteUploadBatch,
  usePublishUploadBatch,
  useUpdateUploadBatch,
  useUploadBatch,
} from '@/hooks/useAdmin';
import {
  adminCoverUrl,
  detachBatchBook,
  type AdminBookRow,
} from '@/services/admin';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminLibraryStackParamList } from '../navigation/types';

/** The picker item that stands for "none" in a single-choice destination. */
const NONE = '__none__';

function plural(count: number, noun: string) {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

/** Where one book in the batch stands, at a glance. */
function bookBadges(book: AdminBookRow): RowBadge[] {
  const badges: RowBadge[] = [];
  if (book.is_published) {
    badges.push({ label: 'LIVE', tone: 'success' });
  } else if (!book.pdf_path) {
    badges.push({ label: 'NO PDF', tone: 'warning' });
  } else {
    badges.push({ label: 'READY', tone: 'success' });
  }
  if (!book.cover_path) {
    badges.push({ label: 'NO COVER', tone: 'neutral' });
  }
  if (book.is_premium) {
    badges.push({ label: 'PREMIUM', tone: 'premium' });
  }
  return badges;
}

/**
 * One bulk upload.
 *
 * The admin names it, says where its books should land, and adds books one
 * at a time through the same editor every book gets — title, author, cover,
 * PDF, price — except that the editor's way out is "Add to batch" rather than
 * Publish. Each book is a draft here until the whole set is ready; then one
 * tap publishes them together, into the collection and category chosen here,
 * through the same storage check every other publish goes through.
 */
export function AdminUploadBatchScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AdminLibraryStackParamList>>();
  const route =
    useRoute<RouteProp<AdminLibraryStackParamList, 'AdminUploadBatch'>>();
  const batchId = route.params.batchId;
  const { colors } = useTheme();
  const { scrollEndPadding } = useAppInsets();
  const toast = useToast();
  const client = useQueryClient();

  const batch = useUploadBatch(batchId);
  const books = useBatchBooks(batchId);
  const { data: collections = [] } = useAdminCollections();
  const { data: categories = [] } = useAdminCategories();

  const update = useUpdateUploadBatch();
  const publish = usePublishUploadBatch();
  const remove = useDeleteUploadBatch();

  const [title, setTitle] = useState('');
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const rows = useMemo(() => books.data ?? [], [books.data]);
  const published = batch.data?.status === 'published';
  const missing = rows.filter(book => !book.pdf_path).length;

  // The name is the batch's; typing here is the edit, saved a beat after the
  // last keystroke rather than on every one. Read from the server once — a
  // refetch after a save must not put the saved name back under a hand that
  // has typed on since.
  const titleSeeded = useRef(false);
  useEffect(() => {
    if (batch.data && !titleSeeded.current) {
      titleSeeded.current = true;
      setTitle(batch.data.title);
    }
  }, [batch.data]);
  const settledTitle = useDebouncedValue(title, 600);
  useEffect(() => {
    const next = settledTitle.trim();
    if (batch.data && next && next !== batch.data.title) {
      update.mutate({ id: batchId, patch: { title: next } });
    }
    // Only when the settled title moves; the mutation object is stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settledTitle]);

  const refreshBooks = useCallback(() => {
    void client.invalidateQueries({
      queryKey: ['admin', 'upload-batch-books', batchId],
    });
    void client.invalidateQueries({
      queryKey: ['admin', 'upload-batch', batchId],
    });
    void client.invalidateQueries({ queryKey: ['admin', 'upload-batches'] });
  }, [batchId, client]);

  // ------------------------------------------------------------ books

  const addBook = useCallback(
    () => navigation.navigate(ADMIN_ROUTES.BOOK_EDITOR, { batchId }),
    [batchId, navigation],
  );

  const openBook = useCallback(
    (bookId: string) =>
      navigation.navigate(ADMIN_ROUTES.BOOK_EDITOR, { bookId }),
    [navigation],
  );

  const detach = useCallback(
    (bookId: string) => {
      void detachBatchBook(bookId)
        .then(() => {
          toast.info(
            'Taken out of the batch. The draft is still in the Library.',
          );
          refreshBooks();
        })
        .catch(caught => toast.error(errorMessage(caught)));
    },
    [refreshBooks, toast],
  );

  // ------------------------------------------------------------ destination

  const setDestination = useCallback(
    (patch: { collection_id?: string | null; category_id?: string | null }) => {
      update.mutate(
        { id: batchId, patch },
        { onError: caught => toast.error(errorMessage(caught)) },
      );
    },
    [batchId, toast, update],
  );

  const collectionItems = useMemo(
    () => [
      { id: NONE, label: 'No collection', sublabel: 'Only the catalogue' },
      ...collections
        .filter(collection => collection.slug !== 'trending')
        .map(collection => ({
          id: collection.id,
          label: collection.title,
          sublabel: collection.is_published
            ? `${plural(collection.published_count, 'book')} live`
            : 'Hidden — shown on Home once this batch is published',
        })),
    ],
    [collections],
  );

  const categoryItems = useMemo(
    () => [
      { id: NONE, label: 'No category' },
      ...categories.map(category => ({
        id: category.id,
        label: category.label,
        sublabel: plural(category.book_count, 'book'),
        accent: category.accent,
      })),
    ],
    [categories],
  );

  // ------------------------------------------------------------ publish

  const handlePublish = () => {
    publish.mutate(batchId, {
      onSuccess: result => {
        setConfirmPublish(false);
        if (result.batchPublished) {
          toast.success(
            `${plural(result.updated, 'book')} ${result.updated === 1 ? 'is' : 'are'} live.`,
          );
        } else {
          toast.error(
            `${result.updated} published, ${result.skipped} skipped — their PDF is missing from storage. Fix them and publish again.`,
          );
        }
      },
      onError: caught => toast.error(errorMessage(caught)),
    });
  };

  const handleDelete = () => {
    remove.mutate(batchId, {
      onSuccess: () => {
        toast.info('Batch deleted. Its drafts are still in the Library.');
        navigation.goBack();
      },
      onError: caught => toast.error(errorMessage(caught)),
    });
  };

  const publishBlocker = published
    ? null
    : rows.length === 0
      ? 'Add a book first'
      : missing > 0
        ? `${plural(missing, 'book')} still ${missing === 1 ? 'needs' : 'need'} a PDF`
        : null;

  const destination = batch.data
    ? [batch.data.collection_title, batch.data.category_label]
        .filter(Boolean)
        .join(' and ')
    : '';

  const publishConsequences = useMemo(() => {
    const coverless = rows.filter(book => !book.cover_path).length;
    const premium = rows.filter(book => book.is_premium).length;
    const lines = [
      `${plural(rows.length, 'title')} on Home, in Discover and in search`,
      destination
        ? `Added to ${destination}`
        : 'Not placed in any collection or category — the catalogue only',
      premium === rows.length
        ? 'All for members only'
        : `${premium} for members, ${rows.length - premium} free`,
    ];
    if (coverless > 0) {
      lines.push(
        `${plural(coverless, 'book')} without a cover — shown with a plain colour`,
      );
    }
    return lines;
  }, [destination, rows]);

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AdminBackLink
          label="Batches"
          action={
            published ? (
              <AdminTag label="LIVE" tone="success" />
            ) : (
              <AdminTag label="DRAFT" tone="warning" />
            )
          }
        />
      </View>

      {batch.isPending ? (
        <View style={styles.gutter}>
          <AdminMenuSkeleton count={4} height={90} />
        </View>
      ) : batch.error || !batch.data ? (
        <View style={styles.gutter}>
          <AdminErrorState
            message="This batch could not be loaded."
            detail={batch.error ? errorMessage(batch.error) : undefined}
            onRetry={() => void batch.refetch()}
            secondaryLabel="Back to batches"
            onSecondary={() => navigation.goBack()}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.grow}
          contentContainerStyle={{
            paddingHorizontal: ADMIN_GUTTER,
            paddingTop: 16,
            paddingBottom: scrollEndPadding + 90,
            gap: 17,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AdminCard>
            <AdminField
              label="Batch name"
              value={title}
              onChangeText={setTitle}
              placeholder="Rumi — the Masnavi, six volumes"
              editable={!published}
              maxLength={120}
              helper={
                published
                  ? `Published${
                      batch.data.published_at
                        ? ` on ${formatDate(batch.data.published_at)}`
                        : ''
                    }`
                  : 'Only you see this. It is how the batch is listed.'
              }
            />
          </AdminCard>

          <AdminCard>
            <AdminSectionHeader title="Where the books go" />
            <AdminPickerField
              label="Collection"
              value={batch.data.collection_title}
              placeholder="None — catalogue only"
              actionLabel={published ? 'Set' : 'Change'}
              onPress={() => !published && setShowCollectionPicker(true)}
              helper="A hidden collection is shown on Home the moment the batch is published."
            />
            <AdminPickerField
              label="Category"
              value={batch.data.category_label}
              placeholder="None"
              actionLabel={published ? 'Set' : 'Change'}
              onPress={() => !published && setShowCategoryPicker(true)}
              helper="Every book in the batch is tagged with it on publish."
            />
          </AdminCard>

          <View style={styles.block}>
            <AdminSectionHeader
              title={
                rows.length === 0
                  ? 'Books'
                  : `${plural(rows.length, 'book')}${
                      missing > 0 ? ` · ${missing} without a PDF` : ''
                    }`
              }
              action={
                !published ? (
                  <AdminOutlineButton
                    label="Add a book"
                    Icon={Plus}
                    small
                    fullWidth={false}
                    onPress={addBook}
                  />
                ) : undefined
              }
            />

            {books.isPending ? (
              <AdminMenuSkeleton count={3} height={64} />
            ) : rows.length === 0 ? (
              <AdminEmpty
                title="No books yet"
                message="Each book gets the full editor — title, author, cover, PDF and price — and lands here as a draft until the whole batch is published."
                actionLabel={published ? undefined : 'Add the first book'}
                onAction={published ? undefined : addBook}
              />
            ) : (
              <View
                style={[
                  styles.list,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                {rows.map((book, index) => (
                  <Fragment key={book.id}>
                    {index > 0 ? <Divider /> : null}
                    <BatchBookRow
                      book={book}
                      locked={published}
                      onOpen={openBook}
                      onDetach={detach}
                    />
                  </Fragment>
                ))}
              </View>
            )}

            {rows.length > 0 && !published ? (
              <AdminHelper>
                Open a book to change anything about it before it goes live.
                Taking a book out of the batch keeps it as a draft in the
                Library.
              </AdminHelper>
            ) : null}
          </View>

          {!published ? (
            <View style={styles.danger}>
              <AdminOutlineButton
                label="Delete batch"
                Icon={Trash2}
                destructive
                onPress={() => setConfirmDelete(true)}
              />
            </View>
          ) : null}
        </ScrollView>
      )}

      {batch.data && !published ? (
        <AdminActionBar>
          <AdminButton
            label={
              rows.length > 0
                ? `Publish ${plural(rows.length, 'book')}`
                : 'Publish batch'
            }
            blockedReason={publishBlocker}
            disabled={Boolean(publishBlocker)}
            loading={publish.isPending}
            onPress={() => setConfirmPublish(true)}
          />
        </AdminActionBar>
      ) : null}

      <AdminPickerSheet
        visible={showCollectionPicker}
        title="Collection"
        items={collectionItems}
        selected={[batch.data?.collection_id ?? NONE]}
        onClose={() => setShowCollectionPicker(false)}
        onChange={next =>
          setDestination({
            collection_id: next[0] && next[0] !== NONE ? next[0] : null,
          })
        }
      />

      <AdminPickerSheet
        visible={showCategoryPicker}
        title="Category"
        items={categoryItems}
        selected={[batch.data?.category_id ?? NONE]}
        onClose={() => setShowCategoryPicker(false)}
        onChange={next =>
          setDestination({
            category_id: next[0] && next[0] !== NONE ? next[0] : null,
          })
        }
      />

      <AdminConfirmSheet
        visible={confirmPublish}
        title={`Publish ${plural(rows.length, 'book')}?`}
        message="Every book in the batch goes live at once. This is what readers will see:"
        consequences={publishConsequences}
        confirmLabel="Publish now"
        loading={publish.isPending}
        onConfirm={handlePublish}
        onCancel={() => setConfirmPublish(false)}
      />

      <AdminConfirmSheet
        visible={confirmDelete}
        title="Delete this batch?"
        message="Only the batch goes. Its books stay in the Library as drafts, with their uploaded files."
        confirmLabel="Delete batch"
        destructive
        loading={remove.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </SafeAreaView>
  );
}

/**
 * One book in the batch. The row opens the editor; the × takes the book out
 * of the batch and leaves the draft. A published batch's rows are for the
 * record and cannot be taken out.
 */
const BatchBookRow = memo(function BatchBookRow({
  book,
  locked,
  onOpen,
  onDetach,
}: {
  book: AdminBookRow;
  locked: boolean;
  onOpen: (id: string) => void;
  onDetach: (id: string) => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${book.title}`}
      onPress={() => onOpen(book.id)}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors.primaryFillSoft },
      ]}
    >
      <BookCover
        width={30}
        coverUrl={adminCoverUrl(book.cover_path)}
        coverColor={book.cover_color ?? undefined}
      />

      <View style={styles.body}>
        <Text size={13.5} leading={1.2} numberOfLines={1}>
          {book.title}
        </Text>
        <Text size={11} leading={1.2} tone="faint" numberOfLines={1}>
          {[book.author_name, formatBytes(book.file_size_bytes)]
            .filter(part => part && part !== '—')
            .join(' · ')}
        </Text>
        <RowBadges badges={bookBadges(book)} />
      </View>

      <Icon icon={ChevronRight} size={15} color={colors.dim} strokeWidth={2} />

      {!locked ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Take ${book.title} out of the batch`}
          onPress={() => onDetach(book.id)}
          hitSlop={10}
          style={styles.remove}
        >
          <Icon icon={X} size={13} tone="danger" strokeWidth={2.4} />
        </Pressable>
      ) : null}
    </Pressable>
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
  gutter: {
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 16,
  },
  grow: { flex: 1 },
  block: { gap: 9 },
  list: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
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
    gap: 3,
  },
  remove: {
    padding: 3,
    marginLeft: 4,
  },
  danger: {
    paddingTop: 6,
  },
});
