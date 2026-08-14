import { memo } from 'react';
import { View } from 'react-native';

import type { CatalogBook } from '@/services/catalog';

import { SearchBookListRow } from './SearchBookListRow';

type SearchBookListProps = {
  books: CatalogBook[];
  onBookPress?: (book: CatalogBook) => void;
};

export const SearchBookList = memo(function SearchBookList({
  books,
  onBookPress,
}: SearchBookListProps) {
  return (
    <View className="overflow-hidden rounded-[16px] bg-app-surface px-4 dark:bg-app-surface-dark">
      {books.map((book, index) => (
        <SearchBookListRow
          key={book.id}
          book={book}
          isLast={index === books.length - 1}
          onPress={onBookPress}
        />
      ))}
    </View>
  );
});
