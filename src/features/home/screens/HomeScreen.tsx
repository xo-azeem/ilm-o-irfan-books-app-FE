import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { Screen } from '@/components/layout';
import type { RootTabParamList } from '@/app/navigation/types';
import { ROUTES } from '@/constants/routes';

import { BookCoverCard } from '@/features/explore/components/BookCoverCard';
import { CategoryBrowseSection } from '@/features/explore/components/CategoryBrowseSection';
import { CollectionCard } from '@/features/explore/components/CollectionCard';
import { ExploreSectionHeader } from '@/features/explore/components/ExploreSectionHeader';
import {
  curatedCollections,
  heroCarouselBooks,
  newArrivals,
  trendingBooks,
} from '@/features/explore/data/exploreContent';
import { HeroBookCarousel } from '@/features/home/components/HeroBookCarousel';

export function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  return (
    <Screen contentContainerClassName="px-0 pt-0" safeAreaEdges={['left', 'right']}>
      <HeroBookCarousel
        books={heroCarouselBooks}
        onProfilePress={() => navigation.navigate(ROUTES.PROFILE)}
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
            {trendingBooks.map(book => (
              <BookCoverCard key={book.id} book={book} />
            ))}
          </ScrollView>
        </View>

        <CategoryBrowseSection />

        <View className="mb-8">
          <ExploreSectionHeader title="New arrivals" subtitle="Fresh on the shelf" />
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-4 pr-5">
            {newArrivals.map(book => (
              <BookCoverCard key={book.id} book={book} width={112} />
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
            {curatedCollections.map(collection => (
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
      </View>
    </Screen>
  );
}
