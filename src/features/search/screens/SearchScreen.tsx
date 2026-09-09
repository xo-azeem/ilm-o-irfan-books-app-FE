import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search } from 'lucide-react-native';

import type { RootStackParamList } from '@/app/navigation/types';
import { api } from '@/api';
import { mapSearchBook } from '@/api/mappers';
import { AppLogo } from '@/components/brand';
import { Screen } from '@/components/layout';
import { DisplayText, Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import type { SearchCatalogBook } from '@/features/explore/data/exploreContent';
import { palette } from '@/theme/palette';

import { SearchBookGrid } from '../components/SearchBookGrid';
import { SearchBookList } from '../components/SearchBookList';
import {
  SearchViewToggle,
  type SearchBookViewMode,
} from '../components/SearchViewToggle';

export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [viewMode, setViewMode] = useState<SearchBookViewMode>('grid');
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<SearchCatalogBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = q.trim()
        ? await api.booksSearch(q.trim(), 1, 40)
        : await api.booksList({ page: 1, pageSize: 40 });
      setBooks((result.data ?? []).map(mapSearchBook));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, load]);

  const handleBookPress = useCallback(
    (book: SearchCatalogBook) => {
      navigation.navigate(ROUTES.BOOK_DETAIL, { bookId: book.id });
    },
    [navigation],
  );

  return (
    <Screen>
      <View className="mb-5 mt-4 flex-row items-center gap-3">
        <AppLogo />
        <DisplayText className="text-[22px] font-bold leading-7 tracking-tight text-app-ink dark:text-app-ink-dark">
          Ilm o Irfan
        </DisplayText>
      </View>

      <View>
        <View className="flex-row items-center gap-3 rounded-[18px] border border-app-border bg-app-surface px-5 py-3 dark:border-app-border-dark dark:bg-app-surface-dark">
          <Search size={21} color={palette.yellowGreen} strokeWidth={2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search books, authors, topics…"
            placeholderTextColor="#7A917F"
            autoCapitalize="none"
            autoCorrect={false}
            className="flex-1 text-[16px] text-app-ink dark:text-app-ink-dark"
          />
        </View>

        <View className="mt-8 flex-row items-center justify-between">
          <DisplayText className="text-[22px] font-bold leading-7 tracking-tight text-app-ink dark:text-app-ink-dark">
            {query.trim() ? 'Results' : 'All books'}
          </DisplayText>
          <SearchViewToggle value={viewMode} onChange={setViewMode} />
        </View>

        <View className="mt-4">
          {loading ? (
            <View className="items-center py-16">
              <ActivityIndicator color={palette.green} />
            </View>
          ) : error ? (
            <Text className="py-8 text-center text-app-muted dark:text-app-muted-dark">
              {error}
            </Text>
          ) : books.length === 0 ? (
            <Text className="py-8 text-center text-app-muted dark:text-app-muted-dark">
              No books found
            </Text>
          ) : viewMode === 'grid' ? (
            <SearchBookGrid books={books} onBookPress={handleBookPress} />
          ) : (
            <SearchBookList books={books} onBookPress={handleBookPress} />
          )}
        </View>
      </View>
    </Screen>
  );
}
