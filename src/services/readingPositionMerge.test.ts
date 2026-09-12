import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ReadingProgressRow } from '@/services/api/types';
import {
  dropOnFlushError,
  mergeServerRow,
  type ReadingPosition,
} from './readingPositionMerge';

const BOOK = 'ffc921f5-01ba-41a1-81eb-a15958f03932';
const T1 = '2026-09-12T12:44:18.000Z';
const T2 = '2026-09-12T12:44:48.823Z';
const T3 = '2026-09-12T12:45:22.222Z';

function row(overrides: Partial<ReadingProgressRow> = {}): ReadingProgressRow {
  return {
    user_id: 'u',
    book_id: BOOK,
    current_page: 42,
    total_pages: 310,
    progress: 0.135,
    chapter_label: null,
    last_read_at: T2,
    ...overrides,
  };
}

function cached(overrides: Partial<ReadingPosition> = {}): ReadingPosition {
  return {
    bookId: BOOK,
    page: 42,
    totalPages: 310,
    updatedAt: T2,
    pending: false,
    ...overrides,
  };
}

describe('mergeServerRow', () => {
  it('takes the row when nothing is cached', () => {
    assert.deepEqual(mergeServerRow(null, row()), cached());
  });

  it('ignores a row with no page', () => {
    assert.equal(mergeServerRow(cached(), row({ current_page: null })), null);
    assert.equal(mergeServerRow(null, row({ current_page: 0 })), null);
  });

  it('keeps a pending local position that is newer than the row', () => {
    const local = cached({ page: 50, updatedAt: T3, pending: true });
    assert.equal(
      mergeServerRow(local, row({ current_page: 42, last_read_at: T2 })),
      null,
    );
  });

  it('lets a newer server row replace a pending local one', () => {
    const local = cached({ page: 41, updatedAt: T1, pending: true });
    assert.deepEqual(
      mergeServerRow(local, row({ current_page: 42, last_read_at: T2 })),
      cached({ page: 42, updatedAt: T2, pending: false }),
    );
  });

  it('clears pending when the server echoes our own stamp back', () => {
    // The server stores the stamp verbatim but prints it as +00:00.
    const local = cached({ page: 42, updatedAt: T2, pending: true });
    const echoed = row({
      current_page: 42,
      last_read_at: '2026-09-12T12:44:48.823+00:00',
    });
    assert.deepEqual(mergeServerRow(local, echoed), {
      ...local,
      updatedAt: '2026-09-12T12:44:48.823+00:00',
      pending: false,
    });
  });

  it('applies the server row when the write was not applied', () => {
    // POST answered `applied: false` with the newer stored row — that row wins.
    const local = cached({ page: 41, updatedAt: T1, pending: true });
    const stored = row({ current_page: 100, last_read_at: T3, applied: false });
    assert.deepEqual(
      mergeServerRow(local, stored),
      cached({ page: 100, updatedAt: T3, pending: false }),
    );
  });

  it('spares the write when a confirmed position already matches', () => {
    assert.equal(mergeServerRow(cached(), row()), null);
  });

  it('takes a confirmed position forward on a newer row', () => {
    const local = cached({ page: 42, updatedAt: T2 });
    assert.deepEqual(
      mergeServerRow(local, row({ current_page: 60, last_read_at: T3 })),
      cached({ page: 60, updatedAt: T3 }),
    );
  });

  it('does not walk a confirmed position backwards on an older row', () => {
    // A stale list read arriving after a fresher single read.
    const local = cached({ page: 60, updatedAt: T3 });
    assert.equal(
      mergeServerRow(local, row({ current_page: 42, last_read_at: T2 })),
      null,
    );
  });

  it('keeps the cached page count when the row has none', () => {
    const local = cached({ page: 42, totalPages: 310, updatedAt: T1 });
    const next = mergeServerRow(
      local,
      row({ current_page: 43, total_pages: null, last_read_at: T2 }),
    );
    assert.equal(next?.totalPages, 310);
  });
});

describe('dropOnFlushError', () => {
  it('drops a write the server has refused', () => {
    assert.equal(dropOnFlushError(400), true);
    assert.equal(dropOnFlushError(404), true);
  });

  it('retries the network, the server, and an expired session', () => {
    assert.equal(dropOnFlushError(0), false);
    assert.equal(dropOnFlushError(401), false);
    assert.equal(dropOnFlushError(500), false);
    assert.equal(dropOnFlushError(503), false);
  });
});
