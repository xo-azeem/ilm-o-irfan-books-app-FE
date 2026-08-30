import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SlidersHorizontal } from 'lucide-react-native';

import type { RootStackParamList } from '@/app/navigation/types';
import { BookListRow, CategoryTile, type BookSummary } from '@/components/books';
import { Screen, ScreenHeader } from '@/components/layout';
import { ListSkeleton } from '@/components/skeletons/CatalogSkeletons';
import {
  Chip,
  ChipRow,
  ChipWrap,
  Label,
  SearchField,
  Text,
  TextButton,
  useSheet,
} from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { EditorsShelf } from '@/features/search/components/EditorsShelf';
import { FilterSheet } from '@/features/search/components/FilterSheet';
import {
  SearchSuggestions,
  type Suggestion,
} from '@/features/search/components/SearchSuggestions';
import { useSearchFilters } from '@/features/search/hooks/useSearchFilters';
import { useRecentSearches } from '@/features/search/hooks/useRecentSearches';
import { useLibrary } from '@/hooks/useAccount';
import { useCatalogSearch, useCategories, useHomeCatalog } from '@/hooks/useCatalog';
import type { CatalogBook } from '@/services/catalog';
import { isUrduTitle } from '@/services/script';
import { layout } from '@/theme/palette';
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
    price: book.price,
    currency: book.currency,
    inLibrary,
    isUrdu: isUrduTitle(book.title),
    meta: book.author ? `${book.author} · ${book.readTime}` : book.readTime,
  };
}

const MAX_SUGGESTIONS = 3;

/**
 * Discover.
 *
 * The tab is a browsing surface first: subjects, an editorial pick and the
 * filters that matter. Typing switches the whole page into a results view, and
 * cancelling returns it — one screen, two modes, no navigation.
 */
export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width: screenWidth } = useWindowDimensions();

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const filterSheet = useSheet();

  const { data: categories = [] } = useCategories();
  const { data: home } = useHomeCatalog();
  const { data: library } = useLibrary();
  const { data: results = [], isPending } = useCatalogSearch(query);
  const { recents, remember, clear } = useRecentSearches();

  const downloadedIds = useMemo(
    () => new Set((library?.downloads ?? []).map(book => book.id)),
    [library?.downloads],
  );
  const libraryIds = useMemo(
    () => new Set((library?.progress ?? []).map(book => book.id)),
    [library?.progress],
  );

  const {
    filters,
    activeCount,
    apply,
    reset,
    toggleLanguage,
    toggleLength,
    setMembershipOnly,
    setDownloadedOnly,
    setHighlyRatedOnly,
  } = useSearchFilters(downloadedIds);

  const filtered = useMemo(() => apply(results), [apply, results]);

  const searching = focused || query.trim().length > 0;

  const suggestions = useMemo<Suggestion[]>(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) {
      return [];
    }

    const titles = results
      .filter(book => book.title.toLowerCase().includes(term))
      .slice(0, MAX_SUGGESTIONS)
      .map<Suggestion>(book => ({ kind: 'query', value: book.title }));

    // One author match, so the reader can jump to a body of work rather than a
    // single title. De-duplicated against the title suggestions above.
    const author = results.find(book => book.author?.toLowerCase().includes(term));

    return author
      ? [...titles.slice(0, MAX_SUGGESTIONS - 1), { kind: 'author', value: author.author }]
      : titles;
  }, [query, results]);

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

  const handleCategory = useCallback((id?: string) => {
    const category = categories.find(item => item.id === id);
    if (category) {
      setQuery(category.label);
      setFocused(true);
    }
  }, [categories]);

  // Two subject tiles per row, inside the screen's 20pt gutters with an 11pt gap.
  const subjectWidth = Math.floor((screenWidth - layout.screenPadding * 2 - 11) / 2);

  const editorsPick = home?.hero?.[1] ?? home?.hero?.[0];

  return (
    <>
      <Screen gap={20} scrollViewProps={{ keyboardShouldPersistTaps: 'handled' }}>
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

        {!searching ? (
          <>
            <ChipRow>
              <Chip
                label="Filters"
                icon={SlidersHorizontal}
                selected={activeCount > 0}
                count={activeCount > 0 ? activeCount : undefined}
                size="sm"
                onPress={filterSheet.open}
              />
              <Chip
                label="Urdu"
                size="sm"
                selected={filters.languages.includes('urdu')}
                onPress={() => toggleLanguage('urdu')}
              />
              <Chip
                label="In membership"
                size="sm"
                selected={filters.membershipOnly}
                onPress={() => setMembershipOnly(!filters.membershipOnly)}
              />
              <Chip
                label="4★+"
                size="sm"
                selected={filters.highlyRatedOnly}
                onPress={() => setHighlyRatedOnly(!filters.highlyRatedOnly)}
              />
            </ChipRow>

            {categories.length > 0 ? (
              <View style={styles.section}>
                <Label>Browse by subject</Label>
                <View style={styles.subjectGrid}>
                  {categories.slice(0, 6).map(category => (
                    <CategoryTile
                      key={category.id}
                      id={category.id}
                      label={category.label}
                      count={category.count}
                      accent={category.accent}
                      width={subjectWidth}
                      onPress={handleCategory}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {editorsPick ? (
              <EditorsShelf
                book={toSummary(editorsPick, libraryIds.has(editorsPick.id))}
                onPress={openBook}
              />
            ) : null}
          </>
        ) : (
          <>
            <SearchSuggestions
              query={query.trim()}
              suggestions={suggestions}
              onSelect={handleSuggestion}
            />

            <View style={styles.section}>
              <Label>
                {isPending && filtered.length === 0
                  ? 'Books'
                  : `Books · ${filtered.length}`}
              </Label>

              {isPending && results.length === 0 ? (
                <ListSkeleton count={4} />
              ) : filtered.length === 0 ? (
                <Text size={fontSize.bodySmall} leading={1.6} align="center" tone="muted" style={styles.noResults}>
                  {query.trim()
                    ? 'Nothing matched that search. Try a different word, or clear your filters.'
                    : 'No published books are available yet.'}
                </Text>
              ) : (
                <View style={styles.results}>
                  {filtered.map(book => (
                    <BookListRow
                      key={book.id}
                      book={toSummary(book, libraryIds.has(book.id))}
                      onPress={openBook}
                    />
                  ))}
                </View>
              )}
            </View>

            {recents.length > 0 ? (
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
          </>
        )}
      </Screen>

      <FilterSheet
        visible={filterSheet.visible}
        onClose={filterSheet.close}
        filters={filters}
        resultCount={filtered.length}
        onReset={reset}
        onToggleLanguage={toggleLanguage}
        onToggleLength={toggleLength}
        onMembershipOnlyChange={setMembershipOnly}
        onDownloadedOnlyChange={setDownloadedOnly}
      />
    </>
  );
}

const styles = StyleSheet.create({
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
  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 11,
  },
  results: {
    gap: 14,
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
