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
