import { memo } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { BookCoverCard } from '@/features/explore/components/BookCoverCard';
import type { BookItem } from '@/features/explore/data/exploreContent';

const GRID_GAP = 16;
const SCREEN_PADDING = 20;

type SearchBookGridProps = {
  books: BookItem[];
};

export const SearchBookGrid = memo(function SearchBookGrid({ books }: SearchBookGridProps) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = (screenWidth - SCREEN_PADDING * 2 - GRID_GAP) / 2;

  return (
    <View className="flex-row flex-wrap" style={{ gap: GRID_GAP }}>
      {books.map(book => (
        <BookCoverCard key={book.id} book={book} width={cardWidth} />
      ))}
    </View>
  );
});
