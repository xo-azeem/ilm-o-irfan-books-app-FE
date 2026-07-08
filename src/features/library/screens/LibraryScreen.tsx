import { memo } from 'react';
import { ScrollView, View } from 'react-native';

import { Screen, ScreenHeader, Section } from '@/components/layout';
import { DisplayText, Text } from '@/components/ui';
import {
  continueReading,
  finishedBooks,
  inProgressBooks,
  libraryShelves,
} from '@/features/library/data/libraryContent';

import { ContinueReadingCard } from '../components/ContinueReadingCard';
import { FinishedBookCard } from '../components/FinishedBookCard';
import { InProgressRow } from '../components/InProgressRow';
import { LibraryShelfRow } from '../components/LibraryShelfRow';

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

export const LibraryScreen = memo(function LibraryScreen() {
  return (
    <Screen>
      <ScreenHeader title="My Library" subtitle="Pick up where you left off." />

      <View className="mb-8">
        <ContinueReadingCard book={continueReading} />
      </View>

      <View className="mb-8">
        <SectionHeading title="In progress" action="See all" />
        <Section>
          {inProgressBooks.map((book, index) => (
            <InProgressRow
              key={book.id}
              book={book}
              isLast={index === inProgressBooks.length - 1}
            />
          ))}
        </Section>
      </View>

      <View className="mb-8">
        <SectionHeading title="Shelves" />
        <Section>
          {libraryShelves.map((shelf, index) => (
            <LibraryShelfRow
              key={shelf.id}
              shelf={shelf}
              isLast={index === libraryShelves.length - 1}
            />
          ))}
        </Section>
      </View>

      <View className="mb-2">
        <SectionHeading title="Recently finished" action="See all" />
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-4 pr-5">
          {finishedBooks.map(book => (
            <FinishedBookCard key={book.id} book={book} />
          ))}
        </ScrollView>
      </View>
    </Screen>
  );
});
