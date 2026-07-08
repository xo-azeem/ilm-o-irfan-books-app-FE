import { View } from 'react-native';
import { Search } from 'lucide-react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { DisplayText, Text } from '@/components/ui';
import { searchCatalogBooks } from '@/features/explore/data/exploreContent';
import { palette } from '@/theme/palette';

import { SearchBookGrid } from '../components/SearchBookGrid';
import { SearchCategorySection } from '../components/SearchCategoryRow';

export function SearchScreen() {
  return (
    <Screen>
      <ScreenHeader title="Search" subtitle="Find books, authors, and topics." />

      <View className="mb-7 flex-row items-center gap-3 rounded-2xl border border-app-border bg-app-surface px-4 py-3.5 dark:border-app-border-dark dark:bg-app-surface-dark">
        <Search size={18} color={palette.yellowGreen} strokeWidth={2} />
        <Text className="flex-1 text-[15px] text-app-faint dark:text-app-faint-dark">
          Search books, authors, topics…
        </Text>
      </View>

      <SearchCategorySection />

      <View className="mb-2">
        <View className="mb-4 gap-0.5">
          <DisplayText className="text-[17px] font-semibold tracking-tight text-app-ink dark:text-app-ink-dark">
            All books
          </DisplayText>
          <Text className="text-[13px] text-app-muted dark:text-app-muted-dark">
            {searchCatalogBooks.length} titles in the catalog
          </Text>
        </View>
        <SearchBookGrid books={searchCatalogBooks} />
      </View>
    </Screen>
  );
}
