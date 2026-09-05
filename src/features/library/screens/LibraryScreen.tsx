import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList, RootTabParamList } from '@/app/navigation/types';
import { BookListRow, ContinueCard, type BookSummary } from '@/components/books';
import { Screen, ScreenHeader } from '@/components/layout';
import { LibraryCatalogSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { EmptyState, ViewToggle, type ViewMode } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import {
  LibraryFilters,
  type LibraryShelf,
} from '@/features/library/components/LibraryFilters';
import { ShelfGrid, useShelfMetrics } from '@/features/library/components/ShelfGrid';
import { useLibrary, useWishlist } from '@/hooks/useAccount';
import { useAccess } from '@/lib/access';
import { useAuthStore } from '@/stores/authStore';
import type { CatalogBook } from '@/services/catalog';
import { isUrduTitle } from '@/services/script';

type LibraryNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'MyLibrary'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function toSummary(
  book: CatalogBook,
  extra?: { progress?: number; finished?: boolean; meta?: string },
): BookSummary {
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
    inLibrary: true,
    isUrdu: isUrduTitle(book.title),
    ...extra,
  };
}

/**
 * The reader's shelf.
 *
 * Four shelves share one grid — reading, saved, finished and offline — because
 * they differ in what they contain, not in how a book should look.
 */
export function LibraryScreen() {
  const navigation = useNavigation<LibraryNavigation>();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const { canOpenBooks } = useAccess();
  const { data, isLoading } = useLibrary();
  // Only fetched when the summary did not carry the saved shelf — see below.
  const { data: wishlist } = useWishlist({
    // A summary that reports saved books but returns none came from the
    // fallback path; a genuinely empty shelf reports zero and needs no read.
    enabled: (data?.wishlistCount ?? 0) > 0 && data?.saved.length === 0,
  });
  const { itemWidth } = useShelfMetrics();

  const [shelf, setShelf] = useState<LibraryShelf>('reading');
  const [view, setView] = useState<ViewMode>('grid');

  // The two shelves arrive already split, at the same 0.99 threshold the
  // backend counts a book as finished at.
  const reading = useMemo(
    () =>
      (data?.reading ?? []).map(book =>
        toSummary(book, { progress: book.progress, meta: book.chapter }),
      ),
    [data?.reading],
  );

  const finished = useMemo(
    () =>
      (data?.finished ?? []).map(book => toSummary(book, { progress: 1, finished: true })),
    [data?.finished],
  );

  // `library-overview` carries the saved shelf too, so the tab renders all four
  // off one request. `useWishlist` only answers on the fallback path, where the
  // summary reports a wishlist count but has no books to go with it.
  const saved = useMemo(
    () => (data?.saved?.length ? data.saved : (wishlist ?? [])).map(book => toSummary(book)),
    [data?.saved, wishlist],
  );

  const offline = useMemo(
    () =>
      (data?.downloads ?? []).map(book =>
        toSummary(book, { meta: `${Math.round(book.sizeBytes / 1_000_000)} MB` }),
      ),
    [data?.downloads],
  );

  const shelves = useMemo(
    () => ({ reading, saved, finished, offline }),
    [finished, offline, reading, saved],
  );

  // Shelves are capped per request; the counts on the chips are the server's
  // real totals, so a reader past the cap does not see a short number.
  const counts = useMemo(
    () => ({
      reading: data?.readingCount ?? reading.length,
      saved: data?.wishlistCount ?? saved.length,
      finished: data?.finishedCount ?? finished.length,
      offline: data?.downloadsCount ?? offline.length,
    }),
    [
      data?.downloadsCount,
      data?.finishedCount,
      data?.readingCount,
      data?.wishlistCount,
      finished.length,
      offline.length,
      reading.length,
      saved.length,
    ],
  );

  const books = shelves[shelf];
  // The most recently read book, which the reading shelf returns first.
  const resume = reading[0];

  const openBook = useCallback(
    (book: { id: string }) => {
      // Without an entitlement the detail page is the right landing spot: it is
      // where the reader can see why the book will not open.
      navigation.navigate(
        canOpenBooks ? ROUTES.BOOK_READER : ROUTES.BOOK_DETAIL,
        { bookId: book.id },
      );
    },
    [canOpenBooks, navigation],
  );

  const browse = useCallback(() => navigation.navigate(ROUTES.SEARCH), [navigation]);

  const header = (
    <>
      <ScreenHeader
        title="My library"
        action={<ViewToggle value={view} onChange={setView} />}
      />
      <LibraryFilters value={shelf} counts={counts} onChange={setShelf} />
    </>
  );

  if (!isAuthenticated) {
    return (
      <Screen gap={20}>
        {header}
        <View style={styles.empty}>
          <EmptyState
            title="Your shelf is waiting."
            message="Sign in to save your place, download books for offline reading, and keep your finished titles."
            action={{
              label: 'Sign in',
              onPress: () => navigation.navigate(ROUTES.LOGIN),
            }}
            link={{ label: 'See what’s trending', onPress: browse }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen gap={20}>
      {header}

      {isLoading ? (
        <LibraryCatalogSkeleton itemWidth={itemWidth} />
      ) : books.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState
            title="Your shelf is waiting."
            message="Anything you open or save appears here, and stays available offline."
            action={{ label: 'Find your first book', onPress: browse }}
            link={{ label: 'See what’s trending', onPress: browse }}
          />
        </View>
      ) : (
        <>
          {shelf === 'reading' && resume ? (
            <ContinueCard
              book={resume}
              detail={resume.meta}
              onPress={openBook}
            />
          ) : null}

          {view === 'grid' ? (
            <ShelfGrid books={books} onBookPress={openBook} />
          ) : (
            <View style={styles.list}>
              {books.map(book => (
                <BookListRow key={book.id} book={book} onPress={openBook} />
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    paddingTop: 56,
  },
  list: {
    gap: 14,
  },
});
