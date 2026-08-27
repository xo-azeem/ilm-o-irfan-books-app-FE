import { useCallback } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList, RootTabParamList } from '@/app/navigation/types';
import { Screen } from '@/components/layout';
import { HomeCatalogSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';

import { BookCoverCard } from '@/features/explore/components/BookCoverCard';
import { CollectionCard } from '@/features/explore/components/CollectionCard';
import { ExploreSectionHeader } from '@/features/explore/components/ExploreSectionHeader';
import { useHomeCatalog } from '@/hooks/useCatalog';
import { HeroBookCarousel } from '@/features/home/components/HeroBookCarousel';

type HomeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const { data, isLoading, isError, error, refetch, isRefetching } = useHomeCatalog();

  const handleBookPress = useCallback(
    (book: { id: string }) => {
      navigation.navigate(ROUTES.BOOK_DETAIL, { bookId: book.id });
    },
    [navigation],
  );

  const handleProfilePress = useCallback(() => {
    navigation.navigate(ROUTES.PROFILE);
  }, [navigation]);

  return (
    <Screen contentContainerClassName="px-0 pt-0" safeAreaEdges={['left', 'right']}>
      <HeroBookCarousel
        books={isLoading ? [] : data?.hero}
        onProfilePress={handleProfilePress}
        onBookPress={handleBookPress}
      />
      {isLoading ? <HomeCatalogSkeleton /> : null}
      <View className="px-5 pt-0">
        {isError ? (
          <View className="items-center py-12">
            <Text className="text-center text-[15px] text-app-ink dark:text-app-ink-dark">
              Could not load the catalog.
            </Text>
            <Text className="mt-2 px-4 text-center text-[13px] text-app-muted dark:text-app-muted-dark">
              {error instanceof Error
                ? error.name === 'AbortError'
                  ? 'The server did not respond. Check that SUPABASE_URL is reachable, then reload.'
                  : error.message
                : 'Please try again.'}
            </Text>
            <Pressable
              onPress={() => {
                void refetch();
              }}
              className="mt-5 rounded-[14px] bg-app-primary px-5 py-3 active:opacity-80 dark:bg-app-primary-dark">
              <Text className="text-[15px] font-semibold text-white">
                {isRefetching ? 'Retrying…' : 'Try again'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !isError ? (
          <>
            <View className="mb-8">
              <ExploreSectionHeader
                title="Trending now"
                subtitle="Most read this week"
              />
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-4 pr-5">
                {(data?.trending ?? []).map(book => (
                  <BookCoverCard
                    key={book.id}
                    book={book}
                    onPress={handleBookPress}
                  />
                ))}
              </ScrollView>
            </View>

            <View className="mb-8">
              <ExploreSectionHeader title="New arrivals" subtitle="Fresh on the shelf" />
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-4 pr-5">
                {(data?.arrivals ?? []).map(book => (
                  <BookCoverCard
                    key={book.id}
                    book={book}
                    onPress={handleBookPress}
                  />
                ))}
              </ScrollView>
            </View>

            <View className="mb-4">
              <ExploreSectionHeader
                title="Curated collections"
                subtitle="Hand-picked reading lists"
              />
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-3 pr-5">
                {(data?.collections ?? []).map(collection => (
                  <CollectionCard
                    key={collection.id}
                    title={collection.title}
                    subtitle={collection.subtitle}
                    bookCount={collection.bookCount}
                    accent={collection.accent}
                  />
                ))}
              </ScrollView>
            </View>
          </>
        ) : null}
      </View>
    </Screen>
  );
}
