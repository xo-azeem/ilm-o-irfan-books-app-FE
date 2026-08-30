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
import type { FeaturedBook } from '@/features/home/components/BookOfTheWeek';
import { HeroCarousel } from '@/features/home/components/HeroCarousel';
import { HomeHeader, HomeStickyHeader } from '@/features/home/components/HomeHeader';
import { MembershipBand } from '@/features/home/components/MembershipBand';
import { matchesMood, MoodPicker, type ReadingMood } from '@/features/home/components/MoodPicker';
import { useLibrary, useProfile, useSubscription } from '@/hooks/useAccount';
import { useHomeCatalog } from '@/hooks/useCatalog';
import type { CatalogBook } from '@/services/catalog';
import { isUrduTitle } from '@/services/script';

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
    // Home draws the same covers as Discover and Library, so it has to make the
    // same script call — without this every Urdu title falls back to DM Sans.
    isUrdu: isUrduTitle(book.title),
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

  // The bell was landing on the reading record, same as the avatar. There is no
  // notification inbox behind it yet, so it opens the notification settings —
  // the one screen in the app that is actually about notifications.
  const openNotifications = useCallback(
    () => navigation.navigate(ROUTES.PROFILE, { screen: 'Notifications' }),
    [navigation],
  );
  const openLibrary = useCallback(() => navigation.navigate(ROUTES.MY_LIBRARY), [navigation]);

  const openMembership = useCallback(
    () => navigation.navigate(ROUTES.PROFILE, { screen: 'Subscription' }),
    [navigation],
  );

  // Every editorial pick becomes a page of the hero carousel; the shelf falls
  // back to a single static card when there is only one.
  const featured = useMemo<FeaturedBook[]>(
    () =>
      (data?.hero ?? []).slice(0, 5).map(book => ({
        ...toSummary(book),
        description: book.description,
        rating: book.rating,
        genre: book.genre,
      })),
    [data?.hero],
  );

  // Books the reader has started but not finished. `getLibrary` already orders
  // them most-recently-read first.
  const inProgress = useMemo(
    () => (library?.progress ?? []).filter(entry => entry.progress < 1).slice(0, 6),
    [library?.progress],
  );

  // The design's second rail is a personal one — companion reading for the book
  // most recently opened. Without a reading history there is nothing to be
  // "because" of, so it falls back to the new-arrivals shelf.
  // Only a Latin title can be set into the serif rail heading — Newsreader has
  // no Nastaliq, and a mixed-script heading is worse than a plain one.
  const lastRead = inProgress[0] && !isUrduTitle(inProgress[0].title) ? inProgress[0] : null;

  const recommended = useMemo(() => {
    const pool = data?.arrivals ?? [];
    if (!mood) {
      return pool;
    }
    // A mood narrows the rail but is never allowed to empty it — an unmatched
    // mood leaves the shelf exactly as it was rather than showing a gap.
    const matching = pool.filter(book => matchesMood(book.genre, mood));
    return matching.length > 0 ? matching : pool;
  }, [data?.arrivals, mood]);

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
      stickyHeader={<HomeStickyHeader />}
      stickyHeaderOffset={420}>
      <HomeHeader
        name={profile?.fullName}
        hasNotifications
        onProfilePress={openProfile}
        onNotificationsPress={openNotifications}
      />

      {isLoading ? (
        <HomeCatalogSkeleton />
      ) : (
        <>
          <HeroCarousel books={featured} onRead={readBook} onPress={openBook} />

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

          <MoodPicker value={mood} onChange={setMood} gap={26} />

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

          {recommended.length > 0 ? (
            <BookRail
              title={lastRead ? `Because you read ${lastRead.title}` : 'New arrivals'}
              subtitle={
                lastRead ? 'Companion volumes and commentary' : 'Fresh on the shelf'
              }
              gap={14}>
              {recommended.slice(0, 8).map(book => (
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
