import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/app/navigation/types';
import { AppLogo } from '@/components/brand';
import { Screen } from '@/components/layout';
import { DisplayText, Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import type { SearchCatalogBook } from '@/features/explore/data/exploreContent';
import { searchCatalogBooks } from '@/features/explore/data/exploreContent';
import { useHeaderBrandMetrics } from '@/hooks/useHeaderBrandMetrics';

import { SearchDismissOverlay } from '../components/CollapsibleSearchBar';
import { SearchBookGrid } from '../components/SearchBookGrid';
import { SearchBookList } from '../components/SearchBookList';
import { SearchCategorySection } from '../components/SearchCategoryRow';
import {
  SearchViewToggle,
  type SearchBookViewMode,
} from '../components/SearchViewToggle';
import { useSearchGridMetrics } from '../hooks/useSearchGridMetrics';

function filterCatalog(books: SearchCatalogBook[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return books;
  }

  return books.filter(book => {
    const haystack = `${book.title} ${book.author} ${book.tag ?? ''}`.toLowerCase();
    return haystack.includes(normalized);
  });
}

export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const brand = useHeaderBrandMetrics();
  const { horizontalPadding } = useSearchGridMetrics();
  const rootRef = useRef<View>(null);

  const [viewMode, setViewMode] = useState<SearchBookViewMode>('grid');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [overlayTop, setOverlayTop] = useState(0);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  const handleSearchRowLayout = useCallback((bottomWindowY: number) => {
    rootRef.current?.measureInWindow((_x, rootY) => {
      setOverlayTop(Math.max(0, bottomWindowY - rootY));
    });
  }, []);

  const filteredBooks = useMemo(
    () => filterCatalog(searchCatalogBooks, query),
    [query],
  );

  const handleBookPress = useCallback(
    (book: SearchCatalogBook) => {
      if (searchOpen) {
        closeSearch();
      }
      navigation.navigate(ROUTES.BOOK_DETAIL, { bookId: book.id });
    },
    [closeSearch, navigation, searchOpen],
  );

  return (
    <View ref={rootRef} className="flex-1">
      <Screen
        contentContainerClassName=""
        scrollViewProps={{
          keyboardShouldPersistTaps: 'handled',
          contentContainerStyle: { paddingHorizontal: horizontalPadding },
          scrollEnabled: !searchOpen,
        }}>
        <View
          style={{
            marginTop: brand.paddingTop,
            marginBottom: 20,
            gap: brand.brandGap,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <AppLogo size={brand.logoSize} />
          <View style={styles.brandText}>
            <DisplayText
              className="font-bold tracking-tight text-app-ink dark:text-app-ink-dark"
              style={{
                fontSize: brand.titleSize,
                lineHeight: brand.titleLineHeight,
                textAlign: 'right',
              }}
              numberOfLines={1}>
              Ilm o Irfan
            </DisplayText>
            <Text
              className="font-medium tracking-wide text-app-primary dark:text-app-primary-dark"
              style={{ fontSize: brand.subtitleSize, textAlign: 'right' }}
              numberOfLines={1}>
              E-BookStore
            </Text>
          </View>
        </View>

        <SearchCategorySection
          searchOpen={searchOpen}
          searchQuery={query}
          onSearchQueryChange={setQuery}
          onOpenSearch={openSearch}
          onCloseSearch={closeSearch}
          onSearchRowLayout={handleSearchRowLayout}
        />

        <View className="mt-8 flex-row items-center justify-between">
          <DisplayText className="text-[22px] font-bold leading-7 tracking-tight text-app-ink dark:text-app-ink-dark">
            All books
          </DisplayText>
          <SearchViewToggle value={viewMode} onChange={setViewMode} />
        </View>

        <View className="mt-4">
          {viewMode === 'grid' ? (
            <SearchBookGrid books={filteredBooks} onBookPress={handleBookPress} />
          ) : (
            <SearchBookList books={filteredBooks} onBookPress={handleBookPress} />
          )}
        </View>
      </Screen>

      <SearchDismissOverlay
        visible={searchOpen}
        top={overlayTop}
        onDismiss={closeSearch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  brandText: {
    flexShrink: 1,
    alignItems: 'flex-end',
    gap: 1,
  },
});
