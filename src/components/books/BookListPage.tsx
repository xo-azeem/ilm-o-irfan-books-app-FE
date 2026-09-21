import { memo, useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import type { BookSummary } from '@/components/books/BookCards';
import {
  BookListLayoutToggle,
  useBookListLayout,
  useBookListRendering,
} from '@/components/books/BookListLayout';
import { Screen, ScreenHeader } from '@/components/layout';
import { EmptyState, Label } from '@/components/ui';
import { layout } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

const keyExtractor = (item: BookSummary) => item.id;

export type BookListPageProps = {
  title: string;
  subtitle?: string;
  /** The line under the heading — a count, a note on the source — if any. */
  note?: string | null;
  books: BookSummary[];
  /** The first page is still on its way: the skeleton stands in. */
  isPending: boolean;
  isRefetching?: boolean;
  isFetchingNextPage?: boolean;
  onRefresh?: () => void;
  /** Asked for well before the end; a no-op when there is nothing more. */
  onLoadMore?: () => void;
  onBack: () => void;
  onPressBook: (book: BookSummary) => void;
  /** Number the tiles, as the trending rail does. */
  ranked?: boolean;
  empty: { title: string; message: string };
};

/**
 * A page of books: a heading, a line about the list, and the list — as rows
 * or as tiles, whichever the reader last chose, with the switch in the
 * header. Every list that opens from Home or Discover is this page with a
 * different list in it: a collection, Trending, New arrivals, "Because you
 * read …".
 *
 * The page draws exactly what it is handed, in that order. Which books, and
 * what the heading says, is the caller's — usually the backend's.
 */
export const BookListPage = memo(function BookListPage({
  title,
  subtitle,
  note,
  books,
  isPending,
  isRefetching = false,
  isFetchingNextPage = false,
  onRefresh,
  onLoadMore,
  onBack,
  onPressBook,
  ranked = false,
  empty,
}: BookListPageProps) {
  const { colors } = useTheme();
  const { bookLayout } = useBookListLayout();
  const rendering = useBookListRendering({ bookLayout, onPressBook, ranked });

  const handleRefresh = useCallback(() => onRefresh?.(), [onRefresh]);

  const header = (
    <View style={styles.header}>
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        action={<BookListLayoutToggle />}
      />
      {books.length > 0 && note ? <Label>{note}</Label> : null}
      {isPending ? rendering.skeleton : null}
    </View>
  );

  return (
    <Screen scrollable={false} padding={0}>
      <FlatList
        key={rendering.listKey}
        data={books}
        keyExtractor={keyExtractor}
        renderItem={rendering.renderItem}
        numColumns={rendering.columns}
        columnWrapperStyle={rendering.columnWrapperStyle}
        ItemSeparatorComponent={rendering.ItemSeparatorComponent}
        ListHeaderComponent={header}
        ListEmptyComponent={
          isPending ? null : (
            // An empty list is a real answer, not a failure and not
            // something to backfill with other books.
            <EmptyState
              art={null}
              title={empty.title}
              message={empty.message}
            />
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color={colors.primary} style={styles.spinner} />
          ) : null
        }
        refreshing={isRefetching}
        onRefresh={onRefresh ? handleRefresh : undefined}
        onEndReachedThreshold={0.8}
        onEndReached={onLoadMore}
        showsVerticalScrollIndicator={false}
        initialNumToRender={rendering.initialNumToRender}
        windowSize={9}
        style={styles.grow}
        contentContainerStyle={styles.list}
      />
    </Screen>
  );
});

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
  spinner: {
    alignSelf: 'center',
    paddingTop: 18,
  },
});
