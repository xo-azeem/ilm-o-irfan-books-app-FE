import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowUpDown, Plus, SlidersHorizontal, X } from 'lucide-react-native';

import { ListRowsSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { DisplayText, Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import { AdminBookListRow } from '@/features/admin/components/AdminBookRow';
import {
  AdminChipRow,
  AdminConfirmSheet,
  AdminPickerSheet,
  AdminSearchBar,
  AdminSegmented,
} from '@/features/admin/components/AdminControls';
import { errorMessage, useToast } from '@/features/admin/components/AdminToast';
import {
  AdminBadge,
  AdminEmpty,
  AdminErrorState,
  AdminTextAction,
  DANGER,
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
  const { scrollEndPadding } = useAppInsets();
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
    <SafeAreaView className="flex-1 bg-app-bg dark:bg-app-bg-dark" edges={['top', 'left', 'right']}>
      <View className="px-5 pt-1">
        <View className="mb-4 flex-row items-end justify-between gap-4">
          <View className="flex-1 gap-1">
            <DisplayText className="text-[34px] font-bold leading-[41px] tracking-tight text-app-ink dark:text-app-ink-dark">
              Books
            </DisplayText>
            <Text className="text-[14px] text-app-muted dark:text-app-muted-dark">
              {total} {total === 1 ? 'title' : 'titles'} in the catalog
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate(ADMIN_ROUTES.BOOK_EDITOR, {})}
            className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: colors.primary }}>
            <Plus size={21} color={colors.onPrimary} strokeWidth={2.4} />
          </Pressable>
        </View>

        <AdminSearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search title, author, or slug"
        />

        <View className="mb-3">
          <AdminSegmented options={STATUS_OPTIONS} value={status} onChange={setStatus} />
        </View>

        <View className="mb-3 flex-row items-center gap-3">
          <Pressable
            onPress={() => setShowFilters(current => !current)}
            className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5 active:opacity-70"
            style={{ backgroundColor: activeFilterCount ? colors.primary : colors.fill }}>
            <SlidersHorizontal
              size={14}
              color={activeFilterCount ? colors.onPrimary : colors.ink}
              strokeWidth={2.2}
            />
            <Text
              className="text-[12px] font-medium"
              style={{ color: activeFilterCount ? colors.onPrimary : colors.ink }}>
              Filters{activeFilterCount ? ` · ${activeFilterCount}` : ''}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSortOpen(true)}
            className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5 active:opacity-70"
            style={{ backgroundColor: colors.fill }}>
            <ArrowUpDown size={14} color={colors.ink} strokeWidth={2.2} />
            <Text className="text-[12px] font-medium text-app-ink dark:text-app-ink-dark">
              {SORT_LABELS[sort]}
            </Text>
          </Pressable>

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
          <View className="mb-3 gap-3 rounded-[14px] bg-app-surface p-3 dark:bg-app-surface-dark">
            <AdminSegmented options={ACCESS_OPTIONS} value={access} onChange={setAccess} />

            <View className="gap-1.5">
              <Text className="px-1 text-[11px] font-semibold uppercase tracking-widest text-app-faint dark:text-app-faint-dark">
                Category
              </Text>
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
              className="flex-row items-center justify-between rounded-[10px] px-3 py-2.5 active:opacity-70"
              style={{ backgroundColor: colors.fill }}>
              <Text className="text-[13px] text-app-muted dark:text-app-muted-dark">Author</Text>
              <Text className="text-[13px] font-medium text-app-ink dark:text-app-ink-dark">
                {authors.find(author => author.id === authorId)?.name ?? 'Any author'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <View className="px-5">
          <ListRowsSkeleton rows={8} />
        </View>
      ) : error ? (
        <View className="px-5">
          <AdminErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              void fetchNextPage();
            }
          }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: scrollEndPadding + (selectionMode ? 76 : 0),
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
              <ActivityIndicator className="py-5" color={colors.primary} />
            ) : null
          }
          style={{ flex: 1 }}
        />
      )}

      {selectionMode ? (
        <View
          className="absolute inset-x-0 bottom-0 gap-2 border-t px-5 pb-6 pt-3"
          style={{ backgroundColor: colors.chrome, borderColor: colors.border }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <AdminBadge label={`${selected.length} selected`} tone="accent" />
              {bulkUpdate.isPending || deleteBooks.isPending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : null}
            </View>
            <Pressable onPress={() => setSelected([])} hitSlop={8} className="active:opacity-60">
              <X size={19} color={colors.muted} strokeWidth={2.2} />
            </Pressable>
          </View>

          <View className="flex-row flex-wrap gap-2">
            <BulkButton label="Publish" onPress={() => runBulk({ is_published: true }, 'published')} />
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

function BulkButton({
  label,
  onPress,
  tone,
}: {
  label: string;
  onPress: () => void;
  tone?: 'danger';
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      className="rounded-full px-3.5 py-2 active:opacity-70"
      style={{ backgroundColor: tone === 'danger' ? `${DANGER}22` : colors.fill }}>
      <Text
        className="text-[13px] font-medium"
        style={{ color: tone === 'danger' ? DANGER : colors.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}
