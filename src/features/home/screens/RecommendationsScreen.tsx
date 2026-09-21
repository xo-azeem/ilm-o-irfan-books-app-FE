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
import {
  ALL_RECOMMENDATIONS,
  RAIL_RECOMMENDATIONS,
  useRecommendations,
} from '@/hooks/useRecommendations';
import { useStrings } from '@/i18n';
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
 * "Because you read …" in full.
 *
 * With a `sectionId`, the page is that one rail continued: the same rail the
 * backend built for Home, asked for at its longest. Without one — the
 * cold-start rail, or a rail the backend has since rebuilt out from under
 * the id — it is the whole ranked list under a neutral heading. Either way
 * the heading is the backend's words, and the books are in its order.
 *
 * Signed-in only, as the rails on Home are; the route is only ever reached
 * from one of them.
 */
export function RecommendationsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Recommendations'>>();
  const s = useStrings();

  const { sectionId, title, subtitle } = route.params ?? {};
  const { data: library } = useLibrary();

  const { data, isPending, isRefetching, refetch } = useRecommendations(
    sectionId ? RAIL_RECOMMENDATIONS : ALL_RECOMMENDATIONS,
  );

  const libraryIds = useMemo(
    () =>
      new Set(
        [...(library?.reading ?? []), ...(library?.finished ?? [])].map(
          book => book.id,
        ),
      ),
    [library?.finished, library?.reading],
  );

  // The rail asked for, when the backend still has it; the flat list stands
  // in when it does not, rather than an empty page under a heading that
  // promises a book.
  const section = useMemo(
    () =>
      sectionId && data?.isPersonalized
        ? (data.sections.find(rail => rail.id === sectionId) ?? null)
        : null,
    [data, sectionId],
  );

  const books = useMemo(
    () =>
      (section?.books ?? data?.books ?? []).map(book =>
        toSummary(book, libraryIds.has(book.id)),
      ),
    [data?.books, libraryIds, section],
  );

  const heading = section
    ? { title: section.title, subtitle: section.subtitle }
    : data
      ? {
          title: data.isPersonalized
            ? s.catalog.recommendations.fallbackTitle
            : s.home.coldStart.title,
          subtitle: data.isPersonalized ? undefined : s.home.coldStart.subtitle,
        }
      : // Not landed yet: the words the reader tapped, so the page does not
        // open under a placeholder.
        { title: title ?? s.catalog.recommendations.fallbackTitle, subtitle };

  const openBook = useCallback(
    (book: { id: string }) =>
      navigation.navigate(ROUTES.BOOK_DETAIL, { bookId: book.id }),
    [navigation],
  );

  const refresh = useCallback(() => void refetch(), [refetch]);

  return (
    <BookListPage
      title={heading.title}
      subtitle={heading.subtitle}
      note={s.common.bookCount(books.length)}
      books={books}
      isPending={isPending}
      isRefetching={isRefetching}
      onRefresh={refresh}
      onBack={navigation.goBack}
      onPressBook={openBook}
      empty={{
        title: s.catalog.recommendations.emptyTitle,
        message: s.catalog.recommendations.emptyMessage,
      }}
    />
  );
}
