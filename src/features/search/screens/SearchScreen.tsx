import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Shapes, SlidersHorizontal } from 'lucide-react-native';

import type { RootStackParamList } from '@/app/navigation/types';
import {
  BookListLayoutToggle,
  useBookListLayout,
  useBookListRendering,
  type BookSummary,
} from '@/components/books';
import { Screen, ScreenHeader } from '@/components/layout';
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
import { CarouselMarquee } from '@/features/search/components/CarouselMarquee';
import { FilterSheet } from '@/features/search/components/FilterSheet';
import {
  SearchSuggestions,
  type Suggestion,
} from '@/features/search/components/SearchSuggestions';
import { BrowseDrawer } from '@/features/search/components/BrowseDrawer';
import {
  tokenKey,
  tokenLabel,
  useSearchFilters,
  type FilterToken,
} from '@/features/search/hooks/useSearchFilters';
import { useRecentSearches } from '@/features/search/hooks/useRecentSearches';
import { useLibrary } from '@/hooks/useAccount';
import { useStrings } from '@/i18n';
import {
  useCatalogFeed,
  useCategories,
  useCollections,
  useHomeCatalog,
} from '@/hooks/useCatalog';
import type {
  CatalogBook,
  CatalogCategory,
  CatalogCollection,
  CatalogSlide,
} from '@/services/catalog';
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

/** Module-level so the list is not handed a new function every render. */
const keyExtractor = (item: BookSummary) => item.id;

/**
 * One row's adapted summary, remembered against the catalogue row it came
 * from. `BookListRow` is memoised on its `book` prop, so the same catalogue row
 * must map to the same summary object across renders or every keystroke would
 * re-render every mounted row. React Query keeps the row references stable
 * between refetches (structural sharing), which is what makes this cache hit.
 */
type SummaryEntry = {
  source: CatalogBook;
  inLibrary: boolean;
  summary: BookSummary;
};

/** A book's title and author lower-cased once, for the suggestion scan. */
type SuggestionIndexEntry = {
  book: CatalogBook;
  title: string;
  author: string;
};

/** The space between the header's rows. */
const HEADER_GAP = 20;

/** Stable empty lists, so the hooks below do not see a new array every render. */
const EMPTY_CAROUSEL: CatalogSlide[] = [];
const EMPTY_CATEGORIES: CatalogCategory[] = [];
const EMPTY_COLLECTIONS: CatalogCollection[] = [];

/**
 * How many rows the downloaded filter has to leave on screen before the list
 * stops pulling further pages in on its behalf.
 *
 * Reached only with "Downloaded only" on — the one filter the catalogue
 * endpoints cannot answer, so it is applied to the page that arrives and can
 * empty an otherwise full one. Rather than showing "nothing matched" over a
 * catalogue with more pages waiting, the list keeps asking for the next one
 * until it has a screenful or the catalogue runs out.
 */
const MIN_FILTERED_ROWS = 8;

/**
 * Discover.
 *
 * One list, paged from the backend, with the whole catalogue underneath it: the
 * search field narrows it, the browse drawer and the filter sheet narrow it
 * further, and clearing everything leaves the complete catalogue to scroll.
 *
 * Every filter and the ordering are the database's — applied before the page is
 * cut, so the count under the field is the true number of matches and paging a
 * filtered list cannot repeat or skip a book. All of it lives in one filter
 * object that the sheet, the panel and the chip row share. The single exception
 * is "Downloaded only", which is this device's state and nothing the public
 * catalogue can know.
 */
export function SearchScreen() {
  const s = useStrings();
  const words = s.catalog.discover;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();

  // `query` is the live text, for the suggestions and the Cancel affordance;
  // `term` is what the field has settled on and the only thing the server
  // hears. The field holds each keystroke back for its own beat and reports
  // the term once — straight away on the return key or the clear button.
  const [query, setQuery] = useState('');
  const [term, setTerm] = useState('');
  const [focused, setFocused] = useState(false);
  const filterSheet = useSheet();
  const browseDrawer = useSheet();

  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES;
  // Read alongside the categories, so the drawer opens full the first time
  // rather than after a round trip of its own.
  const collectionsQuery = useCollections();
  const collections = collectionsQuery.data ?? EMPTY_COLLECTIONS;
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
        [...(library?.reading ?? []), ...(library?.finished ?? [])].map(
          book => book.id,
        ),
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
    setSort,
  } = useSearchFilters(downloadedIds);

  const {
    data,
    isPending,
    isPlaceholderData,
    isFetchingNextPage,
    isRefetching,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useCatalogFeed(term, serverFilters);

  const books = useMemo(
    () => data?.pages.flatMap(page => page.data) ?? [],
    [data],
  );

  // Nothing is dropped here unless "Downloaded only" is on — every other
  // filter was applied before the page was cut. `countIsLocal` says which of
  // those two the list is looking at.
  const { rows: filtered, countIsLocal } = useMemo(
    () => apply(books),
    [apply, books],
  );

  /**
   * The backend's own count of the matches — the real size of the filtered set,
   * not the length of the pages fetched so far.
   */
  const totalCount = data?.pages[0]?.totalCount ?? null;
  const shownCount =
    countIsLocal || totalCount == null ? filtered.length : totalCount;

  // `onEndReached` fires repeatedly through a momentum scroll. `cancelRefetch:
  // false` makes a second call while a page is in flight join that request
  // rather than abort and restart it — the default would. Placeholder data is
  // never paged: its `hasNextPage` belongs to the previous query.
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isPlaceholderData) {
      void fetchNextPage({ cancelRefetch: false });
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isPlaceholderData]);

  // A page the downloaded filter emptied is not the end of the catalogue, so
  // keep pulling until there is a screenful to show or there are no pages left.
  // With the toggle off this never fires: nothing is dropped, so a thin page
  // means the catalogue itself has run out.
  useEffect(() => {
    if (countIsLocal && filtered.length < MIN_FILTERED_ROWS) {
      loadMore();
    }
  }, [countIsLocal, filtered.length, loadMore]);

  const searching = focused || query.trim().length > 0;
  const browsing = !searching && activeCount === 0;

  // Lower-cased once per page load, not once per book per keystroke.
  const suggestionIndex = useMemo<SuggestionIndexEntry[]>(
    () =>
      books.map(book => ({
        book,
        title: book.title.toLowerCase(),
        author: book.author?.toLowerCase() ?? '',
      })),
    [books],
  );

  const suggestions = useMemo<Suggestion[]>(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) {
      return [];
    }

    const titles: Suggestion[] = [];
    for (const entry of suggestionIndex) {
      if (titles.length === MAX_SUGGESTIONS) {
        break;
      }
      if (entry.title.includes(term)) {
        titles.push({ kind: 'query', value: entry.book.title });
      }
    }

    // One author match, so the reader can jump to a body of work rather than a
    // single title. De-duplicated against the title suggestions above.
    const author = suggestionIndex.find(
      entry => entry.author && entry.author.includes(term),
    )?.book.author;

    return author
      ? [
          ...titles.slice(0, MAX_SUGGESTIONS - 1),
          { kind: 'author', value: author },
        ]
      : titles;
  }, [suggestionIndex, query]);

  // Read through a ref so `openBook` — and with it every row's `onPress` — does
  // not change identity on each keystroke.
  const queryRef = useRef(query);
  queryRef.current = query;

  const openBook = useCallback(
    (book: { id: string }) => {
      const term = queryRef.current.trim();
      if (term) {
        remember(term);
      }
      navigation.navigate(ROUTES.BOOK_DETAIL, { bookId: book.id });
    },
    [navigation, remember],
  );

  const handleRefresh = useCallback(() => void refetch(), [refetch]);

  // The term is reset here as well as through the field, so the full
  // catalogue is back the moment Cancel is tapped rather than a beat later.
  const cancelSearch = useCallback(() => {
    setQuery('');
    setTerm('');
    setFocused(false);
  }, []);

  const handleSuggestion = useCallback((suggestion: Suggestion) => {
    setQuery(suggestion.value);
  }, []);

  const handleFocus = useCallback(() => setFocused(true), []);

  /** The return key files the term under Recent; the search itself is the field's. */
  const rememberQuery = useCallback(() => {
    const value = queryRef.current.trim();
    if (value) {
      remember(value);
    }
  }, [remember]);

  // A collection is a page of its own, not a filter on this list.
  const openCollection = useCallback(
    (collectionId: string) =>
      navigation.navigate(ROUTES.COLLECTION, { collectionId }),
    [navigation],
  );

  const subjectName = useCallback(
    (id: string) => categories.find(category => category.id === id)?.label,
    [categories],
  );

  // The rows the list draws, adapted once each. A summary is rebuilt only when
  // its catalogue row or library flag changes, so a keystroke, a new page or a
  // focus change leaves the mounted rows' props identical and `BookListRow`'s
  // memo holds.
  const summaryCache = useRef(new Map<string, SummaryEntry>());
  const rows = useMemo(() => {
    const previous = summaryCache.current;
    const next = new Map<string, SummaryEntry>();
    const summaries = filtered.map(book => {
      const inLibrary = libraryIds.has(book.id);
      const hit = previous.get(book.id);
      const entry =
        hit && hit.source === book && hit.inLibrary === inLibrary
          ? hit
          : { source: book, inLibrary, summary: toSummary(book, inLibrary) };
      next.set(book.id, entry);
      return entry.summary;
    });
    summaryCache.current = next;
    return summaries;
  }, [filtered, libraryIds]);

  // Rows or tiles, as the reader last chose on any list in the app.
  const { bookLayout } = useBookListLayout();
  const rendering = useBookListRendering({ bookLayout, onPressBook: openBook });

  /**
   * Discover's rail is the home carousel — the admin's slides, or the backend's
   * weekly draw when none are curated — in the order the backend sent them.
   * It is read straight out of the `home-feed` payload React Query already
   * holds for Home, so this screen makes no request of its own for it.
   */
  const carousel = home?.carousel ?? EMPTY_CAROUSEL;

  const openSlide = useCallback(
    (slide: CatalogSlide) =>
      navigation.navigate(ROUTES.BOOK_DETAIL, { bookId: slide.bookId }),
    [navigation],
  );

  // The filter, category and layout controls sit at the top right of the
  // screen, beside the title. While searching the title is gone — "Cancel"
  // takes its place next to the field — so they drop into the chip row to
  // stay within reach.
  const controls = (
    <View style={styles.controls}>
      <IconControl
        icon={SlidersHorizontal}
        label={words.filters}
        active={activeCount > 0}
        onPress={filterSheet.open}
      />
      <IconControl
        icon={Shapes}
        label={words.browseBySubject}
        active={filters.categoryId != null}
        onPress={browseDrawer.open}
      />
      <BookListLayoutToggle />
    </View>
  );

  const header = (
    <View style={styles.header}>
      {!searching ? (
        <ScreenHeader title={words.title} action={controls} />
      ) : null}

      <View style={styles.searchRow}>
        <SearchField
          value={query}
          onChangeText={setQuery}
          onSearch={setTerm}
          onFocus={handleFocus}
          placeholder={words.searchPlaceholder}
          onSubmitEditing={rememberQuery}
          style={styles.grow}
        />
        {searching ? (
          <TextButton
            label={words.cancel}
            tone="muted"
            onPress={cancelSearch}
          />
        ) : null}
      </View>

      {searching || tokens.length > 0 ? (
        <ChipRow gap={9}>
          {searching ? controls : null}

          {tokens.map(token => (
            <FilterChip
              key={tokenKey(token)}
              token={token}
              label={tokenLabel(token, subjectName, s)}
              onRemove={remove}
            />
          ))}

          {activeCount > 1 ? (
            <TextButton label={words.clearAll} tone="muted" onPress={reset} />
          ) : null}
        </ChipRow>
      ) : null}

      {searching ? (
        <SearchSuggestions
          query={query.trim()}
          suggestions={suggestions}
          onSelect={handleSuggestion}
        />
      ) : null}

      {browsing && carousel.length > 0 ? (
        <CarouselMarquee slides={carousel} onPress={openSlide} />
      ) : null}

      <View style={styles.labelRow}>
        <Label>{words.allBooks}</Label>
        {isPlaceholderData ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : null}
      </View>

      {isPending && books.length === 0 ? rendering.skeleton : null}
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
            <Label>{words.recent}</Label>
            <TextButton label={words.clear} tone="muted" onPress={clear} />
          </View>
          <ChipWrap gap={9}>
            {recents.map(term => (
              <Chip
                key={term}
                label={term}
                size="sm"
                onPress={() => setQuery(term)}
              />
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
          key={rendering.listKey}
          data={rows}
          keyExtractor={keyExtractor}
          renderItem={rendering.renderItem}
          numColumns={rendering.columns}
          columnWrapperStyle={rendering.columnWrapperStyle}
          ItemSeparatorComponent={rendering.ItemSeparatorComponent}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          ListEmptyComponent={
            isPending || isPlaceholderData || isFetchingNextPage ? null : (
              <Text
                size={fontSize.bodySmall}
                leading={1.6}
                align="center"
                tone="muted"
                style={styles.noResults}
              >
                {query.trim() || activeCount > 0
                  ? words.nothingMatched
                  : words.noBooksYet}
              </Text>
            )
          }
          // A new term's fetch also counts as a refetch while the old pages
          // stand in for it; that one is shown beside the label, not as a pull.
          refreshing={isRefetching && !isPlaceholderData}
          onRefresh={handleRefresh}
          // Well before the last row, so the next page lands under the reader
          // rather than after they hit the bottom and wait for it.
          onEndReachedThreshold={0.8}
          onEndReached={loadMore}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          initialNumToRender={rendering.initialNumToRender}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
          windowSize={9}
          style={styles.grow}
          contentContainerStyle={styles.list}
        />
      </Screen>

      <BrowseDrawer
        visible={browseDrawer.visible}
        onClose={browseDrawer.close}
        categories={categories}
        collections={collections}
        isPending={categoriesQuery.isPending || collectionsQuery.isPending}
        isError={categoriesQuery.isError || collectionsQuery.isError}
        selectedCategoryId={filters.categoryId}
        onSelectCategory={setCategory}
        onOpenCollection={openCollection}
      />

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
        onSortChange={setSort}
        searching={query.trim().length > 0}
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
  const s = useStrings();
  const handlePress = useCallback(() => onRemove(token), [onRemove, token]);
  return (
    <Chip
      label={label}
      count="✕"
      selected
      size="sm"
      onPress={handlePress}
      accessibilityLabel={s.catalog.discover.removeFilter(label)}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 12,
  },
  header: {
    gap: HEADER_GAP,
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
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  section: {
    gap: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
