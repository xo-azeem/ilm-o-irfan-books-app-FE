import { BOOK_LIST_COLUMNS, normalizeBookRow } from './books';
import { assertOk, num, supabase, unwrap } from './client';
import type { AdminBookRow } from './types';

/**
 * Bulk uploads.
 *
 * A series or a new subject arrives as a set, and half a set on Home is worse
 * than none. A batch holds the set back: its books are ordinary drafts, added
 * one PDF at a time, invisible to readers until the whole batch is published
 * in one call — into its destination collection and category, through the
 * same storage check every other publish goes through.
 */

export type UploadBatchStatus = 'draft' | 'published';

export type UploadBatch = {
  id: string;
  title: string;
  status: UploadBatchStatus;
  collection_id: string | null;
  category_id: string | null;
  collection_title: string | null;
  category_label: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  /** Every book in the batch. */
  book_count: number;
  /** The ones with a PDF attached — the ones a publish would put live. */
  ready_count: number;
  published_count: number;
};

const BATCH_COLUMNS =
  'id,title,status,collection_id,category_id,collection_title,category_label,' +
  'created_by,created_at,updated_at,published_at,book_count,ready_count,published_count';

function normalizeBatch(row: Record<string, unknown>): UploadBatch {
  return {
    ...(row as UploadBatch),
    book_count: num(row.book_count),
    ready_count: num(row.ready_count),
    published_count: num(row.published_count),
  };
}

export async function listUploadBatches(): Promise<UploadBatch[]> {
  const rows = unwrap(
    await supabase
      .from('admin_upload_batch_rows')
      .select(BATCH_COLUMNS)
      .order('created_at', { ascending: false }),
  ) as unknown as Record<string, unknown>[];
  return rows.map(normalizeBatch);
}

export async function getUploadBatch(id: string): Promise<UploadBatch> {
  const row = unwrap(
    await supabase
      .from('admin_upload_batch_rows')
      .select(BATCH_COLUMNS)
      .eq('id', id)
      .single(),
  ) as unknown as Record<string, unknown>;
  return normalizeBatch(row);
}

export type UploadBatchInput = {
  title: string;
  collection_id: string | null;
  category_id: string | null;
};

export async function createUploadBatch(
  input: UploadBatchInput,
): Promise<string> {
  const inserted = unwrap(
    await supabase
      .from('upload_batches')
      .insert({
        title: input.title.trim(),
        collection_id: input.collection_id,
        category_id: input.category_id,
      })
      .select('id')
      .single(),
  ) as { id: string };
  return inserted.id;
}

export async function updateUploadBatch(
  id: string,
  patch: Partial<UploadBatchInput>,
): Promise<void> {
  const payload: Record<string, unknown> = { ...patch };
  if (typeof patch.title === 'string') {
    payload.title = patch.title.trim();
  }
  assertOk(await supabase.from('upload_batches').update(payload).eq('id', id));
}

/** Removes the batch. Its books stay, as drafts, with no batch. */
export async function deleteUploadBatch(id: string): Promise<void> {
  assertOk(await supabase.from('upload_batches').delete().eq('id', id));
}

/** The books in one batch, oldest first — the order they were added. */
export async function listBatchBooks(batchId: string): Promise<AdminBookRow[]> {
  const rows = unwrap(
    await supabase
      .from('admin_book_rows')
      .select(BOOK_LIST_COLUMNS)
      .eq('upload_batch_id', batchId)
      .order('created_at', { ascending: true }),
  ) as unknown as Record<string, unknown>[];
  return rows.map(normalizeBookRow);
}

/** Takes a book out of its batch. The draft itself is kept. */
export async function detachBatchBook(bookId: string): Promise<void> {
  assertOk(
    await supabase
      .from('books')
      .update({ upload_batch_id: null })
      .eq('id', bookId),
  );
}

export type PublishBatchResult = {
  updated: number;
  skipped: number;
  /** True only when every book went live and the batch is marked published. */
  batchPublished: boolean;
};

export async function publishUploadBatch(
  batchId: string,
): Promise<PublishBatchResult> {
  const data = unwrap(
    await supabase.rpc('admin_publish_upload_batch', { p_batch_id: batchId }),
  ) as { updated?: number; skipped?: number; batchPublished?: boolean };
  return {
    updated: num(data.updated),
    skipped: num(data.skipped),
    batchPublished: Boolean(data.batchPublished),
  };
}
