import { memo } from 'react';
import { View } from 'react-native';

import type { SearchCatalogBook } from '@/features/explore/data/exploreContent';

import { SearchBookListRow } from './SearchBookListRow';

type SearchBookListProps = {
  books: SearchCatalogBook[];
};

export const SearchBookList = memo(function SearchBookList({ books }: SearchBookListProps) {
  return (
    <View className="overflow-hidden rounded-[16px] bg-app-surface px-4 dark:bg-app-surface-dark">
      {books.map((book, index) => (
        <SearchBookListRow
          key={book.id}
          book={book}
          isLast={index === books.length - 1}
        />
      ))}
    </View>
  );
});
