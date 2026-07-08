import { memo } from 'react';
import { View, useWindowDimensions } from 'react-native';

import type { SearchCatalogBook } from '@/features/explore/data/exploreContent';

import { SearchBookCard } from './SearchBookCard';

const GRID_GAP = 16;
const GRID_ROW_GAP = 24;
const SCREEN_PADDING = 20;

type SearchBookGridProps = {
  books: SearchCatalogBook[];
};

export const SearchBookGrid = memo(function SearchBookGrid({ books }: SearchBookGridProps) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = (screenWidth - SCREEN_PADDING * 2 - GRID_GAP) / 2;

  return (
    <View
      className="flex-row flex-wrap"
      style={{ columnGap: GRID_GAP, rowGap: GRID_ROW_GAP }}>
      {books.map(book => (
        <SearchBookCard key={book.id} book={book} width={cardWidth} />
      ))}
    </View>
  );
});
