import { ApiError } from '@/services/api/client';
import type { ReadingProgressRow } from '@/services/api/types';
import {
  getReadingProgress,
  listReadingProgress,
  saveReadingProgress,
} from '@/services/account';
import {
  dropOnFlushError,
  mergeServerRow,
  type ReadingPosition,
} from '@/services/readingPositionMerge';
import { keyValueStore } from '@/stores/storage';

/**
 * Where the reader is in every book, on disk and ahead of the network.
 *
 * The reader screen needs the page before it can draw anything, and the shelf
 * needs it to say "Page 42 of 310" — neither can wait on a round trip, and
 * neither should fail offline. So every position is mirrored in MMKV, keyed
 * by user and book, and read synchronously:
 *
 *   · a page turn is written here first (`recordPosition`), synchronously,
 *     stamped with the moment it happened, and marked pending — so the page
 *     is on disk before the turn has finished animating, and killing the app
 *     the instant after still reopens the book there;
 *   · pending positions are pushed to `reading-progress` by `flushPositions`
 *     with that stamp as `client_updated_at`, so a queue drained hours later —
 *     in any order — cannot move the reader backwards;
 *   · every row that comes back from the server, on a write or a read, is
 *     merged by `acceptRow`: the newer `last_read_at` wins, and a pending
 *     local position newer than the server's is kept until it has been sent.
 *
 * Nothing here is async on the read side. The write side is fire-and-forget:
 * a failed push leaves the position pending for the next flush, which runs on
 * every foreground and every sign-in.
 */

export type { ReadingPosition };

const STORAGE_ID = 'ilm-reading-positions';
const store = keyValueStore(STORAGE_ID);

/** How many positions a single flush will push before giving the network a rest. */
const FLUSH_BATCH = 25;

function positionKey(userId: string, bookId: string) {
  return `pos:${userId}:${bookId}`;
}

function pendingKey(userId: string) {
  return `pending:${userId}`;
}

function readJson<T>(key: string): T | null {
  const raw = store.getString(key);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    store.remove(key);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Subscriptions — so a screen re-renders when a position changes under it.
// ---------------------------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();
/** Bumped on every write. Cheap to compare, which is what `useSyncExternalStore` wants. */
let version = 0;

function notify() {
  version += 1;
  listeners.forEach(listener => listener());
}

/**
 * How long a run of page turns is left to finish before the shelves hear
 * about it. The write itself is never delayed — only the re-render of every
 * shelf caption under the reader, which nobody can see while the book is open.
 */
const NOTIFY_COALESCE_MS = 400;
let notifyTimer: ReturnType<typeof setTimeout> | null = null;

/** Like `notify`, but a burst of calls collapses into one, at the end of the burst. */
function notifySoon() {
  if (notifyTimer) {
    clearTimeout(notifyTimer);
  }
  notifyTimer = setTimeout(() => {
    notifyTimer = null;
    notify();
  }, NOTIFY_COALESCE_MS);
}

export function subscribeToPositions(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function positionsVersion() {
  return version;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** The cached position, if the reader has opened this book on this device or synced it. */
export function getPosition(
  userId: string,
  bookId: string,
): ReadingPosition | null {
  const position = readJson<ReadingPosition>(positionKey(userId, bookId));
  return position && position.page > 0 ? position : null;
}

/**
 * The pending queue, mirrored in memory so the hot path — a page turn —
 * never has to read and parse it from disk to learn what it already knows.
 * Disk is still the source of truth across launches; this is only a cache
 * of it, filled on first touch per user.
 */
const pendingCache = new Map<string, string[]>();

function pendingIds(userId: string): string[] {
  const cached = pendingCache.get(userId);
  if (cached) {
    return cached;
  }
  const ids = readJson<string[]>(pendingKey(userId)) ?? [];
  pendingCache.set(userId, ids);
  return ids;
}

function setPendingIds(userId: string, ids: string[]) {
  pendingCache.set(userId, ids);
  if (ids.length === 0) {
    store.remove(pendingKey(userId));
  } else {
    store.set(pendingKey(userId), JSON.stringify(ids));
  }
}

function markPending(userId: string, bookId: string, pending: boolean) {
  const ids = pendingIds(userId);
  const has = ids.includes(bookId);
  if (pending && !has) {
    setPendingIds(userId, [...ids, bookId]);
  } else if (!pending && has) {
    setPendingIds(
      userId,
      ids.filter(id => id !== bookId),
    );
  }
}

function writePosition(
  userId: string,
  position: ReadingPosition,
  { coalesce = false }: { coalesce?: boolean } = {},
) {
  store.set(positionKey(userId, position.bookId), JSON.stringify(position));
  markPending(userId, position.bookId, position.pending);
  if (coalesce) {
    notifySoon();
  } else {
    notify();
  }
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * The reader turned to a page. Written to disk now, sent later.
 *
 * This is the hot path: it runs on every turn, and a reader flicking through
 * a book runs it several times a second. So it is one synchronous MMKV write
 * and nothing else — the pending queue is answered from memory, and the
 * shelves are told once the run of turns is over rather than on each one.
 * The position is durable the moment this returns; closing or killing the
 * app on the very next frame reopens the book on this page.
 *
 * The stamp is taken here — the moment of the turn — not when the request
 * goes out, because that is the instant the server compares against.
 */
export function recordPosition(
  userId: string,
  bookId: string,
  page: number,
  totalPages: number,
): ReadingPosition {
  const position: ReadingPosition = {
    bookId,
    page: Math.max(1, Math.round(page)),
    totalPages: Math.max(0, Math.round(totalPages)),
    updatedAt: new Date().toISOString(),
    pending: true,
  };
  writePosition(userId, position, { coalesce: true });
  return position;
}

/**
 * Merges a row from the server into the cache — newer `last_read_at` wins.
 * The rules are `mergeServerRow`'s; this is the write. Returns the position
 * now in the cache.
 */
export function acceptRow(
  userId: string,
  row: ReadingProgressRow,
): ReadingPosition | null {
  const cached = getPosition(userId, row.book_id);
  const next = mergeServerRow(cached, row);
  if (!next) {
    return cached;
  }
  writePosition(userId, next);
  return next;
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

/**
 * Reads the server's position for one book and merges it in.
 *
 * For the reader on open: the cache has already put a page on screen, and if
 * the server knows a newer one — read on another device, say — this brings it
 * down. Resolves to the merged position, which the caller compares against
 * the page it is showing. Never throws: offline simply means the cache stands.
 */
export async function pullPosition(
  userId: string,
  bookId: string,
): Promise<ReadingPosition | null> {
  try {
    const row = await getReadingProgress(bookId);
    return row ? acceptRow(userId, row) : getPosition(userId, bookId);
  } catch {
    return getPosition(userId, bookId);
  }
}

/**
 * Seeds the cache with every position the server has — once per session.
 *
 * After this, any book on any shelf opens on its page with no round trip.
 * Runs after `flushPositions` on sign-in so a position recorded before the
 * app was closed is on the server before the server's list is taken as read.
 */
export async function hydratePositions(userId: string): Promise<void> {
  try {
    const rows = await listReadingProgress();
    rows.forEach(row => acceptRow(userId, row));
  } catch {
    // Offline, or signed out mid-call. The cache from the last session stands.
  }
}

const inflight = new Map<string, Promise<void>>();

/**
 * Pushes every pending position to the server, one write per book.
 *
 * One flush at a time per user; a call while one is running joins it. A
 * position is dropped from the queue on a 4xx — the server has said it will
 * never take it, and retrying cannot change that — and kept on anything else
 * (network, 5xx, a session that has just expired), and the loop stops there
 * rather than fail the same way for every book in turn.
 */
export function flushPositions(userId: string): Promise<void> {
  const running = inflight.get(userId);
  if (running) {
    return running;
  }
  const task = flush(userId).finally(() => {
    inflight.delete(userId);
  });
  inflight.set(userId, task);
  return task;
}

async function flush(userId: string) {
  const ids = pendingIds(userId).slice(0, FLUSH_BATCH);
  for (const bookId of ids) {
    const position = getPosition(userId, bookId);
    if (!position || !position.pending) {
      markPending(userId, bookId, false);
      continue;
    }

    try {
      const row = await saveReadingProgress(
        bookId,
        position.page,
        position.totalPages,
        position.updatedAt,
      );
      // The server answers with the row that won. When ours was applied its
      // `last_read_at` is our own stamp and the merge clears the pending flag;
      // when it was not, the row is newer and replaces ours outright.
      acceptRow(userId, row);
      // A position turned in the moment between the send and the answer is
      // still pending and still newer than the row, so `acceptRow` left it —
      // only an unchanged one is marked as sent.
      const after = getPosition(userId, bookId);
      if (after && after.updatedAt === position.updatedAt) {
        writePosition(userId, { ...after, pending: false });
      }
    } catch (error) {
      if (dropOnFlushError(error instanceof ApiError ? error.status : 0)) {
        markPending(userId, bookId, false);
        continue;
      }
      return;
    }
  }
}
