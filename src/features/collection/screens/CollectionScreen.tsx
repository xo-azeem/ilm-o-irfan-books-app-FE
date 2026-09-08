import { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/app/navigation/types';
import { BookListRow, type BookSummary } from '@/components/books';
import { Screen, ScreenHeader } from '@/components/layout';
import { ListSkeleton } from '@/components/skeletons/CatalogSkeletons';
import { EmptyState, Label } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { useLibrary } from '@/hooks/useAccount';
import { useCollectionBooks } from '@/hooks/useCatalog';
import type { CatalogBook } from '@/services/catalog';
import { isUrduTitle } from '@/services/script';
import { layout } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

function toSummary(book: CatalogBook, inLibrary: boolean): BookSummary {
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
    inLibrary,
    isUrdu: isUrduTitle(book.title),
    meta: book.author ? `${book.author} · ${book.readTime}` : book.readTime,
  };
}

/**
 * One curated collection.
 *
 * The books arrive in the order an editor arranged them and are drawn in that
 * order — nothing here sorts, filters or tops up the shelf. The heading comes
 * from the collection the endpoint sends back with the first page, so a deep
 * link that carries only a slug titles itself correctly and a title an editor
 * changes is right on the next load rather than at the next release.
 */
export function CollectionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Collection'>>();
  const { colors } = useTheme();

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
        [...(library?.reading ?? []), ...(library?.finished ?? [])].map(book => book.id),
      ),
    [library?.finished, library?.reading],
  );

  const books = useMemo(() => data?.pages.flatMap(page => page.data) ?? [], [data]);
  const collection = data?.pages[0]?.collection ?? null;
  const totalCount = data?.pages[0]?.totalCount ?? books.length;

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

  const renderItem = useCallback(
    ({ item }: { item: CatalogBook }) => (
      <BookListRow book={toSummary(item, libraryIds.has(item.id))} onPress={openBook} />
    ),
    [libraryIds, openBook],
  );

  const header = (
    <View style={styles.header}>
      <ScreenHeader
        title={collection?.title ?? 'Collection'}
        subtitle={collection?.subtitle}
        onBack={navigation.goBack}
      />
      {books.length > 0 ? (
        <Label>{`${totalCount.toLocaleString('en-US')} ${totalCount === 1 ? 'book' : 'books'}`}</Label>
      ) : null}
      {isPending ? <ListSkeleton count={5} /> : null}
    </View>
  );

  return (
    <Screen scrollable={false} padding={0}>
      <FlatList
        data={books}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={ListGap}
        ListHeaderComponent={header}
        ListEmptyComponent={
          isPending ? null : (
            // An empty collection is a real answer from the backend, not a
            // failure and not something to backfill with other books.
            <EmptyState
              art={null}
              title="Nothing on this shelf yet"
              message="The editors are still filling this collection. Check back soon."
            />
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color={colors.primary} style={styles.spinner} />
          ) : null
        }
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        onEndReachedThreshold={0.8}
        onEndReached={loadMore}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={9}
        style={styles.grow}
        contentContainerStyle={styles.list}
      />
    </Screen>
  );
}

function ListGap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  grow: {
    flex: 1,
  },
  list: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 12,
  },
  header: {
    gap: 18,
    paddingBottom: 14,
  },
  gap: {
    height: 14,
  },
  spinner: {
    alignSelf: 'center',
    paddingTop: 18,
  },
});
