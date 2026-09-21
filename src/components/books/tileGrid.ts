import { layout } from '@/theme/palette';

/**
 * The grid a list of books becomes as tiles: how many across, and how wide
 * each one is, at a given screen width. Pure, so the arithmetic can be
 * tested without a screen.
 */

/** Space between tiles, and between rows of them. */
export const TILE_GAP = 14;
/** What a tile wants to be; the grid fits as many as the screen allows. */
const TILE_TARGET = 120;
/** Never fewer than a phone's worth of columns, whatever the width. */
const MIN_COLUMNS = 3;

export type TileGrid = {
  columns: number;
  tileWidth: number;
};

/**
 * Three on a phone, more on a tablet, and the tiles share the width exactly
 * so the grid meets both margins.
 */
export function tileGridFor(screenWidth: number): TileGrid {
  const inner = Math.max(0, screenWidth - layout.screenPadding * 2);
  const columns = Math.max(
    MIN_COLUMNS,
    Math.floor((inner + TILE_GAP) / (TILE_TARGET + TILE_GAP)),
  );
  const tileWidth = Math.max(
    0,
    Math.floor((inner - TILE_GAP * (columns - 1)) / columns),
  );
  return { columns, tileWidth };
}
