import { useState } from 'react';
import { View } from 'react-native';
import { BookOpen, Search } from 'lucide-react-native';

import { Screen } from '@/components/layout';
import { DisplayText, Text } from '@/components/ui';
import { searchCatalogBooks } from '@/features/explore/data/exploreContent';
import { palette } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

import { SearchBookGrid } from '../components/SearchBookGrid';
import { SearchBookList } from '../components/SearchBookList';
import { SearchCategorySection } from '../components/SearchCategoryRow';
import {
  SearchViewToggle,
  type SearchBookViewMode,
} from '../components/SearchViewToggle';

export function SearchScreen() {
  const { colors } = useTheme();
  const [viewMode, setViewMode] = useState<SearchBookViewMode>('grid');

  return (
    <Screen>
      <View className="mb-5 mt-4 flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-app-primary dark:bg-app-primary-dark">
          <BookOpen color={colors.onPrimary} size={20} strokeWidth={1.75} />
        </View>
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
            <SearchBookGrid books={searchCatalogBooks} />
          ) : (
            <SearchBookList books={searchCatalogBooks} />
          )}
        </View>
      </View>
    </Screen>
  );
}
