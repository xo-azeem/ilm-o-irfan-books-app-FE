import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { DisplayText, Text } from '@/components/ui';
import type { ReadingBook } from '@/features/library/data/libraryContent';

import { InProgressBookItem } from './InProgressBookItem';

type InProgressSectionProps = {
  books: ReadingBook[];
};

function SectionHeading({ title, action }: { title: string; action?: string }) {
  return (
    <View className="mb-3 flex-row items-end justify-between">
      <DisplayText className="text-[20px] font-semibold tracking-tight text-app-ink dark:text-app-ink-dark">
        {title}
      </DisplayText>
      {action ? (
        <Text className="text-[14px] font-medium text-app-primary dark:text-app-primary-dark">
          {action}
        </Text>
      ) : null}
    </View>
  );
}

export function InProgressSection({ books }: InProgressSectionProps) {
  const [selectedId, setSelectedId] = useState(books[0]?.id ?? '');

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  if (books.length === 0) {
    return null;
  }

  return (
    <View className="mb-8">
      <SectionHeading title="In progress" action="See all" />
      <View className="overflow-hidden rounded-[16px] bg-app-surface dark:bg-app-surface-dark">
        {books.map((book, index) => (
          <InProgressBookItem
            key={book.id}
            book={book}
            isSelected={book.id === selectedId}
            isLast={index === books.length - 1}
            onSelect={() => handleSelect(book.id)}
          />
        ))}
      </View>
    </View>
  );
}
