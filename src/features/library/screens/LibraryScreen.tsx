import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList, RootTabParamList } from '@/app/navigation/types';
import { Screen, ScreenHeader, Section } from '@/components/layout';
import { DisplayText, Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { libraryShelves } from '@/features/library/data/libraryContent';
import { useLibrary } from '@/hooks/useAccount';

import { FinishedBookCard } from '../components/FinishedBookCard';
import { InProgressSection } from '../components/InProgressSection';
import { LibraryShelfRow } from '../components/LibraryShelfRow';

type LibraryNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'MyLibrary'>,
  NativeStackNavigationProp<RootStackParamList>
>;

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

export function LibraryScreen() {
  const navigation = useNavigation<LibraryNavigation>();
  const { data, isLoading } = useLibrary();
  const inProgressBooks = (data?.progress ?? []).map(book => ({
    ...book,
    timeLeft: `${Math.max(0, Math.round((1 - book.progress) * 100))}% remaining`,
  }));
  const finished = inProgressBooks.filter(book => book.progress >= 1);
  const shelves = libraryShelves.map(shelf => ({
    ...shelf,
    count: String(
      shelf.id === 'shelf-saved' || shelf.id === 'shelf-wishlist'
        ? data?.wishlistCount ?? 0
        : shelf.id === 'shelf-downloaded'
          ? data?.downloads.length ?? 0
          : shelf.id === 'shelf-highlights'
            ? data?.highlightsCount ?? 0
            : shelf.id === 'shelf-finished'
              ? finished.length
              : shelf.id === 'shelf-history'
                ? data?.progress.length ?? 0
                : 0,
    ),
  }));

  const openBook = useCallback(
    (bookId: string) => {
      navigation.navigate(ROUTES.BOOK_READER, { bookId });
    },
    [navigation],
  );

  const handleShelfPress = useCallback(
    (shelfId: string) => {
      if (shelfId === 'shelf-wishlist' || shelfId === 'shelf-saved') {
        navigation.navigate(ROUTES.WISHLIST);
        return;
      }
      if (shelfId === 'shelf-downloaded') {
        navigation.navigate(ROUTES.PROFILE);
      }
    },
    [navigation],
  );

  return (
    <Screen>
      <ScreenHeader title="My Library" subtitle="Pick up where you left off." />

      {isLoading ? (
        <ActivityIndicator className="py-8" />
      ) : (
        <InProgressSection books={inProgressBooks} onResume={openBook} />
      )}

      <View className="mb-8">
        <SectionHeading title="Shelves" />
        <Section>
          {shelves.map((shelf, index) => (
            <LibraryShelfRow
              key={shelf.id}
              shelf={shelf}
              isLast={index === shelves.length - 1}
              onPress={() => handleShelfPress(shelf.id)}
            />
          ))}
        </Section>
      </View>

      <View className="mb-2">
        <SectionHeading title="Recently finished" />
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-4 pr-5">
          {finished.map(book => (
            <FinishedBookCard key={book.id} book={book} />
          ))}
        </ScrollView>
      </View>
    </Screen>
  );
}
