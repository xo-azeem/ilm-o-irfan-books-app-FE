import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LayoutGrid, SlidersHorizontal } from 'lucide-react-native';

import type { RootStackParamList } from '@/app/navigation/types';
import { BookListRow, type BookSummary } from '@/components/books';
import { Screen, ScreenHeader } from '@/components/layout';
import { ListSkeleton } from '@/components/skeletons/CatalogSkeletons';
import {
  Chip,
  ChipRow,
  ChipWrap,
  IconButton,
  Label,
  SearchField,
  Text,
  TextButton,
  useSheet,
  type LucideIcon,
} from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { EditorsShelf } from '@/features/search/components/EditorsShelf';
import { FilterSheet } from '@/features/search/components/FilterSheet';
import {
  SearchSuggestions,
  type Suggestion,
} from '@/features/search/components/SearchSuggestions';
import { SubjectPanel } from '@/features/search/components/SubjectPanel';
import {
  tokenKey,
  tokenLabel,
  useSearchFilters,
  type FilterToken,
} from '@/features/search/hooks/useSearchFilters';
import { useRecentSearches } from '@/features/search/hooks/useRecentSearches';
import { useLibrary } from '@/hooks/useAccount';
import { useCatalogFeed, useCategories, useHomeCatalog } from '@/hooks/useCatalog';
import type { CatalogBook } from '@/services/catalog';
import { isUrduTitle } from '@/services/script';
import { layout } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize } from '@/theme/typography';

/** Adapts a catalog row for the shared book components. */
function toSummary(book: CatalogBook, inLibrary = false): BookSummary {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
    coverColor: book.coverColor,
    coverColorDark: book.coverColorDark,
    isPremium: book.isPremium,
    inLibrary,
    isUrdu: isUrduTitle(book.title),
    meta: book.author ? `${book.author} · ${book.readTime}` : book.readTime,
  };
}

const MAX_SUGGESTIONS = 3;

/**
 * How many rows the client-side filters have to leave on screen before the
 * list stops pulling further pages in on their behalf.
 *
 * Language, length, access and rating are applied to the page the backend
 * sent, so a strict combination can empty an otherwise full page. Rather than
 * showing "nothing matched" over a catalogue that has more pages waiting, the
 * list keeps asking for the next one until it has a screenful or the catalogue
 * runs out.
 */
const MIN_FILTERED_ROWS = 8;

/**
 * Discover.
 *
 * One list, paged from the backend, with the whole catalogue underneath it: the
 * search field narrows it, the subject panel and the filter sheet narrow it
 * further, and clearing everything leaves the complete catalogue to scroll.
 * Only the subject reaches the database — the rest refine the pages it sends —
 * so all of it lives in one filter object that the sheet, the panel and the
 * chip row share.
 */
export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const filterSheet = useSheet();

  const { data: categories = [] } = useCategories();
  const { data: home } = useHomeCatalog();
  const { data: library } = useLibrary();
  const { recents, remember, clear } = useRecentSearches();

  const downloadedIds = useMemo(
    () => new Set((library?.downloads ?? []).map(book => book.id)),
    [library?.downloads],
  );
  // "In your library" means the reader has opened it at all, so both shelves
  // count — a finished book is still in the library.
  const libraryIds = useMemo(
    () =>
      new Set(
        [...(library?.reading ?? []), ...(library?.finished ?? [])].map(book => book.id),
      ),
    [library?.finished, library?.reading],
  );

  const {
    filters,
    tokens,
    activeCount,
    serverFilters,
    apply,
    remove,
    reset,
    setCategory,
    toggleLanguage,
    toggleLength,
    setMembershipOnly,
    setDownloadedOnly,
    setHighlyRatedOnly,
  } = useSearchFilters(downloadedIds);

  const {
    data,
    isPending,
    isFetchingNextPage,
    isRefetching,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useCatalogFeed(query, serverFilters);

  const books = useMemo(() => data?.pages.flatMap(page => page.data) ?? [], [data]);

  // `countIsLocal` is the filters' own verdict on whether the backend applied
  // the query they sent. When it did, nothing is dropped here and the count
  // below is the server's real total; when it did not, the only honest number
  // is the one on screen.
  const { rows: filtered, countIsLocal } = useMemo(() => apply(books), [apply, books]);

  /** What the backend says the whole result set is, before the local filters. */
  const totalCount = data?.pages[0]?.totalCount ?? null;
  const shownCount = countIsLocal || totalCount == null ? filtered.length : totalCount;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // A page the local filters emptied is not the end of the catalogue, so keep
  // pulling until there is a screenful to show or there are no pages left.
  // Once the backend answers the query itself this stops firing: it drops
  // nothing, so the page is never thin for this reason.
  useEffect(() => {
    if (countIsLocal && filtered.length < MIN_FILTERED_ROWS) {
      loadMore();
    }
  }, [countIsLocal, filtered.length, loadMore]);

  const searching = focused || query.trim().length > 0;
  const browsing = !searching && activeCount === 0;

  const suggestions = useMemo<Suggestion[]>(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) {
      return [];
    }

    const titles = books
      .filter(book => book.title.toLowerCase().includes(term))
      .slice(0, MAX_SUGGESTIONS)
      .map<Suggestion>(book => ({ kind: 'query', value: book.title }));

    // One author match, so the reader can jump to a body of work rather than a
    // single title. De-duplicated against the title suggestions above.
    const author = books.find(book => book.author?.toLowerCase().includes(term));

    return author
      ? [...titles.slice(0, MAX_SUGGESTIONS - 1), { kind: 'author', value: author.author }]
      : titles;
  }, [books, query]);

  const openBook = useCallback(
    (book: { id: string }) => {
      if (query.trim()) {
        remember(query.trim());
      }
      navigation.navigate(ROUTES.BOOK_DETAIL, { bookId: book.id });
    },
    [navigation, query, remember],
  );

  const cancelSearch = useCallback(() => {
    setQuery('');
    setFocused(false);
  }, []);

  const handleSuggestion = useCallback((suggestion: Suggestion) => {
    setQuery(suggestion.value);
  }, []);

  const toggleSubjects = useCallback(() => setSubjectsOpen(open => !open), []);

  /** Picking a subject closes the panel, so the results are what it reveals. */
  const handleSubject = useCallback(
    (id: string | null) => {
      setCategory(id);
      setSubjectsOpen(false);
    },
    [setCategory],
  );

  const subjectName = useCallback(
    (id: string) => categories.find(category => category.id === id)?.label,
    [categories],
  );

  const renderItem = useCallback(
    ({ item }: { item: CatalogBook }) => (
      <BookListRow book={toSummary(item, libraryIds.has(item.id))} onPress={openBook} />
    ),
    [libraryIds, openBook],
  );

  /**
   * Discover's pick is the editor's own hero shelf — the `home-hero`
   * collection, in the order an admin put it in — not a book this screen chose
   * for itself. The backend keeps that shelf populated, falling back to the
   * newest published books when the collection is empty, so it is read as a
   * plain list rather than being hidden on an empty one.
   */
  const editorsPick = useMemo<BookSummary | null>(() => {
    const book = home?.hero?.[0];
    return book ? toSummary(book, libraryIds.has(book.id)) : null;
  }, [home?.hero, libraryIds]);

  const header = (
    <View style={styles.header}>
      {!searching ? <ScreenHeader title="Discover" /> : null}

      <View style={styles.searchRow}>
        <SearchField
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onClear={() => setQuery('')}
          placeholder="Search books, authors, subjects…"
          returnKeyType="search"
          onSubmitEditing={() => query.trim() && remember(query.trim())}
          style={styles.grow}
        />
        {searching ? <TextButton label="Cancel" tone="muted" onPress={cancelSearch} /> : null}
      </View>

      <ChipRow gap={9}>
        <IconControl
          icon={SlidersHorizontal}
          label="Filters"
          active={activeCount > 0}
          onPress={filterSheet.open}
        />
        <IconControl
          icon={LayoutGrid}
          label="Browse by subject"
          active={subjectsOpen || filters.categoryId != null}
          onPress={toggleSubjects}
        />

        {tokens.map(token => (
          <FilterChip
            key={tokenKey(token)}
            token={token}
            label={tokenLabel(token, subjectName)}
            onRemove={remove}
          />
        ))}

        {activeCount > 1 ? <TextButton label="Clear all" tone="muted" onPress={reset} /> : null}
      </ChipRow>

      <SubjectPanel
        open={subjectsOpen}
        categories={categories}
        selectedId={filters.categoryId}
        onSelect={handleSubject}
      />

      {searching ? (
        <SearchSuggestions
          query={query.trim()}
          suggestions={suggestions}
          onSelect={handleSuggestion}
        />
      ) : null}

      {browsing && editorsPick ? (
        <EditorsShelf book={editorsPick} onPress={openBook} />
      ) : null}

      <Label>
        {isPending && filtered.length === 0
          ? 'Books'
          : `Books · ${shownCount.toLocaleString('en-US')}`}
      </Label>

      {isPending && books.length === 0 ? <ListSkeleton count={4} /> : null}
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      {isFetchingNextPage ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : null}

      {recents.length > 0 && searching ? (
        <View style={styles.section}>
          <View style={styles.recentHeader}>
            <Label>Recent</Label>
            <TextButton label="Clear" tone="muted" onPress={clear} />
          </View>
          <ChipWrap gap={9}>
            {recents.map(term => (
              <Chip key={term} label={term} size="sm" onPress={() => setQuery(term)} />
            ))}
          </ChipWrap>
        </View>
      ) : null}
    </View>
  );

  return (
    <>
      <Screen scrollable={false} padding={0}>
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={ListGap}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          ListEmptyComponent={
            isPending || isFetchingNextPage ? null : (
              <Text
                size={fontSize.bodySmall}
                leading={1.6}
                align="center"
                tone="muted"
                style={styles.noResults}>
                {query.trim() || activeCount > 0
                  ? 'Nothing matched that. Try a different word, or clear your filters.'
                  : 'No published books are available yet.'}
              </Text>
            )
          }
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          // Well before the last row, so the next page lands under the reader
          // rather than after they hit the bottom and wait for it.
          onEndReachedThreshold={0.8}
          onEndReached={loadMore}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          windowSize={9}
          style={styles.grow}
          contentContainerStyle={styles.list}
        />
      </Screen>

      <FilterSheet
        visible={filterSheet.visible}
        onClose={filterSheet.close}
        filters={filters}
        categories={categories}
        resultCount={shownCount}
        onReset={reset}
        onCategoryChange={setCategory}
        onToggleLanguage={toggleLanguage}
        onToggleLength={toggleLength}
        onMembershipOnlyChange={setMembershipOnly}
        onDownloadedOnlyChange={setDownloadedOnly}
        onHighlyRatedOnlyChange={setHighlyRatedOnly}
      />
    </>
  );
}

/**
 * A control in the bar under the search field: the icon alone, with a dot when
 * it has something to say. Filters and subjects are both openers, not states,
 * so neither carries a label — what is selected is shown by the chips beside
 * them.
 */
function IconControl({
  icon,
  label,
  active,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <IconButton
      icon={icon}
      buttonSize={36}
      size={15}
      variant={active ? 'primary' : 'secondary'}
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    />
  );
}

/** An active filter. Tapping it takes that one filter off. */
function FilterChip({
  token,
  label,
  onRemove,
}: {
  token: FilterToken;
  label: string;
  onRemove: (token: FilterToken) => void;
}) {
  const handlePress = useCallback(() => onRemove(token), [onRemove, token]);
  return (
    <Chip
      label={label}
      count="✕"
      selected
      size="sm"
      onPress={handlePress}
      accessibilityLabel={`Remove filter ${label}`}
    />
  );
}

function ListGap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 12,
  },
  header: {
    gap: 20,
    paddingBottom: 14,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  grow: {
    flex: 1,
  },
  section: {
    gap: 12,
  },
  gap: {
    height: 14,
  },
  footer: {
    gap: 20,
    paddingTop: 18,
  },
  spinner: {
    alignSelf: 'center',
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noResults: {
    paddingVertical: 28,
  },
});
