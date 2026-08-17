import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList, RootTabParamList } from '@/app/navigation/types';
import { Screen } from '@/components/layout';
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
  const { data, isLoading, isError, error } = useHomeCatalog();

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
        books={data?.hero}
        onProfilePress={handleProfilePress}
        onBookPress={handleBookPress}
      />
      <View className="px-5 pt-0">
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
        {isError ? (
          <Text className="py-8 text-center text-[14px] text-app-muted dark:text-app-muted-dark">
            {error instanceof Error ? error.message : 'Could not load catalog.'}
          </Text>
        ) : null}
        {isLoading ? <ActivityIndicator className="py-8" /> : null}
      </View>
    </Screen>
  );
}
