import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
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
import { ChevronRight, Plus, X } from 'lucide-react-native';

import { BookCover, Divider, Icon, Text } from '@/components/ui';
import { ADMIN_ROUTES } from '@/constants/routes';
import {
  AdminPickerSheet,
  AdminSearchBar,
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
  AdminEmpty,
  AdminHelper,
  AdminScreenTitle,
  AdminSectionHeader,
  AdminTag,
  AdminTextAction,
} from '@/features/admin/components/AdminUi';
import {
  useDirtyTracker,
  useUnsavedGuard,
} from '@/features/admin/hooks/useAdminForm';
import { useAppInsets } from '@/hooks/useAppInsets';
import {
  useAdminCategories,
  useBookOptions,
  useCategoryBookIds,
  useSetCategoryBooks,
} from '@/hooks/useAdmin';
import { adminCoverUrl, type AdminBookOption } from '@/services/admin';
import { useTheme } from '@/theme/ThemeContext';

import type { AdminLibraryStackParamList } from '../navigation/types';

/** A draft is worth flagging: it carries the tag but is not on Explore yet. */
function bookBadges(book: AdminBookOption | undefined): RowBadge[] {
  if (!book) {
    return [];
  }
  const badges: RowBadge[] = [];
  if (!book.is_published) {
    badges.push({ label: 'DRAFT', tone: 'warning' });
  }
  if (book.is_premium) {
    badges.push({ label: 'PREMIUM', tone: 'premium' });
  }
  return badges;
}

function plural(count: number, noun: string) {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

/**
 * The books in one category.
 *
 * The category editor decides how the tile looks; this page decides what is
 * behind it. Membership is edited as a set — pick any number of titles from
 * the whole catalog, drop any from the list — and written in one call, so
 * tagging twelve books with "History" is one visit here rather than twelve
 * trips through the book editor. There is no order to arrange: Explore sorts a
 * category's books itself.
 */
export function AdminCategoryBooksScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AdminLibraryStackParamList>>();
  const route =
    useRoute<RouteProp<AdminLibraryStackParamList, 'AdminCategoryBooks'>>();
  const { categoryId } = route.params;
  const { colors } = useTheme();
  const { scrollEndPadding } = useAppInsets();
  const toast = useToast();

  const { data: categories = [] } = useAdminCategories();
  const category = categories.find(item => item.id === categoryId);
  const {
    data: memberIds,
    isLoading,
    error,
    refetch,
  } = useCategoryBookIds(categoryId);
  const { data: books = [] } = useBookOptions('');
  const save = useSetCategoryBooks();

  const [bookIds, setBookIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  // Membership is a set: dropping a book and adding it back is no change.
  const membership = useMemo(() => [...bookIds].sort(), [bookIds]);
  const { isDirty, reset, dirtyRef } = useDirtyTracker(membership);
  useUnsavedGuard(dirtyRef);

  useEffect(() => {
    if (memberIds) {
      setBookIds(memberIds);
    }
  }, [memberIds]);

  // Snapshot once the membership has landed so the guard starts clean.
  useEffect(() => {
    if (memberIds) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberIds]);

  const bookById = useMemo(
    () => new Map(books.map(book => [book.id, book])),
    [books],
  );

  // Alphabetical by title, the way readers meet a category on Explore. Books
  // that have not loaded their option row yet sink to the end rather than
  // vanish, so the count on screen always matches what will be saved.
  const members = useMemo(
    () =>
      bookIds
        .map(id => ({ id, book: bookById.get(id) }))
        .sort((a, b) => {
          if (!a.book || !b.book) {
            return Number(!a.book) - Number(!b.book);
          }
          return a.book.title.localeCompare(b.book.title);
        }),
    [bookIds, bookById],
  );

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return members;
    }
    return members.filter(
      ({ book }) =>
        book?.title.toLowerCase().includes(needle) ||
        book?.author_name.toLowerCase().includes(needle),
    );
  }, [members, query]);

  const liveCount = useMemo(
    () => bookIds.filter(id => bookById.get(id)?.is_published ?? true).length,
    [bookIds, bookById],
  );

  // What the save will do, stated on the button: "+3 −1".
  const delta = useMemo(() => {
    const before = new Set(memberIds ?? []);
    const after = new Set(bookIds);
    let added = 0;
    let removed = 0;
    after.forEach(id => {
      if (!before.has(id)) added += 1;
    });
    before.forEach(id => {
      if (!after.has(id)) removed += 1;
    });
    return { added, removed };
  }, [memberIds, bookIds]);

  const pickerItems = useMemo(
    () =>
      books.map(book => ({
        id: book.id,
        label: book.title,
        sublabel: book.author_name,
        coverUrl: adminCoverUrl(book.cover_path),
        coverColor: book.cover_color,
        badges: bookBadges(book),
      })),
    [books],
  );

  const remove = useCallback((id: string) => {
    setBookIds(current => current.filter(item => item !== id));
  }, []);

  const openBook = useCallback(
    (bookId: string) => {
      navigation.navigate(ADMIN_ROUTES.BOOK_EDITOR, { bookId });
    },
    [navigation],
  );

  const handleSave = () => {
    save.mutate(
      { categoryId, bookIds },
      {
        onSuccess: () => {
          reset();
          toast.success(
            `${category?.label ?? 'Category'} now has ${plural(bookIds.length, 'book')}.`,
          );
        },
        onError: caught => toast.error(errorMessage(caught)),
      },
    );
  };

  const label = category?.label ?? 'Category';
  const saveLabel = !isDirty
    ? 'Saved'
    : [
        'Save',
        delta.added ? `+${delta.added}` : null,
        delta.removed ? `−${delta.removed}` : null,
      ]
        .filter(Boolean)
        .join(' ');

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AdminBackLink
          label={label}
          action={
            isDirty ? <AdminTag label="UNSAVED" tone="warning" /> : undefined
          }
        />
      </View>

      <ScrollView
        style={styles.grow}
        contentContainerStyle={{
          paddingHorizontal: ADMIN_GUTTER,
          paddingTop: 16,
          paddingBottom: scrollEndPadding + 80,
          gap: 17,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AdminScreenTitle
          title={`Books in ${label}`}
          subtitle={
            bookIds.length === 0
              ? 'Nothing tagged yet — the tile on Explore opens empty.'
              : `${plural(bookIds.length, 'book')}${
                  liveCount === bookIds.length ? '' : ` · ${liveCount} live`
                } · shown on Explore and in search`
          }
        />

        <AdminButton
          label="Add books"
          Icon={Plus}
          variant="secondary"
          onPress={() => setShowPicker(true)}
        />

        {isLoading ? (
          <AdminMenuSkeleton count={5} height={64} />
        ) : error ? (
          <AdminEmpty
            title="Could not load this category"
            message={errorMessage(error)}
            actionLabel="Try again"
            onAction={() => void refetch()}
          />
        ) : bookIds.length === 0 ? (
          <AdminEmpty
            title="No books yet"
            message="Pick any number of titles from the catalog and they appear under this tile the moment you save."
            actionLabel="Choose books"
            onAction={() => setShowPicker(true)}
          />
        ) : (
          <View style={styles.block}>
            <AdminSectionHeader
              title={
                query.trim()
                  ? `${shown.length} of ${bookIds.length} shown`
                  : 'Tagged with this category'
              }
              action={
                bookIds.length > 1 ? (
                  <AdminTextAction
                    label="Remove all"
                    destructive
                    size={11.5}
                    onPress={() => setBookIds([])}
                  />
                ) : undefined
              }
            />

            {bookIds.length > 8 ? (
              <AdminSearchBar
                value={query}
                onChangeText={setQuery}
                placeholder="Filter this list"
              />
            ) : null}

            {shown.length === 0 ? (
              <View
                style={[
                  styles.empty,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text size={12.5} leading={1.45} align="center" tone="muted">
                  No title in this category matches “{query.trim()}”.
                </Text>
              </View>
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
                {shown.map(({ id, book }, index) => (
                  <Fragment key={id}>
                    {index > 0 ? <Divider /> : null}
                    <MemberRow
                      id={id}
                      book={book}
                      onOpen={openBook}
                      onRemove={remove}
                    />
                  </Fragment>
                ))}
              </View>
            )}

            <AdminHelper>
              Removing a book here only takes this tag off it — the book itself
              and its other categories are kept. Drafts keep the tag but stay
              off Explore until published.
            </AdminHelper>
          </View>
        )}
      </ScrollView>

      <AdminActionBar>
        <AdminButton
          label={saveLabel}
          loading={save.isPending}
          disabled={!isDirty}
          onPress={handleSave}
        />
      </AdminActionBar>

      <AdminPickerSheet
        visible={showPicker}
        title={`Books in ${label}`}
        multi
        items={pickerItems}
        selected={bookIds}
        emptyLabel="No books in the catalog yet."
        onClose={() => setShowPicker(false)}
        onChange={setBookIds}
      />
    </SafeAreaView>
  );
}

/**
 * One tagged book. The row opens the book; the × takes the tag off. A book
 * whose option row has not loaded yet still shows, as an unnamed placeholder,
 * so nothing that will be saved is ever hidden from view.
 */
const MemberRow = memo(function MemberRow({
  id,
  book,
  onOpen,
  onRemove,
}: {
  id: string;
  book: AdminBookOption | undefined;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { colors } = useTheme();
  const title = book?.title ?? 'Loading title…';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
      onPress={() => onOpen(id)}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors.primaryFillSoft },
      ]}
    >
      <BookCover
        width={30}
        coverUrl={adminCoverUrl(book?.cover_path)}
        coverColor={book?.cover_color ?? undefined}
      />

      <View style={styles.body}>
        <Text size={13.5} leading={1.2} numberOfLines={1}>
          {title}
        </Text>
        {book?.author_name ? (
          <Text size={11} leading={1.2} tone="faint" numberOfLines={1}>
            {book.author_name}
          </Text>
        ) : null}
        <RowBadges badges={bookBadges(book)} />
      </View>

      <Icon icon={ChevronRight} size={15} color={colors.dim} strokeWidth={2} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${title} from this category`}
        onPress={() => onRemove(id)}
        hitSlop={10}
        style={styles.remove}
      >
        <Icon icon={X} size={13} tone="danger" strokeWidth={2.4} />
      </Pressable>
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
  empty: {
    padding: 22,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderStyle: 'dashed',
  },
});
