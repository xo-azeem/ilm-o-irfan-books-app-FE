import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList, RootTabParamList } from '@/app/navigation/types';
import {
  BookCard,
  BookRail,
  CollectionCard,
  ContinueCard,
  RailAction,
  type BookSummary,
} from '@/components/books';
import { Screen } from '@/components/layout';
import { HomeCatalogSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { EmptyState, HeaderWash } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { BookOfTheWeek } from '@/features/home/components/BookOfTheWeek';
import { HomeHeader } from '@/features/home/components/HomeHeader';
import { MembershipBand } from '@/features/home/components/MembershipBand';
import { MoodPicker, type ReadingMood } from '@/features/home/components/MoodPicker';
import { useLibrary, useProfile, useSubscription } from '@/hooks/useAccount';
import { useHomeCatalog } from '@/hooks/useCatalog';
import type { CatalogBook } from '@/services/catalog';

type HomeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

/** Adapts a catalog row to the shape the shared book components expect. */
function toSummary(book: CatalogBook): BookSummary {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
    coverColor: book.coverColor,
    coverColorDark: book.coverColorDark,
    isPremium: book.isPremium,
    price: book.price,
    currency: book.currency,
  };
}

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const { data, isLoading, isError, error, refetch } = useHomeCatalog();
  const { data: profile } = useProfile();
  const { data: library } = useLibrary();
  const { data: subscription } = useSubscription();
  const [mood, setMood] = useState<ReadingMood | null>(null);

  const openBook = useCallback(
    (book: { id: string }) => navigation.navigate(ROUTES.BOOK_DETAIL, { bookId: book.id }),
    [navigation],
  );

  const readBook = useCallback(
    (book: { id: string }) => navigation.navigate(ROUTES.BOOK_READER, { bookId: book.id }),
    [navigation],
  );

  const openProfile = useCallback(() => navigation.navigate(ROUTES.PROFILE), [navigation]);
  const openLibrary = useCallback(() => navigation.navigate(ROUTES.MY_LIBRARY), [navigation]);

  const openMembership = useCallback(
    () => navigation.navigate(ROUTES.PROFILE, { screen: 'Subscription' }),
    [navigation],
  );

  const hero = data?.hero?.[0];
  const featured = useMemo(
    () =>
      hero
        ? {
            ...toSummary(hero),
            description: hero.description,
            rating: hero.rating,
            genre: hero.genre,
          }
        : null,
    [hero],
  );

  // Books the reader has started but not finished. `getLibrary` already orders
  // them most-recently-read first.
  const inProgress = useMemo(
    () => (library?.progress ?? []).filter(entry => entry.progress < 1).slice(0, 6),
    [library?.progress],
  );

  const hasMembership = subscription?.active ?? false;

  if (isError) {
    return (
      <Screen scrollable={false}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            art={null}
            title="Could not load the catalog."
            message={
              error instanceof Error && error.name === 'AbortError'
                ? 'The server did not respond. Check your connection, then try again.'
                : 'Nothing was lost. Check your connection and try again.'
            }
            action={{ label: 'Try again', onPress: () => void refetch() }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      gap={26}
      backdrop={<HeaderWash height={520} />}
      scrollViewProps={{ scrollEventThrottle: 16 }}>
      <HomeHeader
        name={profile?.fullName}
        hasNotifications
        onProfilePress={openProfile}
        onNotificationsPress={openProfile}
      />

      {isLoading ? (
        <HomeCatalogSkeleton />
      ) : (
        <>
          {featured ? (
            <BookOfTheWeek book={featured} onRead={readBook} onPress={openBook} />
          ) : null}

          {inProgress.length > 0 ? (
            <BookRail
              title="Continue reading"
              action={<RailAction label={`All ${inProgress.length}`} onPress={openLibrary} />}
              gap={12}>
              {inProgress.map(entry => (
                <ContinueCard
                  key={entry.id}
                  width={258}
                  book={{ ...toSummary(entry), progress: entry.progress }}
                  detail={entry.chapter}
                  onPress={readBook}
                />
              ))}
            </BookRail>
          ) : null}

          <MoodPicker value={mood} onChange={setMood} />

          {data?.trending?.length ? (
            <BookRail title="Trending this week" subtitle="Most opened across the store">
              {data.trending.slice(0, 8).map((book, index) => (
                <BookCard
                  key={book.id}
                  book={toSummary(book)}
                  rank={index + 1}
                  onPress={openBook}
                />
              ))}
            </BookRail>
          ) : null}

          {data?.arrivals?.length ? (
            <BookRail
              title="New arrivals"
              subtitle="Fresh on the shelf"
              gap={14}>
              {data.arrivals.slice(0, 8).map(book => (
                <BookCard
                  key={book.id}
                  book={toSummary(book)}
                  width={106}
                  showAuthor={false}
                  onPress={openBook}
                />
              ))}
            </BookRail>
          ) : null}

          {data?.collections?.length ? (
            <BookRail
              title="Curated collections"
              subtitle="Reading paths built by our editors"
              gap={12}>
              {data.collections.map(collection => (
                <CollectionCard
                  key={collection.id}
                  id={collection.id}
                  title={collection.title}
                  subtitle={
                    collection.subtitle || `${collection.bookCount} books`
                  }
                  accent={collection.accent}
                />
              ))}
            </BookRail>
          ) : null}

          {!hasMembership ? (
            <MembershipBand
              subtitle="See plans from Rs 490 / month"
              onPress={openMembership}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}
