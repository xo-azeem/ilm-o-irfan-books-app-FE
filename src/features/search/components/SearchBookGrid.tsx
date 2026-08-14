import { memo } from 'react';
import { View } from 'react-native';

import type { CatalogBook } from '@/services/catalog';

import { useSearchGridMetrics } from '../hooks/useSearchGridMetrics';

import { SearchBookCard } from './SearchBookCard';

type SearchBookGridProps = {
  books: CatalogBook[];
  onBookPress?: (book: CatalogBook) => void;
};

export const SearchBookGrid = memo(function SearchBookGrid({
  books,
  onBookPress,
}: SearchBookGridProps) {
  const { cardWidth, cardHeight, coverHeight, bodyHeight, columnGap, rowGap } =
    useSearchGridMetrics();

  return (
    <View
      className="flex-row flex-wrap"
      style={{ columnGap, rowGap }}>
      {books.map(book => (
        <SearchBookCard
          key={book.id}
          book={book}
          width={cardWidth}
          height={cardHeight}
          coverHeight={coverHeight}
          bodyHeight={bodyHeight}
          onPress={onBookPress}
        />
      ))}
    </View>
  );
});
