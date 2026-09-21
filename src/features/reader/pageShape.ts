import { sharedMMKV } from '@/stores/storage';

/**
 * The shape of a book's page (width / height), remembered per book.
 *
 * The document view sizes its page to the view it is *loaded* into and does
 * not reliably refit when that view is resized afterwards. The stage only
 * learns the page's shape from the load itself, so on a first open the view
 * is mounted at the screen's width, told the shape, resized — and the page
 * may stay fitted to the width it was loaded at, drawn small and pinned to
 * the left. Remembering the shape means every open after the first mounts
 * the view at its final size, and `BookPageFlip` remounts it once on the
 * first open the moment the shape is known.
 */

const STORE_ID = 'ilm-reader-page-shape';

function key(bookId: string): string {
  return `aspect:${bookId}`;
}

export function readPageShape(bookId: string | undefined): number {
  if (!bookId) return 0;
  const value = sharedMMKV(STORE_ID)?.getNumber(key(bookId));
  return value && Number.isFinite(value) && value > 0 ? value : 0;
}

export function rememberPageShape(bookId: string | undefined, aspect: number) {
  if (!bookId || !Number.isFinite(aspect) || aspect <= 0) return;
  sharedMMKV(STORE_ID)?.set(key(bookId), aspect);
}

/**
 * The narrower of a book's two side margins, as a fraction of the page
 * width, remembered per book — see `pageInk.ts` for how it is measured and
 * what it buys. The smallest ever seen is what is kept: a page with less
 * margin than the rest is the one that decides how far the book may be
 * drawn past the screen's edge.
 */
export function readPageMargin(bookId: string | undefined): number | null {
  if (!bookId) return null;
  const value = sharedMMKV(STORE_ID)?.getNumber(`margin:${bookId}`);
  return value != null && Number.isFinite(value) && value >= 0 ? value : null;
}

export function rememberPageMargin(
  bookId: string | undefined,
  margin: number,
): number {
  if (!bookId || !Number.isFinite(margin) || margin < 0) return margin;
  const known = readPageMargin(bookId);
  const next = known == null ? margin : Math.min(known, margin);
  if (next !== known) sharedMMKV(STORE_ID)?.set(`margin:${bookId}`, next);
  return next;
}
