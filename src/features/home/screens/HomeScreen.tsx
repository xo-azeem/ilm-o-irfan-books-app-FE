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
import { HeroCarousel } from '@/features/home/components/HeroCarousel';
import type { HeroSlide } from '@/features/home/components/HeroSlideCard';
import { HomeHeader, HomeStickyHeader } from '@/features/home/components/HomeHeader';
import { MembershipBand } from '@/features/home/components/MembershipBand';
import { matchesMood, MoodPicker, type ReadingMood } from '@/features/home/components/MoodPicker';
import { useLibrary, useProfile, useSubscription } from '@/hooks/useAccount';
import { useHomeCatalog } from '@/hooks/useCatalog';
import { useRecommendations } from '@/hooks/useRecommendations';
import type { CatalogBook, CatalogSlide } from '@/services/catalog';
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
    // Home draws the same covers as Discover and Library, so it has to make the
    // same script call — without this every Urdu title falls back to DM Sans.
    isUrdu: isUrduTitle(book.title),
  };
}

/**
 * Adapts a slide for the carousel.
 *
 * The only thing added is the script call for the heading font — every string,
 * colour and image on a slide is the admin's and arrives already resolved.
 */
function toSlide(slide: CatalogSlide): HeroSlide {
  return { ...slide, isUrdu: isUrduTitle(slide.headline) };
}

/** The heading a cold-start recommendation list gets. Never "Because you read". */
const COLD_START = {
  title: 'Popular right now',
  subtitle: 'Where other readers are starting',
} as const;

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const { data, isLoading, isError, error, refetch } = useHomeCatalog();
  // Fired alongside the feed, not after it: Home draws the rest of itself if
  // this one fails, and it is disabled outright for a signed-out reader.
  const { data: recommendations } = useRecommendations();
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

  // A slide carries the whole book card, so both of these go straight to the
  // book it points at — there is nothing left to look up first.
  const openSlide = useCallback(
    (slide: HeroSlide) => navigation.navigate(ROUTES.BOOK_DETAIL, { bookId: slide.bookId }),
    [navigation],
  );

  const readSlide = useCallback(
    (slide: HeroSlide) => navigation.navigate(ROUTES.BOOK_READER, { bookId: slide.bookId }),
    [navigation],
  );

  const openProfile = useCallback(() => navigation.navigate(ROUTES.PROFILE), [navigation]);

  // The strip carries collection ids, so that is the handle sent. The screen
  // titles itself from what `collection-books` sends back rather than from
  // anything passed through here.
  const openCollection = useCallback(
    (collectionId?: string) => {
      if (collectionId) {
        navigation.navigate(ROUTES.COLLECTION, { collectionId });
      }
    },
    [navigation],
  );

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

  // The carousel is the admin's, top to bottom: which slides, in what order,
  // and every word on them. Nothing is picked, sorted or padded here, and an
  // empty list draws no rail rather than being backfilled with newest books.
  const slides = useMemo<HeroSlide[]>(
    () => (data?.carousel ?? []).map(toSlide),
    [data?.carousel],
  );

  // Books the reader has started but not finished. `library-overview` returns
  // that shelf already split from the finished one and ordered most-recently
  // read first, so there is nothing left to filter here.
  const inProgress = useMemo(() => (library?.reading ?? []).slice(0, 6), [library?.reading]);

  // `app_settings.featured_collection_id` is the collection an admin has
  // pinned. The rail keeps the editor's own `sort_order` for everything else
  // and simply leads with that one, so the setting shows up on the home screen
  // rather than only in the CMS.
  const collections = useMemo(() => {
    const rows = data?.collections ?? [];
    const featuredId = data?.featuredCollectionId;
    if (!featuredId) {
      return rows;
    }
    const featured = rows.find(collection => collection.id === featuredId);
    return featured ? [featured, ...rows.filter(row => row.id !== featuredId)] : rows;
  }, [data?.collections, data?.featuredCollectionId]);

  const arrivals = useMemo(() => {
    const pool = data?.arrivals ?? [];
    if (!mood) {
      return pool;
    }
    // A mood narrows the rail but is never allowed to empty it — an unmatched
    // mood leaves the shelf exactly as it was rather than showing a gap.
    const matching = pool.filter(book => matchesMood(book.genre, mood));
    return matching.length > 0 ? matching : pool;
  }, [data?.arrivals, mood]);

  // What the backend will actually do, not whether a subscription exists: an
  // admin holds none and is served every book, so nagging them to subscribe
  // would be selling something they already have.
  const hasMembership = subscription?.canAccessPremium ?? false;

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
          <HeroCarousel slides={slides} onRead={readSlide} onPress={openSlide} />

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

          {/* Both headings below are the backend's own words. "Because you read
              X" is composed there from the book the reader actually finished,
              and a reader with no history gets a neutral heading instead —
              which is what `isPersonalized` decides, never `sections.length`. */}
          {recommendations?.isPersonalized
            ? recommendations.sections.map(section => (
                <BookRail key={section.id} title={section.title} subtitle={section.subtitle} gap={14}>
                  {section.books.map(book => (
                    <BookCard
                      key={book.id}
                      book={toSummary(book)}
                      width={106}
                      showAuthor={false}
                      onPress={openBook}
                    />
                  ))}
                </BookRail>
              ))
            : null}

          {recommendations && !recommendations.isPersonalized && recommendations.books.length ? (
            <BookRail title={COLD_START.title} subtitle={COLD_START.subtitle} gap={14}>
              {recommendations.books.map(book => (
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

          {/* The weekly draw, as it arrived. The same books in the same order
              for every reader until Monday — so the subtitle says exactly that
              rather than implying the rail was picked for this one. */}
          {data?.trending?.length ? (
            <BookRail title="Trending this week" subtitle="The same shelf for every reader">
              {data.trending.map((book, index) => (
                <BookCard
                  key={book.id}
                  book={toSummary(book)}
                  rank={index + 1}
                  onPress={openBook}
                />
              ))}
            </BookRail>
          ) : null}

          {arrivals.length > 0 ? (
            <BookRail title="New arrivals" subtitle="Fresh on the shelf" gap={14}>
              {arrivals.slice(0, 8).map(book => (
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

          {collections.length ? (
            <BookRail
              title="Curated collections"
              subtitle="Reading paths built by our editors"
              gap={12}>
              {collections.map(collection => (
                <CollectionCard
                  key={collection.id}
                  id={collection.id}
                  title={collection.title}
                  subtitle={
                    collection.subtitle || `${collection.bookCount} books`
                  }
                  accent={collection.accent}
                  onPress={openCollection}
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
