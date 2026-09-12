import type { HighlightRow } from '@/services/api/types';
import { keyValueStore } from '@/stores/storage';

/**
 * The last known bookmarks of each book, on disk.
 *
 * The reader's bookmark button has to know whether the page in view is saved
 * the moment the page is up, and the query that answers that is a round trip
 * away. This is the query's warm start: what `highlights-list` said last time,
 * handed to TanStack as `initialData` and refreshed behind it. Writes go
 * through the query cache, which mirrors here on every settle.
 */

const store = keyValueStore('ilm-bookmarks');

function key(userId: string, bookId: string) {
  return `bm:${userId}:${bookId}`;
}

export function readBookmarks(
  userId: string,
  bookId: string,
): HighlightRow[] | undefined {
  const raw = store.getString(key(userId, bookId));
  if (!raw) {
    return undefined;
  }
  try {
    const rows = JSON.parse(raw) as HighlightRow[];
    return Array.isArray(rows) ? rows : undefined;
  } catch {
    store.remove(key(userId, bookId));
    return undefined;
  }
}

export function writeBookmarks(
  userId: string,
  bookId: string,
  rows: HighlightRow[],
) {
  store.set(key(userId, bookId), JSON.stringify(rows));
}
