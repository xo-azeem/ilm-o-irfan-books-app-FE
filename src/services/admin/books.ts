import { assertOk, num, supabase, unwrap } from './client';
import {
  ADMIN_PAGE_SIZE,
  uniqueSlug,
  type AdminBookDetail,
  type AdminBookFilters,
  type AdminBookInput,
  type AdminBookRow,
  type BookSort,
} from './types';

const LIST_COLUMNS =
  'id,slug,title,author_id,author_name,genre,tag,tags,rating,rating_count,' +
  'price_cents,currency,format,cover_path,cover_color,cover_color_dark,pdf_path,' +
  'file_size_bytes,read_time_minutes,is_premium,is_published,published_at,' +
  'created_at,updated_at,category_ids,collection_ids,reader_count,download_count,wishlist_count';

const SORTS: Record<BookSort, { column: string; ascending: boolean }> = {
  updated_desc: { column: 'updated_at', ascending: false },
  created_desc: { column: 'created_at', ascending: false },
  title_asc: { column: 'title', ascending: true },
  readers_desc: { column: 'reader_count', ascending: false },
  downloads_desc: { column: 'download_count', ascending: false },
};

export type AdminBookPage = {
  rows: AdminBookRow[];
  total: number;
  nextPage: number | null;
};

function normalizeRow(row: Record<string, unknown>): AdminBookRow {
  return {
    ...(row as AdminBookRow),
    rating: num(row.rating),
    tags: (row.tags as string[] | null) ?? [],
    category_ids: (row.category_ids as string[] | null) ?? [],
    collection_ids: (row.collection_ids as string[] | null) ?? [],
  };
}

export async function listAdminBooks(
  filters: AdminBookFilters,
  page = 0,
): Promise<AdminBookPage> {
  const from = page * ADMIN_PAGE_SIZE;
  const sort = SORTS[filters.sort] ?? SORTS.updated_desc;

  let builder = supabase
    .from('admin_book_rows')
    .select(LIST_COLUMNS, { count: 'exact' })
    .order(sort.column, { ascending: sort.ascending })
    .range(from, from + ADMIN_PAGE_SIZE - 1);

  const query = filters.query.trim().replace(/[,()]/g, ' ');
  if (query) {
    builder = builder.or(`title.ilike.%${query}%,author_name.ilike.%${query}%,slug.ilike.%${query}%`);
  }

  if (filters.status === 'published') {
    builder = builder.eq('is_published', true);
  } else if (filters.status === 'draft') {
    builder = builder.eq('is_published', false);
  } else if (filters.status === 'incomplete') {
    builder = builder.or('pdf_path.is.null,cover_path.is.null');
  }

  if (filters.access === 'premium') {
    builder = builder.eq('is_premium', true);
  } else if (filters.access === 'free') {
    builder = builder.eq('is_premium', false);
  }

  if (filters.authorId) {
    builder = builder.eq('author_id', filters.authorId);
  }

  if (filters.categoryId) {
    builder = builder.contains('category_ids', [filters.categoryId]);
  }

  const result = await builder;
  assertOk(result);

  const rows = ((result.data as unknown as Record<string, unknown>[]) ?? []).map(normalizeRow);
  const total = result.count ?? rows.length;

  return {
    rows,
    total,
    nextPage: from + rows.length < total && rows.length > 0 ? page + 1 : null,
  };
}

export async function getAdminBook(id: string): Promise<AdminBookDetail> {
  const row = unwrap(
    await supabase
      .from('admin_book_rows')
      .select(`${LIST_COLUMNS},description`)
      .eq('id', id)
      .single(),
  ) as unknown as Record<string, unknown>;

  return {
    ...normalizeRow(row),
    description: (row.description as string) ?? '',
  };
}

/** Titles a picker can choose from, without the heavy list payload. */
export async function listBookOptions(query = ''): Promise<
  Array<{ id: string; title: string; author_name: string; cover_path: string | null; cover_color: string | null }>
> {
  let builder = supabase
    .from('admin_book_rows')
    .select('id,title,author_name,cover_path,cover_color')
    .order('title')
    .limit(200);

  const trimmed = query.trim();
  if (trimmed) {
    builder = builder.ilike('title', `%${trimmed}%`);
  }

  return unwrap(await builder) as Array<{
    id: string;
    title: string;
    author_name: string;
    cover_path: string | null;
    cover_color: string | null;
  }>;
}

function bookPayload(input: AdminBookInput) {
  return {
    title: input.title.trim(),
    slug: input.slug.trim() || uniqueSlug(input.title),
    description: input.description.trim(),
    author_id: input.author_id,
    genre: input.genre.trim() || null,
    tag: input.tag.trim() || null,
    tags: input.tags.map(tag => tag.trim()).filter(Boolean),
    cover_color: input.cover_color.trim() || null,
    cover_color_dark: input.cover_color_dark.trim() || input.cover_color.trim() || null,
    cover_path: input.cover_path,
    pdf_path: input.pdf_path,
    file_size_bytes: input.file_size_bytes,
    read_time_minutes: input.read_time_minutes,
    price_cents: Math.max(0, Math.round(input.price_cents)),
    currency: input.currency.trim().toUpperCase() || 'PKR',
    format: input.format.trim() || 'Digital edition',
    is_premium: input.is_premium,
    is_published: input.is_published,
    // published_at is stamped by a database trigger.
  };
}

async function syncRelations(bookId: string, input: AdminBookInput) {
  assertOk(
    await supabase.rpc('admin_set_book_relations', {
      p_book_id: bookId,
      p_category_ids: input.category_ids,
      p_collection_ids: input.collection_ids,
    }),
  );
}

export async function createAdminBook(input: AdminBookInput): Promise<string> {
  const inserted = unwrap(
    await supabase.from('books').insert(bookPayload(input)).select('id').single(),
  );
  await syncRelations(inserted.id, input);
  return inserted.id;
}

export async function updateAdminBook(id: string, input: AdminBookInput): Promise<string> {
  unwrap(await supabase.from('books').update(bookPayload(input)).eq('id', id).select('id').single());
  await syncRelations(id, input);
  return id;
}

/** Copies a title as an unpublished draft, sharing the same storage objects. */
export async function duplicateAdminBook(id: string): Promise<string> {
  const source = await getAdminBook(id);
  return createAdminBook({
    title: `${source.title} (copy)`,
    slug: uniqueSlug(source.title),
    description: source.description,
    author_id: source.author_id,
    genre: source.genre ?? '',
    tag: source.tag ?? '',
    tags: source.tags,
    cover_color: source.cover_color ?? '',
    cover_color_dark: source.cover_color_dark ?? '',
    cover_path: source.cover_path,
    pdf_path: source.pdf_path,
    file_size_bytes: source.file_size_bytes,
    read_time_minutes: source.read_time_minutes,
    price_cents: source.price_cents,
    currency: source.currency,
    format: source.format,
    is_premium: source.is_premium,
    is_published: false,
    category_ids: source.category_ids,
    collection_ids: source.collection_ids,
  });
}

export type BulkResult = { updated: number; skipped: number };

export async function bulkUpdateBooks(
  ids: string[],
  changes: { is_published?: boolean; is_premium?: boolean },
): Promise<BulkResult> {
  const data = unwrap(
    await supabase.rpc('admin_bulk_update_books', {
      p_ids: ids,
      p_is_published: changes.is_published ?? null,
      p_is_premium: changes.is_premium ?? null,
    }),
  ) as { updated?: number; skipped?: number };

  return { updated: num(data.updated), skipped: num(data.skipped) };
}

/** Removes the rows, then the storage objects they owned. */
export async function deleteAdminBooks(ids: string[]): Promise<number> {
  const data = unwrap(await supabase.rpc('admin_delete_books', { p_ids: ids })) as {
    deleted?: number;
    covers?: string[];
    pdfs?: string[];
  };

  const covers = (data.covers ?? []).map(path => path.replace(/^covers\//, ''));
  const pdfs = (data.pdfs ?? []).map(path => path.replace(/^pdfs\//, ''));

  await Promise.all([
    covers.length ? supabase.storage.from('covers').remove(covers) : null,
    pdfs.length ? supabase.storage.from('pdfs').remove(pdfs) : null,
  ]);

  return num(data.deleted);
}

export async function isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  const trimmed = slug.trim();
  if (!trimmed) {
    return false;
  }

  let builder = supabase.from('books').select('id').eq('slug', trimmed).limit(1);
  if (excludeId) {
    builder = builder.neq('id', excludeId);
  }

  const result = await builder;
  assertOk(result);
  return (result.data ?? []).length === 0;
}
