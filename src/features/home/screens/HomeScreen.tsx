import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/app/navigation/types';
import { api } from '@/api';
import { mapHeroBook } from '@/api/mappers';
import type { CollectionRow } from '@/api/types';
import { Screen } from '@/components/layout';
import { DisplayText, Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { BookCoverCard } from '@/features/explore/components/BookCoverCard';
import { CollectionCard } from '@/features/explore/components/CollectionCard';
import { ExploreSectionHeader } from '@/features/explore/components/ExploreSectionHeader';
import type { BookItem, HeroCarouselBook } from '@/features/explore/data/exploreContent';
import { HeroBookCarousel } from '@/features/home/components/HeroBookCarousel';
import { palette } from '@/theme/palette';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [hero, setHero] = useState<HeroCarouselBook[]>([]);
  const [trending, setTrending] = useState<BookItem[]>([]);
  const [newArrivals, setNewArrivals] = useState<BookItem[]>([]);
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const feed = await api.homeFeed();
      setHero((feed.shelves?.hero ?? []).map(mapHeroBook));
      setTrending((feed.shelves?.trending ?? []).map(mapHeroBook));
      setNewArrivals((feed.shelves?.newArrivals ?? []).map(mapHeroBook));
      setCollections(
        (feed.collections ?? []).filter(c => c.kind !== 'hero' && c.slug !== 'home-hero'),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load home feed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleBookPress = useCallback(
    (book: BookItem) => {
      navigation.navigate(ROUTES.BOOK_DETAIL, { bookId: book.id });
    },
    [navigation],
  );

  const handleProfilePress = useCallback(() => {
    navigation.navigate(ROUTES.PROFILE);
  }, [navigation]);

  if (loading && hero.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg dark:bg-app-bg-dark">
        <ActivityIndicator size="large" color={palette.green} />
      </View>
    );
  }

  if (error && hero.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-app-bg px-6 dark:bg-app-bg-dark">
        <Text className="text-center text-app-muted dark:text-app-muted-dark">{error}</Text>
        <Pressable onPress={() => void load()} className="rounded-xl bg-app-primary px-4 py-2">
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Screen contentContainerClassName="px-0 pt-0" safeAreaEdges={['left', 'right']}>
      {hero.length > 0 ? (
        <HeroBookCarousel
          books={hero}
          onProfilePress={handleProfilePress}
          onBookPress={handleBookPress}
        />
      ) : null}
      <View className="px-5 pt-0">
        {trending.length > 0 ? (
          <View className="mb-8">
            <ExploreSectionHeader title="Trending now" subtitle="Popular with readers" />
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-4 pr-5">
              {trending.map(book => (
                <BookCoverCard
                  key={book.id}
                  book={book}
                  onPress={() => handleBookPress(book)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {newArrivals.length > 0 ? (
          <View className="mb-8">
            <ExploreSectionHeader title="New arrivals" subtitle="Fresh on the shelf" />
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-4 pr-5">
              {newArrivals.map(book => (
                <BookCoverCard
                  key={book.id}
                  book={book}
                  onPress={() => handleBookPress(book)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {collections.length > 0 ? (
          <View className="mb-8">
            <ExploreSectionHeader title="Collections" subtitle="Curated paths" />
            <View className="gap-3">
              {collections.map(collection => (
                <CollectionCard
                  key={collection.id}
                  title={collection.title}
                  subtitle={collection.subtitle ?? ''}
                  bookCount={collection.book_count ?? 0}
                  accent={collection.accent ?? palette.green}
                  onPress={() => {
                    navigation.navigate(ROUTES.SEARCH);
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}

        {hero.length === 0 && trending.length === 0 && newArrivals.length === 0 ? (
          <View className="items-center py-16">
            <DisplayText className="text-center text-app-ink dark:text-app-ink-dark">
              No books yet
            </DisplayText>
            <Text className="mt-2 text-center text-app-muted dark:text-app-muted-dark">
              Catalog is empty on this environment.
            </Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
