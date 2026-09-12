import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Display, Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import { AdminBookListRow } from '@/features/admin/components/AdminBookRow';
import {
  AdminActiveFilter,
  AdminConfirmSheet,
  AdminFilterButton,
  AdminFilterSheet,
  AdminSearchBar,
} from '@/features/admin/components/AdminControls';
import { AdminRowsSkeleton } from '@/features/admin/components/AdminSkeletons';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  ADMIN_GUTTER,
  AdminEmpty,
  AdminErrorState,
  AdminEyebrow,
  AdminNewButton,
  AdminPageTitle,
  AdminSegments,
  AdminTextAction,
} from '@/features/admin/components/AdminUi';
import { LibraryAuthors } from '@/features/admin/components/LibraryAuthors';
import {
  LibraryCategories,
  LibraryShelves,
} from '@/features/admin/components/LibraryCatalog';
import { useDebouncedValue } from '@/features/admin/hooks/useAdminForm';
import { useAppInsets } from '@/hooks/useAppInsets';
import {
  useAdminAuthors,
  useAdminBooks,
  useAdminCategories,
  useAdminCollections,
  useAdminStats,
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
import { useTheme } from '@/theme/ThemeContext';

import type {
  AdminLibraryStackParamList,
  LibrarySegment,
} from '../navigation/types';

const SEGMENTS: ReadonlyArray<{ value: LibrarySegment; label: string }> = [
  { value: 'books', label: 'Books' },
  { value: 'authors', label: 'Authors' },
  { value: 'categories', label: 'Categories' },
  { value: 'shelves', label: 'Shelves' },
];

const ACCESS_LABEL: Record<BookAccessFilter, string> = {
  all: 'Any',
  premium: 'Premium',
  free: 'Free',
};

const SORT_LABEL: Record<BookSort, string> = {
  updated_desc: 'Recently edited',
  title_asc: 'Title A–Z',
  readers_desc: 'Most readers',
  created_desc: 'Newest first',
  downloads_desc: 'Most downloads',
};

/** The three sorts an operator actually reaches for, in the board's order. */
const SORT_OPTIONS: BookSort[] = ['updated_desc', 'title_asc', 'readers_desc'];

/**
 * Library.
 *
 * Books, authors, categories and shelves were four destinations across two
 * tabs; they are one screen and four segments here, because merchandising the
 * catalog is a single job and an operator should never have to know which
 * table a thing lives in before they can find it.
 */
export function AdminLibraryScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AdminLibraryStackParamList>>();
  const route =
    useRoute<RouteProp<AdminLibraryStackParamList, 'AdminLibraryHome'>>();
  const { colors } = useTheme();
  const { scrollEndPadding } = useAppInsets();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [segment, setSegment] = useState<LibrarySegment>(
    route.params?.segment ?? 'books',
  );

  // Books
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<BookStatusFilter>(
    route.params?.status ?? 'all',
  );
  const [access, setAccess] = useState<BookAccessFilter>('all');
  const [sort, setSort] = useState<BookSort>('updated_desc');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Authors
  const [authorQuery, setAuthorQuery] = useState('');

  const debouncedQuery = useDebouncedValue(query, 350);
  const debouncedAuthorQuery = useDebouncedValue(authorQuery, 300);

  // The tab stays mounted, so a later jump from Today has to push its filter
  // in rather than relying on this screen's initial state.
  const routeSegment = route.params?.segment;
  const routeStatus = route.params?.status;
  useEffect(() => {
    if (routeSegment) setSegment(routeSegment);
  }, [routeSegment]);
  useEffect(() => {
    if (routeStatus) setStatus(routeStatus);
  }, [routeStatus]);

  const filters = useMemo<AdminBookFilters>(
    () => ({
      query: debouncedQuery,
      status,
      access,
      authorId: null,
      categoryId: null,
      sort,
    }),
    [access, debouncedQuery, sort, status],
  );

  const books = useAdminBooks(filters);
  const authors = useAdminAuthors(debouncedAuthorQuery);
  const categories = useAdminCategories();
  const collections = useAdminCollections();
  const { data: stats } = useAdminStats();

  const bulkUpdate = useBulkUpdateBooks();
  const deleteBooks = useDeleteAdminBooks();

  const rows = useMemo(
    () => books.data?.pages.flatMap(page => page.rows) ?? [],
    [books.data],
  );
  const shown = books.data?.pages[0]?.total ?? 0;

  const categoryById = useMemo(
    () =>
      new Map(
        (categories.data ?? []).map(category => [category.id, category.label]),
      ),
    [categories.data],
  );

  const bookTotal =
    (stats?.book_published_count ?? 0) + (stats?.book_draft_count ?? 0);
  // The board's own arithmetic: two titles without a PDF plus one without a
  // cover is "3 need attention". The breakdown line always says which is which.
  const needsAttention =
    (stats?.missing_pdf_count ?? 0) + (stats?.missing_cover_count ?? 0);
  const orphanAuthors = (authors.data ?? []).filter(
    author => author.book_count === 0,
  ).length;

  const activeFilters = useMemo(() => {
    const list: Array<{ id: string; label: string; clear: () => void }> = [];
    if (status !== 'all') {
      list.push({
        id: 'status',
        label:
          status === 'published'
            ? 'Live'
            : status === 'draft'
              ? 'Draft'
              : 'Needs attention',
        clear: () => setStatus('all'),
      });
    }
    if (access !== 'all') {
      list.push({
        id: 'access',
        label: ACCESS_LABEL[access],
        clear: () => setAccess('all'),
      });
    }
    return list;
  }, [access, status]);

  const clearFilters = useCallback(() => {
    setStatus('all');
    setAccess('all');
    setSort('updated_desc');
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelected(current =>
      current.includes(id)
        ? current.filter(item => item !== id)
        : [...current, id],
    );
  }, []);

  const openBook = useCallback(
    (book: AdminBookRow) => {
      if (selecting) {
        toggleSelected(book.id);
        return;
      }
      navigation.navigate(ADMIN_ROUTES.BOOK_EDITOR, { bookId: book.id });
    },
    [navigation, selecting, toggleSelected],
  );

  /** Long-pressing a row is the shortcut into selection mode. */
  const startSelecting = useCallback((id?: string) => {
    setSelecting(true);
    if (id) {
      setSelected(current =>
        current.includes(id) ? current : [...current, id],
      );
    }
  }, []);

  const stopSelecting = useCallback(() => {
    setSelecting(false);
    setSelected([]);
  }, []);

  const runBulk = (
    changes: { is_published?: boolean; is_premium?: boolean },
    label: string,
  ) => {
    bulkUpdate.mutate(
      { ids: selected, changes },
      {
        onSuccess: result => {
          stopSelecting();
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

  const createForSegment = useCallback(() => {
    if (segment === 'authors') {
      navigation.navigate(ADMIN_ROUTES.AUTHOR_EDITOR, {});
    } else if (segment === 'categories') {
      navigation.navigate(ADMIN_ROUTES.CATEGORY_EDITOR, {});
    } else if (segment === 'shelves') {
      navigation.navigate(ADMIN_ROUTES.COLLECTION_EDITOR, {});
    } else {
      navigation.navigate(ADMIN_ROUTES.BOOK_EDITOR, {});
    }
  }, [navigation, segment]);

  const subtitle =
    segment === 'books'
      ? needsAttention > 0
        ? `${bookTotal} books · ${needsAttention} need attention`
        : `${bookTotal} ${bookTotal === 1 ? 'book' : 'books'}`
      : segment === 'authors'
        ? orphanAuthors > 0
          ? `${authors.data?.length ?? 0} authors · ${orphanAuthors} with no books`
          : `${authors.data?.length ?? 0} in the catalog`
        : segment === 'categories'
          ? `${categories.data?.length ?? 0} categories · the order readers browse`
          : `${collections.data?.length ?? 0} shelves · top to bottom on Home`;

  const renderBook = useCallback(
    ({ item }: { item: AdminBookRow }) => (
      <AdminBookListRow
        book={item}
        selected={selected.includes(item.id)}
        selectionMode={selecting}
        categoryLabel={
          item.category_ids.length > 0
            ? categoryById.get(item.category_ids[0])
            : undefined
        }
        onPress={() => openBook(item)}
        onLongPress={() => startSelecting(item.id)}
      />
    ),
    [categoryById, openBook, selected, selecting, startSelecting],
  );

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.header}>
        {selecting ? (
          <View style={styles.selectionHeader}>
            <View style={styles.grow}>
              <Display size={22} weight="500" tracking={-0.4}>
                {selected.length === 0
                  ? 'Select titles'
                  : `${selected.length} selected`}
              </Display>
              <Text size={12} leading={1.3} tone="muted">
                Tap rows to add or remove
              </Text>
            </View>
            <AdminTextAction label="Done" size={12.5} onPress={stopSelecting} />
          </View>
        ) : (
          <>
            <AdminPageTitle
              title="Library"
              subtitle={subtitle}
              action={<AdminNewButton onPress={createForSegment} />}
            />

            <AdminSegments
              options={SEGMENTS}
              value={segment}
              onChange={setSegment}
            />

            {segment === 'books' ? (
              <>
                <View style={styles.searchRow}>
                  <AdminSearchBar
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search titles, authors, slugs"
                  />
                  <AdminFilterButton
                    count={activeFilters.length}
                    onPress={() => setFiltersOpen(true)}
                  />
                </View>

                <View style={styles.filterRow}>
                  {activeFilters.map(filter => (
                    <AdminActiveFilter
                      key={filter.id}
                      label={filter.label}
                      onClear={filter.clear}
                    />
                  ))}
                  {activeFilters.length > 0 || query ? (
                    <Text size={11.5} leading={1} tone="faint">
                      {`${shown} of ${bookTotal} shown`}
                    </Text>
                  ) : null}
                  <View style={styles.grow} />
                  {rows.length > 0 ? (
                    <AdminTextAction
                      label="Select"
                      size={11.5}
                      onPress={() => startSelecting()}
                    />
                  ) : null}
                </View>
              </>
            ) : segment === 'authors' ? (
              <AdminSearchBar
                value={authorQuery}
                onChangeText={setAuthorQuery}
                placeholder="Search authors"
              />
            ) : null}
          </>
        )}
      </View>

      {segment === 'books' ? (
        books.isLoading ? (
          <View style={styles.gutter}>
            <AdminRowsSkeleton count={5} />
          </View>
        ) : books.error ? (
          <View style={styles.gutter}>
            <AdminErrorState
              message="The request could not be completed. Your connection looks fine, so this is probably the server."
              detail={errorMessage(books.error)}
              onRetry={() => void books.refetch()}
            />
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={item => item.id}
            renderItem={renderBook}
            // Cells are pure, so the list has to be told that a row's selected
            // state lives outside the item it was rendered from.
            extraData={selected}
            ItemSeparatorComponent={ListGap}
            refreshing={books.isRefetching}
            onRefresh={() => void books.refetch()}
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (books.hasNextPage && !books.isFetchingNextPage) {
                void books.fetchNextPage();
              }
            }}
            contentContainerStyle={{
              paddingHorizontal: ADMIN_GUTTER,
              paddingBottom: scrollEndPadding + (selecting ? 160 : 20),
            }}
            ListEmptyComponent={
              <AdminEmpty
                title={
                  query || activeFilters.length
                    ? 'Nothing matches'
                    : 'The library is empty'
                }
                message={
                  query || activeFilters.length
                    ? 'Try a different search, or clear the filters to see the whole catalog.'
                    : 'Add your first title with a PDF and a cover, and it appears on Home the moment you publish it.'
                }
                actionLabel={
                  query || activeFilters.length
                    ? undefined
                    : 'Add the first book'
                }
                onAction={() =>
                  navigation.navigate(ADMIN_ROUTES.BOOK_EDITOR, {})
                }
              />
            }
            ListFooterComponent={
              books.isFetchingNextPage ? (
                <ActivityIndicator
                  style={styles.footer}
                  color={colors.primary}
                />
              ) : null
            }
            style={styles.grow}
          />
        )
      ) : segment === 'authors' ? (
        <LibraryAuthors
          query={debouncedAuthorQuery}
          onOpen={authorId =>
            navigation.navigate(ADMIN_ROUTES.AUTHOR_EDITOR, { authorId })
          }
          onCreate={() => navigation.navigate(ADMIN_ROUTES.AUTHOR_EDITOR, {})}
        />
      ) : segment === 'categories' ? (
        <LibraryCategories
          onOpen={categoryId =>
            navigation.navigate(ADMIN_ROUTES.CATEGORY_EDITOR, { categoryId })
          }
          onCreate={() => navigation.navigate(ADMIN_ROUTES.CATEGORY_EDITOR, {})}
        />
      ) : (
        <LibraryShelves
          onOpen={collectionId =>
            navigation.navigate(ADMIN_ROUTES.COLLECTION_EDITOR, {
              collectionId,
            })
          }
          onCreate={() =>
            navigation.navigate(ADMIN_ROUTES.COLLECTION_EDITOR, {})
          }
        />
      )}

      {/* The bulk bar states the count in words before any destructive action
          is within reach. */}
      {selecting && selected.length > 0 ? (
        <View
          style={[
            styles.bulkBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.borderStrong,
              paddingBottom: Math.max(insets.bottom, 20) + 14,
            },
          ]}
        >
          <View style={styles.bulkHeader}>
            <AdminEyebrow tone="muted">
              {`Apply to ${selected.length} ${selected.length === 1 ? 'title' : 'titles'}`}
            </AdminEyebrow>
            {bulkUpdate.isPending || deleteBooks.isPending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : null}
          </View>

          <View style={styles.bulkActions}>
            <BulkButton
              label="Publish"
              primary
              onPress={() => runBulk({ is_published: true }, 'published')}
            />
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
            <BulkButton
              label="Delete"
              tone="danger"
              onPress={() => setConfirmDelete(true)}
            />
          </View>
        </View>
      ) : null}

      <AdminFilterSheet
        visible={filtersOpen}
        title="Filter books"
        resultLabel={`Show ${shown} ${shown === 1 ? 'book' : 'books'}`}
        onClear={clearFilters}
        onClose={() => setFiltersOpen(false)}
        groups={[
          {
            id: 'status',
            title: 'Status',
            value: status,
            onChange: setStatus,
            options: [
              {
                value: 'all' as BookStatusFilter,
                label: 'All',
                count: bookTotal,
              },
              {
                value: 'published' as BookStatusFilter,
                label: 'Live',
                count: stats?.book_published_count ?? 0,
              },
              {
                value: 'draft' as BookStatusFilter,
                label: 'Draft',
                count: stats?.book_draft_count ?? 0,
              },
              {
                value: 'incomplete' as BookStatusFilter,
                label: 'Needs attention',
                count: needsAttention,
              },
            ],
          },
          {
            id: 'access',
            title: 'Access',
            value: access,
            onChange: setAccess,
            options: (['all', 'premium', 'free'] as BookAccessFilter[]).map(
              value => ({
                value,
                label: ACCESS_LABEL[value],
              }),
            ),
          },
          {
            id: 'sort',
            title: 'Sort',
            value: sort,
            onChange: setSort,
            options: SORT_OPTIONS.map(value => ({
              value,
              label: SORT_LABEL[value],
            })),
          },
        ]}
      />

      <AdminConfirmSheet
        visible={confirmDelete}
        title={`Delete ${selected.length} ${selected.length === 1 ? 'title' : 'titles'}?`}
        message="This cannot be undone. Deleting a book also removes:"
        consequences={[
          "Every reader's progress and bookmarks",
          'Downloads already on readers’ devices',
          'The uploaded PDF and cover',
          'Its place in every shelf',
        ]}
        confirmLabel="Delete"
        destructive
        footnote="Unpublishing hides a title from readers and keeps everything."
        loading={deleteBooks.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          deleteBooks.mutate(selected, {
            onSuccess: count => {
              setConfirmDelete(false);
              stopSelecting();
              toast.success(
                `${count} ${count === 1 ? 'title' : 'titles'} deleted.`,
              );
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
              : colors.control,
          borderColor: danger
            ? colors.dangerBorder
            : primary
              ? colors.selectedBorder
              : colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <Text
        size={13}
        leading={1}
        weight="500"
        tone={danger ? 'danger' : primary ? 'action' : 'soft'}
      >
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
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 13,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 28,
  },
  gutter: {
    paddingHorizontal: ADMIN_GUTTER,
  },
  listGap: {
    height: 9,
  },
  grow: {
    flex: 1,
  },
  footer: {
    paddingVertical: 20,
  },
  bulkBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 18,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
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
});
