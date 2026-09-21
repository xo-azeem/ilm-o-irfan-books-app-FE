/**
 * How much of a page is blank at its sides.
 *
 * A page of a book is mostly margin: a block of type in the middle, paper
 * either side. The stage draws the page wider than the screen and lets the
 * screen clip the overflow, which is how a page of a tall phone fills more
 * than a third of it — but only the paper may be clipped, never the type.
 * How much paper there is differs from book to book (a novel set with wide
 * margins, a textbook set tight), so it is measured from the rendered page
 * rather than assumed: a small picture of it, scanned column by column.
 *
 * A column counts as type when a few percent of its pixels differ from the
 * paper. A running head or a folio is one line among forty and does not
 * reach that, so the margin found is the body's — which is what may be
 * clipped safely, and is why a book's page numbers can end up past the edge
 * while its text never does. (The stage shows the page number itself.)
 */

export type SideMargins = {
  /** Blank paper at the left, as a fraction of the page width. */
  left: number;
  /** ...and at the right. */
  right: number;
};

/** A column is type once this much of it differs from the paper. */
const INK_COLUMN_RATIO = 0.06;
/** How far from the paper's brightness a pixel has to be to count as ink. */
const INK_THRESHOLD = 40;

function luminance(rgba: Uint8Array, i: number): number {
  return 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
}

/**
 * The side margins of a page, from its pixels (RGBA, row-major).
 *
 * `null` when the picture has no type in it at all — a blank page, or one
 * not drawn yet — so a caller keeps whatever it knew.
 */
export function measureSideMargins(
  rgba: Uint8Array,
  width: number,
  height: number,
): SideMargins | null {
  if (width <= 0 || height <= 0 || rgba.length < width * height * 4) {
    return null;
  }

  // The paper is whatever most of the page is: the median brightness.
  const lums = new Float32Array(width * height);
  for (let p = 0; p < width * height; p++) {
    lums[p] = luminance(rgba, p * 4);
  }
  const sorted = Float32Array.from(lums).sort();
  const paper = sorted[Math.floor(sorted.length / 2)];

  const needed = Math.max(2, Math.ceil(height * INK_COLUMN_RATIO));
  let first = -1;
  let last = -1;
  for (let x = 0; x < width; x++) {
    let ink = 0;
    for (let y = 0; y < height; y++) {
      if (Math.abs(lums[y * width + x] - paper) > INK_THRESHOLD) {
        ink++;
        if (ink >= needed) break;
      }
    }
    if (ink >= needed) {
      if (first < 0) first = x;
      last = x;
    }
  }
  if (first < 0) return null;

  return {
    left: first / width,
    right: (width - 1 - last) / width,
  };
}

/** Kept back from a measured margin, for rounding and the odd wide line. */
const MARGIN_SAFETY = 0.02;
/** Never wider than this, whatever the margins: a page has to stay a page. */
export const MAX_PAGE_FILL = 1.6;

/**
 * How much wider than the frame a page with these margins may be drawn.
 *
 * Drawing a page `fill` times the frame's width puts `(fill − 1) / (2·fill)`
 * of its width past each edge, so that is what the smaller margin has to
 * cover, with a little in hand.
 */
export function fillLimitFor(
  margins: SideMargins | null,
  fallback: number,
): number {
  if (!margins) return fallback;
  const margin = Math.min(margins.left, margins.right) - MARGIN_SAFETY;
  if (margin <= 0) return 1;
  const limit = 1 / (1 - 2 * margin);
  return Math.min(MAX_PAGE_FILL, Math.max(1, limit));
}
