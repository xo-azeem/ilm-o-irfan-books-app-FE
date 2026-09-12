import type { ReadingProgressRow } from '@/services/api/types';

/**
 * The last-write-wins rules for reading positions, with nothing attached.
 *
 * Kept free of storage and network imports so they can be unit tested on
 * node — the rules are small, and getting one comparison backwards is the
 * difference between a book that reopens where it was left and one that
 * quietly walks backwards.
 */

export type ReadingPosition = {
  bookId: string;
  page: number;
  totalPages: number;
  /** ISO instant the reader was on `page`. Sent as `client_updated_at`. */
  updatedAt: string;
  /** True until the server has confirmed — or superseded — this position. */
  pending: boolean;
};

/** A stamp as an instant, or `0` for one that cannot be read. */
export function instant(iso: string | null | undefined): number {
  if (!iso) {
    return 0;
  }
  const value = Date.parse(iso);
  return Number.isFinite(value) ? value : 0;
}

/**
 * What the cache should hold after seeing a server row.
 *
 * Returns the position to write, or `null` to leave the cache as it is:
 *
 *   · a row with no page says nothing — keep whatever is cached;
 *   · a local position newer than the row is kept: pending, it has not
 *     reached the server yet and the row is what the server knew *before*
 *     it; confirmed, the row is a stale read that a fresher one overtook;
 *   · a confirmed local position with the row's own stamp and page is
 *     already this row — keep it, and spare the write;
 *   · anything else, the row replaces, and the book is no longer pending —
 *     either the server now holds what was sent (same stamp), or it holds
 *     something newer, and in both cases there is nothing left to send.
 */
export function mergeServerRow(
  cached: ReadingPosition | null,
  row: ReadingProgressRow,
): ReadingPosition | null {
  const page = Number(row.current_page ?? 0);
  if (!(page > 0)) {
    return null;
  }

  const serverAt = instant(row.last_read_at);
  const localAt = instant(cached?.updatedAt);
  // Newer locally, pending or not: a pending one has not been sent yet, and a
  // confirmed one means this row is a stale read overtaken by a fresher one.
  if (cached && localAt > serverAt) {
    return null;
  }
  if (
    cached &&
    !cached.pending &&
    localAt === serverAt &&
    cached.page === page
  ) {
    return null;
  }

  return {
    bookId: row.book_id,
    page,
    totalPages: Number(row.total_pages ?? cached?.totalPages ?? 0),
    updatedAt: row.last_read_at ?? new Date(0).toISOString(),
    pending: false,
  };
}

/**
 * Whether a failed push should be dropped from the queue rather than retried.
 *
 * A 4xx is the server saying it will never take this write, and retrying
 * cannot change that. A 401 is the exception: that is the session, not the
 * write, and the position is still good once the reader signs back in. A
 * status of 0 is the network, and a 5xx is the server's problem — both retry.
 */
export function dropOnFlushError(status: number): boolean {
  return status >= 400 && status < 500 && status !== 401;
}
