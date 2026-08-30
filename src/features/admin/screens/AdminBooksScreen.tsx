import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowUpDown, Plus, SlidersHorizontal } from 'lucide-react-native';

import { ListRowsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import {
  Card,
  Chip,
  Display,
  FloatingAction,
  Label,
  SearchField,
  SegmentedControl,
  Text,
} from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import { AdminBookListRow } from '@/features/admin/components/AdminBookRow';
import {
  AdminChipRow,
  AdminConfirmSheet,
  AdminPickerSheet,
} from '@/features/admin/components/AdminControls';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  AdminEmpty,
  AdminErrorState,
  AdminTextAction,
} from '@/features/admin/components/AdminUi';
import { useDebouncedValue } from '@/features/admin/hooks/useAdminForm';
import { useAppInsets } from '@/hooks/useAppInsets';
import {
  useAdminAuthors,
  useAdminBooks,
  useAdminCategories,
  useBulkUpdateBooks,
  useDeleteAdminBooks,
} from '@/hooks/useAdmin';
import type {
  AdminBookFilters,
  AdminBookRow,
  BookAccessFilter,
  BookSort,
  BookStatusFilter,
} from '@/services/admin';
import { layout } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminBooksStackParamList } from '../navigation/types';

const STATUS_OPTIONS: Array<{ value: BookStatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Live' },
  { value: 'draft', label: 'Drafts' },
  { value: 'incomplete', label: 'Issues' },
];

const ACCESS_OPTIONS: Array<{ value: BookAccessFilter; label: string }> = [
  { value: 'all', label: 'Any access' },
  { value: 'premium', label: 'Premium' },
  { value: 'free', label: 'Free' },
];

const SORT_LABELS: Record<BookSort, string> = {
  updated_desc: 'Recently updated',
  created_desc: 'Newest first',
  title_asc: 'Title A–Z',
  readers_desc: 'Most readers',
  downloads_desc: 'Most downloads',
};

export function AdminBooksScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminBooksStackParamList>>();
  const route = useRoute<RouteProp<AdminBooksStackParamList, 'AdminBookList'>>();
  const { colors } = useTheme();
  const { scrollEndPadding, tabBarHeight } = useAppInsets();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<BookStatusFilter>(route.params?.status ?? 'all');
  const [access, setAccess] = useState<BookAccessFilter>('all');
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sort, setSort] = useState<BookSort>('updated_desc');

  const [showFilters, setShowFilters] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [authorPickerOpen, setAuthorPickerOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const debouncedQuery = useDebouncedValue(query, 350);

  // The tab stays mounted, so a later "show me the drafts" jump from Overview
  // has to push the new filter in rather than relying on initial state.
  const routeStatus = route.params?.status;
  useEffect(() => {
    if (routeStatus) {
      setStatus(routeStatus);
    }
  }, [routeStatus]);

  const filters = useMemo<AdminBookFilters>(
    () => ({ query: debouncedQuery, status, access, authorId, categoryId, sort }),
    [debouncedQuery, status, access, authorId, categoryId, sort],
  );

  const { data, isLoading, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAdminBooks(filters);
  const { data: authors = [] } = useAdminAuthors();
  const { data: categories = [] } = useAdminCategories();

  const bulkUpdate = useBulkUpdateBooks();
  const deleteBooks = useDeleteAdminBooks();

  const rows = useMemo(() => data?.pages.flatMap(page => page.rows) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;
  const selectionMode = selected.length > 0;

  const activeFilterCount =
    (access !== 'all' ? 1 : 0) + (authorId ? 1 : 0) + (categoryId ? 1 : 0);

  const toggleSelected = useCallback((id: string) => {
    setSelected(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id],
    );
  }, []);

  const openBook = useCallback(
    (book: AdminBookRow) => {
      if (selectionMode) {
        toggleSelected(book.id);
        return;
      }
      navigation.navigate(ADMIN_ROUTES.BOOK_EDITOR, { bookId: book.id });
    },
    [navigation, selectionMode, toggleSelected],
  );

  const runBulk = (changes: { is_published?: boolean; is_premium?: boolean }, label: string) => {
    bulkUpdate.mutate(
      { ids: selected, changes },
      {
        onSuccess: result => {
          setSelected([]);
          toast.success(
            result.skipped > 0
              ? `${result.updated} ${label}. ${result.skipped} skipped — no PDF uploaded.`
              : `${result.updated} ${label}.`,
          );
        },
        onError: caught => toast.error(errorMessage(caught)),
      },
    );
  };

  const renderItem = useCallback(
    ({ item, index }: { item: AdminBookRow; index: number }) => (
      <AdminBookListRow
        book={item}
        selected={selected.includes(item.id)}
        selectionMode={selectionMode}
        onPress={() => openBook(item)}
        onLongPress={() => toggleSelected(item.id)}
        isFirst={index === 0}
        isLast={index === rows.length - 1}
      />
    ),
    [openBook, rows.length, selected, selectionMode, toggleSelected],
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {selectionMode ? (
            <>
              <Text size={15} leading={1} weight="500">
                {`${selected.length} selected`}
              </Text>
              <AdminTextAction label="Done" onPress={() => setSelected([])} />
            </>
          ) : (
            <>
              <Display size="screenDense">Books</Display>
              <Label uppercase tracking={0.8}>
                {`${total} ${total === 1 ? 'title' : 'titles'}`}
              </Label>
            </>
          )}
        </View>

        {!selectionMode ? (
          <>
            <SearchField
              value={query}
              onChangeText={setQuery}
              onClear={() => setQuery('')}
              dense
              placeholder="Search title, author, or slug"
            />

            <SegmentedControl options={STATUS_OPTIONS} value={status} onChange={setStatus} />

            <View style={styles.filterRow}>
              <Chip
                label="Filters"
                icon={SlidersHorizontal}
                selected={activeFilterCount > 0}
                count={activeFilterCount > 0 ? activeFilterCount : undefined}
                size="sm"
                onPress={() => setShowFilters(current => !current)}
              />
              <Chip
                label={SORT_LABELS[sort]}
                icon={ArrowUpDown}
                size="sm"
                onPress={() => setSortOpen(true)}
              />
              {activeFilterCount > 0 ? (
                <AdminTextAction
                  label="Clear"
                  onPress={() => {
                    setAccess('all');
                    setAuthorId(null);
                    setCategoryId(null);
                  }}
                />
              ) : null}
            </View>

            {showFilters ? (
              <Card tone="surface" rounded={14} padded={13} gap={12}>
                <SegmentedControl
                  options={ACCESS_OPTIONS}
                  value={access}
                  onChange={setAccess}
                  variant="soft"
                />

                <View style={styles.filterGroup}>
                  <Label size={10} tracking={1.4}>
                    Category
                  </Label>
                  <AdminChipRow
                    value={categoryId}
                    onChange={setCategoryId}
                    options={[
                      { value: null, label: 'All' },
                      ...categories.map(category => ({
                        value: category.id as string | null,
                        label: `${category.label} (${category.book_count})`,
                        accent: category.accent,
                      })),
                    ]}
                  />
                </View>

                <Pressable
                  onPress={() => setAuthorPickerOpen(true)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.authorRow,
                    { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                    pressed && styles.pressed,
                  ]}>
                  <Text size={13} leading={1} tone="muted">
                    Author
                  </Text>
                  <Text size={13} leading={1} weight="500">
                    {authors.find(author => author.id === authorId)?.name ?? 'Any author'}
                  </Text>
                </Pressable>
              </Card>
            ) : null}
          </>
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.listPad}>
          <ListRowsSkeleton count={8} />
        </View>
      ) : error ? (
        <View style={styles.listPad}>
          <AdminErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          // Rows are standalone cards now, so they need air between them.
          ItemSeparatorComponent={ListGap}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              void fetchNextPage();
            }
          }}
          contentContainerStyle={{
            paddingHorizontal: layout.adminPadding,
            paddingTop: 2,
            paddingBottom: scrollEndPadding + (selectionMode ? 150 : 68),
          }}
          ListEmptyComponent={
            <AdminEmpty
              title="No titles match"
              message={
                query || activeFilterCount || status !== 'all'
                  ? 'Try a different search or clear the filters.'
                  : 'Add your first book to start building the catalog.'
              }
              actionLabel={query || activeFilterCount ? undefined : 'New book'}
              onAction={() => navigation.navigate(ADMIN_ROUTES.BOOK_EDITOR, {})}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={styles.footer} color={colors.primary} />
            ) : null
          }
          style={{ flex: 1 }}
        />
      )}

      {/* New book sits above the tab bar, out of the list's way. */}
      {!selectionMode ? (
        <FloatingAction
          label="New book"
          icon={Plus}
          onPress={() => navigation.navigate(ADMIN_ROUTES.BOOK_EDITOR, {})}
          style={[styles.fab, { bottom: tabBarHeight + 14 }]}
        />
      ) : null}

      {/* The bulk bar rises as a sheet and states the count in words before
          any destructive action is within reach. */}
      {selectionMode ? (
        <View
          style={[
            styles.bulkBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.borderStrong,
              paddingBottom: Math.max(insets.bottom, 20) + 14,
            },
          ]}>
          <View style={styles.bulkHeader}>
            <Label size={10.5} tracking={1.4}>
              {`Apply to ${selected.length} ${selected.length === 1 ? 'title' : 'titles'}`}
            </Label>
            {bulkUpdate.isPending || deleteBooks.isPending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : null}
          </View>

          <View style={styles.bulkActions}>
            <BulkButton label="Publish" primary onPress={() => runBulk({ is_published: true }, 'published')} />
            <BulkButton
              label="Unpublish"
              onPress={() => runBulk({ is_published: false }, 'unpublished')}
            />
            <BulkButton
              label="Mark premium"
              onPress={() => runBulk({ is_premium: true }, 'marked premium')}
            />
            <BulkButton
              label="Make free"
              onPress={() => runBulk({ is_premium: false }, 'made free')}
            />
            <BulkButton label="Delete" tone="danger" onPress={() => setConfirmDelete(true)} />
          </View>
        </View>
      ) : null}

      <AdminPickerSheet
        visible={sortOpen}
        title="Sort by"
        searchable={false}
        items={(Object.keys(SORT_LABELS) as BookSort[]).map(key => ({
          id: key,
          label: SORT_LABELS[key],
        }))}
        selected={[sort]}
        onClose={() => setSortOpen(false)}
        onChange={next => setSort((next[0] as BookSort) ?? 'updated_desc')}
      />

      <AdminPickerSheet
        visible={authorPickerOpen}
        title="Filter by author"
        items={[
          { id: '', label: 'Any author' },
          ...authors.map(author => ({
            id: author.id,
            label: author.name,
            sublabel: `${author.book_count} ${author.book_count === 1 ? 'book' : 'books'}`,
          })),
        ]}
        selected={[authorId ?? '']}
        onClose={() => setAuthorPickerOpen(false)}
        onChange={next => setAuthorId(next[0] || null)}
      />

      <AdminConfirmSheet
        visible={confirmDelete}
        title={`Delete ${selected.length} ${selected.length === 1 ? 'title' : 'titles'}?`}
        message="Reading progress, wishlist entries, downloads, and the uploaded files are removed too. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteBooks.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          deleteBooks.mutate(selected, {
            onSuccess: count => {
              setConfirmDelete(false);
              setSelected([]);
              toast.success(`${count} ${count === 1 ? 'title' : 'titles'} deleted.`);
            },
            onError: caught => {
              setConfirmDelete(false);
              toast.error(errorMessage(caught));
            },
          })
        }
      />
    </SafeAreaView>
  );
}

/** A gap between the list's card rows. Hoisted so FlatList keeps one instance. */
function ListGap() {
  return <View style={styles.listGap} />;
}

function BulkButton({
  label,
  onPress,
  tone,
  primary,
}: {
  label: string;
  onPress: () => void;
  tone?: 'danger';
  /** The affirmative action carries a green fill; the rest stay neutral. */
  primary?: boolean;
}) {
  const { colors } = useTheme();
  const danger = tone === 'danger';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.bulkButton,
        {
          backgroundColor: danger
            ? colors.dangerFill
            : primary
            ? colors.primaryFill
            : colors.controlAlt,
          borderColor: danger
            ? colors.dangerBorder
            : primary
            ? colors.selectedBorder
            : colors.border,
        },
        pressed && styles.pressed,
      ]}>
      <Text
        size={13}
        leading={1}
        weight="500"
        tone={danger ? 'danger' : primary ? 'ink' : 'soft'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: layout.adminPadding,
    paddingTop: 4,
    paddingBottom: 13,
    gap: 13,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  filterGroup: {
    gap: 8,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  listPad: {
    paddingHorizontal: layout.adminPadding,
  },
  listGap: {
    height: 9,
  },
  fab: {
    position: 'absolute',
    right: layout.adminPadding,
  },
  bulkBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: layout.adminPadding,
    paddingTop: 18,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: -20 },
    elevation: 24,
  },
  bulkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bulkActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  bulkButton: {
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  pressed: {
    opacity: 0.75,
  },
  footer: {
    paddingVertical: 20,
  },
});
