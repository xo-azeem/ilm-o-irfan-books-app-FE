import { memo, useCallback, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { LayoutGrid, LayoutList } from 'lucide-react-native';

import {
  BookCard,
  BookListRow,
  type BookSummary,
} from '@/components/books/BookCards';
import {
  CatalogGridSkeleton,
  ListSkeleton,
} from '@/components/skeletons/CatalogSkeletons';
import { IconButton } from '@/components/ui';
import { useStrings } from '@/i18n';
import { useBookListStore, type BookListLayout } from '@/stores/bookListStore';
import {
  TILE_GAP,
  tileGridFor,
  type TileGrid,
} from '@/components/books/tileGrid';

/**
 * The two ways a long list of books is laid out, and the switch between
 * them. One preference for every list in the app — see `bookListStore`.
 */

/** Space between list rows. */
export const ROW_GAP = 14;

/** The tile grid at this screen's width — see `tileGrid.ts`. */
export function useTileGrid(): TileGrid {
  const { width } = useWindowDimensions();
  return useMemo(() => tileGridFor(width), [width]);
}

/** The reader's current choice, and the switch. */
export function useBookListLayout(): {
  bookLayout: BookListLayout;
  toggleLayout: () => void;
} {
  const bookLayout = useBookListStore(state => state.layout);
  const toggleLayout = useBookListStore(state => state.toggleLayout);
  return { bookLayout, toggleLayout };
}

/**
 * The switch itself: one button that shows the layout a tap will give — a
 * grid while the list is a list, rows while it is tiles.
 */
export const BookListLayoutToggle = memo(function BookListLayoutToggle() {
  const s = useStrings();
  const { bookLayout, toggleLayout } = useBookListLayout();
  const toTiles = bookLayout === 'list';
  return (
    <IconButton
      icon={toTiles ? LayoutGrid : LayoutList}
      buttonSize={36}
      size={15}
      variant="secondary"
      onPress={toggleLayout}
      accessibilityLabel={
        toTiles ? s.catalog.list.showTiles : s.catalog.list.showList
      }
    />
  );
});

/** A tile in the grid: the cover with its title and author beneath. */
export const BookTile = memo(function BookTile({
  book,
  width,
  rank,
  onPress,
}: {
  book: BookSummary;
  width: number;
  rank?: number;
  onPress: (book: BookSummary) => void;
}) {
  return <BookCard book={book} width={width} rank={rank} onPress={onPress} />;
});

/**
 * What a `FlatList` needs to draw books in the chosen layout: the columns,
 * the row renderer, the gaps and a key that remounts the list when the
 * column count changes — which `numColumns` demands.
 */
export function useBookListRendering({
  bookLayout,
  onPressBook,
  ranked = false,
}: {
  bookLayout: BookListLayout;
  onPressBook: (book: BookSummary) => void;
  /** Number the tiles, as the trending rail does. */
  ranked?: boolean;
}) {
  const grid = useTileGrid();
  const tiles = bookLayout === 'tiles';
  const columns = tiles ? grid.columns : 1;

  const renderItem = useCallback(
    ({ item, index }: { item: BookSummary; index: number }) =>
      tiles ? (
        <BookTile
          book={item}
          width={grid.tileWidth}
          rank={ranked ? index + 1 : undefined}
          onPress={onPressBook}
        />
      ) : (
        <BookListRow book={item} onPress={onPressBook} />
      ),
    [grid.tileWidth, onPressBook, ranked, tiles],
  );

  return {
    tiles,
    columns,
    listKey: tiles ? `tiles-${columns}` : 'list',
    renderItem,
    columnWrapperStyle: tiles ? styles.tileRow : undefined,
    ItemSeparatorComponent: tiles ? TileRowGap : ListGap,
    // The placeholder drawn while the first page is on its way, in the
    // same shape the page will take.
    skeleton: tiles ? (
      <CatalogGridSkeleton
        count={columns * 3}
        columns={columns}
        itemWidth={grid.tileWidth}
      />
    ) : (
      <ListSkeleton count={5} />
    ),
    // Fewer, taller cells per screen as rows; more, shorter ones as tiles.
    initialNumToRender: tiles ? columns * 4 : 8,
  };
}

function ListGap() {
  return <View style={styles.rowGap} />;
}

function TileRowGap() {
  return <View style={styles.tileGap} />;
}

const styles = StyleSheet.create({
  tileRow: {
    gap: TILE_GAP,
  },
  rowGap: {
    height: ROW_GAP,
  },
  tileGap: {
    height: TILE_GAP + 4,
  },
});
