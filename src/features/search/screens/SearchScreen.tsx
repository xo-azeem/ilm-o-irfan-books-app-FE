import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search } from 'lucide-react-native';

import type { RootStackParamList } from '@/app/navigation/types';
import { AppLogo } from '@/components/brand';
import { Screen } from '@/components/layout';
import { DisplayText, Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import type { SearchCatalogBook } from '@/features/explore/data/exploreContent';
import { searchCatalogBooks } from '@/features/explore/data/exploreContent';
import { palette } from '@/theme/palette';

import { SearchBookGrid } from '../components/SearchBookGrid';
import { SearchBookList } from '../components/SearchBookList';
import { SearchCategorySection } from '../components/SearchCategoryRow';
import {
  SearchViewToggle,
  type SearchBookViewMode,
} from '../components/SearchViewToggle';

export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [viewMode, setViewMode] = useState<SearchBookViewMode>('grid');

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
        <View className="flex-row items-center gap-3 rounded-[18px] border border-app-border bg-app-surface px-5 py-4 dark:border-app-border-dark dark:bg-app-surface-dark">
          <Search size={21} color={palette.yellowGreen} strokeWidth={2} />
          <Text className="flex-1 text-[16px] text-app-faint dark:text-app-faint-dark">
            Search books, authors, topics…
          </Text>
        </View>

        <View className="mt-8">
          <SearchCategorySection />
        </View>

        <View className="mt-8 flex-row items-center justify-between">
          <DisplayText className="text-[22px] font-bold leading-7 tracking-tight text-app-ink dark:text-app-ink-dark">
            All books
          </DisplayText>
          <SearchViewToggle value={viewMode} onChange={setViewMode} />
        </View>

        <View className="mt-4">
          {viewMode === 'grid' ? (
            <SearchBookGrid books={searchCatalogBooks} onBookPress={handleBookPress} />
          ) : (
            <SearchBookList books={searchCatalogBooks} onBookPress={handleBookPress} />
          )}
        </View>
      </View>
    </Screen>
  );
}
