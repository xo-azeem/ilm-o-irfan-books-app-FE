import { View } from 'react-native';
import { Search } from 'lucide-react-native';

import { Screen } from '@/components/layout';
import { DisplayText, Text } from '@/components/ui';
import { searchCatalogBooks } from '@/features/explore/data/exploreContent';
import { palette } from '@/theme/palette';

import { SearchBookGrid } from '../components/SearchBookGrid';
import { SearchCategorySection } from '../components/SearchCategoryRow';

export function SearchScreen() {
  return (
    <Screen>
      <View className="mt-4">
        <View className="flex-row items-center gap-3 rounded-[18px] border border-app-border bg-app-surface px-5 py-4 dark:border-app-border-dark dark:bg-app-surface-dark">
          <Search size={21} color={palette.yellowGreen} strokeWidth={2} />
          <Text className="flex-1 text-[16px] text-app-faint dark:text-app-faint-dark">
            Search books, authors, topics…
          </Text>
        </View>

        <View className="mt-14">
          <SearchCategorySection />
        </View>

        <View className="mt-14 gap-1.5">
          <DisplayText className="text-[22px] font-bold leading-7 tracking-tight text-app-ink dark:text-app-ink-dark">
            All books
          </DisplayText>
          <Text className="text-[13px] text-app-muted dark:text-app-muted-dark">
            {searchCatalogBooks.length} titles in the catalog
          </Text>
        </View>

        <View className="mt-4">
          <SearchBookGrid books={searchCatalogBooks} />
        </View>
      </View>
    </Screen>
  );
}
