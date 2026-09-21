import { useCallback, useMemo } from 'react';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/app/navigation/types';
import { BookListPage, type BookSummary } from '@/components/books';
import { ROUTES } from '@/constants/routes';
import { useLibrary } from '@/hooks/useAccount';
import { useStrings } from '@/i18n';
import { useCollectionBooks } from '@/hooks/useCatalog';
import type { CatalogBook } from '@/services/catalog';
import { isUrduTitle } from '@/services/script';

function toSummary(book: CatalogBook, inLibrary: boolean): BookSummary {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
    coverColor: book.coverColor,
    coverColorDark: book.coverColorDark,
    isPremium: book.isPremium,
    inLibrary,
    isUrdu: isUrduTitle(book.title),
    meta: book.author ? `${book.author} · ${book.readTime}` : book.readTime,
  };
}

/**
 * One collection, in full: a curated shelf, or Trending / New arrivals
 * continued past the ten on Home.
 *
 * The books arrive in the order the backend serves them — an editor's
 * arrangement, or its stand-in when the editor has arranged nothing — and
 * are drawn in that order. Nothing here sorts, filters or tops up the list.
 * The heading comes from the collection the endpoint sends back with the
 * first page, so a deep link that carries only a slug titles itself and a
 * title an editor changes is right on the next load.
 */
export function CollectionScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Collection'>>();
  const s = useStrings();

  const { collectionId, slug } = route.params ?? {};
  const { data: library } = useLibrary();

  const {
    data,
    isPending,
    isFetchingNextPage,
    isRefetching,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useCollectionBooks({ id: collectionId, slug });

  const libraryIds = useMemo(
    () =>
      new Set(
        [...(library?.reading ?? []), ...(library?.finished ?? [])].map(
          book => book.id,
        ),
      ),
    [library?.finished, library?.reading],
  );

  const books = useMemo(
    () =>
      (data?.pages.flatMap(page => page.data) ?? []).map(book =>
        toSummary(book, libraryIds.has(book.id)),
      ),
    [data, libraryIds],
  );
  const collection = data?.pages[0]?.collection ?? null;
  const totalCount = data?.pages[0]?.totalCount ?? books.length;
  const source = data?.pages[0]?.source ?? 'curated';

  // What the list is, in one line under the count. The editor's picks need no
  // explanation; the two stand-ins do, or a reader could take a rotating draw
  // for a shelf someone chose.
  const sourceNote =
    source === 'weekly'
      ? s.catalog.collection.weekly
      : source === 'newest'
        ? s.catalog.collection.newestFirst
        : null;

  const openBook = useCallback(
    (book: { id: string }) =>
      navigation.navigate(ROUTES.BOOK_DETAIL, { bookId: book.id }),
    [navigation],
  );

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const refresh = useCallback(() => void refetch(), [refetch]);

  return (
    <BookListPage
      title={collection?.title ?? s.catalog.collection.fallbackTitle}
      subtitle={collection?.subtitle}
      note={`${s.common.bookCount(totalCount)}${
        sourceNote ? ` · ${sourceNote}` : ''
      }`}
      books={books}
      isPending={isPending}
      // Loading the next page is not a refresh, and must not spin the pull.
      isRefetching={isRefetching && !isFetchingNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onRefresh={refresh}
      onLoadMore={loadMore}
      onBack={navigation.goBack}
      onPressBook={openBook}
      // The trending shelf is a ranking, and its tiles say so as the rail does.
      ranked={collection?.slug === 'trending'}
      empty={{
        title: s.catalog.collection.emptyTitle,
        message: s.catalog.collection.emptyMessage,
      }}
    />
  );
}
