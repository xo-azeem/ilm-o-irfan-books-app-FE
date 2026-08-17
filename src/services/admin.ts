import ReactNativeBlobUtil from 'react-native-blob-util';

import { supabase } from '@/lib/supabase';
import { stripStoragePrefix } from '@/services/mappers';
import {
  ADMIN_PAGE_SIZE,
  uniqueSlug,
  type AdminAuthor,
  type AdminBookDetail,
  type AdminBookListRow,
  type AdminCategory,
  type AdminCollection,
  type AdminDashboardStats,
  type AdminUserRow,
} from '@/services/adminTypes';

export * from '@/services/adminTypes';

function unwrap<T>(result: {
  data: T;
  error: { message: string } | null;
}): NonNullable<T> {
  if (result.error) {
    throw new Error(result.error.message);
  }
  if (result.data == null) {
    throw new Error('Expected data was not returned.');
  }
  return result.data as NonNullable<T>;
}

function asStats(value: unknown): AdminDashboardStats {
  const row = (value ?? {}) as Record<string, unknown>;
  const num = (key: string) => Number(row[key] ?? 0);
  return {
    user_count: num('user_count'),
    admin_count: num('admin_count'),
    subscriber_count: num('subscriber_count'),
    guest_signed_in_count: num('guest_signed_in_count'),
    book_published_count: num('book_published_count'),
    book_draft_count: num('book_draft_count'),
    author_count: num('author_count'),
    download_completed_count: num('download_completed_count'),
  };
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  return asStats(unwrap(await supabase.rpc('admin_dashboard_stats')));
}

export async function listAdminUsers(query: string, page = 0): Promise<AdminUserRow[]> {
  const from = page * ADMIN_PAGE_SIZE;
  const to = from + ADMIN_PAGE_SIZE - 1;
  const trimmed = query.trim().replace(/[,()]/g, ' ');

  let builder = supabase
    .from('admin_user_directory')
    .select(
      'id,full_name,email,role,created_at,entitlement_status,expires_at,store,plan_name',
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (trimmed) {
    builder = builder.or(`email.ilike.%${trimmed}%,full_name.ilike.%${trimmed}%`);
  }

  return unwrap(await builder) as AdminUserRow[];
}

export async function getAdminUser(id: string): Promise<AdminUserRow | null> {
  const result = await supabase
    .from('admin_user_directory')
    .select(
      'id,full_name,email,role,created_at,entitlement_status,expires_at,store,plan_name',
    )
    .eq('id', id)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }
  return (result.data as AdminUserRow | null) ?? null;
}

export async function setAdminUserRole(userId: string, role: 'user' | 'admin') {
  const result = await supabase.rpc('admin_set_user_role', {
    target_id: userId,
    new_role: role,
  });
  if (result.error) {
    throw new Error(result.error.message);
  }
}

export async function listAdminBooks(query: string, page = 0): Promise<AdminBookListRow[]> {
  const from = page * ADMIN_PAGE_SIZE;
  const to = from + ADMIN_PAGE_SIZE - 1;
  const trimmed = query.trim();

  let builder = supabase
    .from('books')
    .select('id,title,slug,is_published,is_premium,pdf_path,cover_path,updated_at,authors!inner(name)')
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (trimmed) {
    builder = builder.ilike('title', `%${trimmed}%`);
  }

  const rows = unwrap(await builder) as Array<{
    id: string;
    title: string;
    slug: string;
    is_published: boolean;
    is_premium: boolean;
    pdf_path: string | null;
    cover_path: string | null;
    updated_at: string;
    authors: { name: string } | { name: string }[];
  }>;

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    is_published: row.is_published,
    is_premium: row.is_premium,
    pdf_path: row.pdf_path,
    cover_path: row.cover_path,
    updated_at: row.updated_at,
    author_name: Array.isArray(row.authors) ? row.authors[0]?.name ?? 'Unknown' : row.authors.name,
  }));
}

export async function getAdminBook(id: string): Promise<AdminBookDetail> {
  const [book, categories, collections] = await Promise.all([
    supabase.from('books').select('*').eq('id', id).single(),
    supabase.from('book_categories').select('category_id').eq('book_id', id),
    supabase.from('collection_books').select('collection_id').eq('book_id', id),
  ]);

  const row = unwrap(book);
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    author_id: row.author_id,
    genre: row.genre,
    rating: Number(row.rating),
    rating_count: row.rating_count,
    price_cents: row.price_cents,
    currency: row.currency,
    format: row.format,
    cover_path: row.cover_path,
    cover_color: row.cover_color,
    cover_color_dark: row.cover_color_dark,
    pdf_path: row.pdf_path,
    file_size_bytes: row.file_size_bytes,
    read_time_minutes: row.read_time_minutes,
    tag: row.tag,
    tags: row.tags ?? [],
    is_premium: row.is_premium,
    is_published: row.is_published,
    published_at: row.published_at,
    updated_at: row.updated_at,
    category_ids: unwrap(categories).map(item => item.category_id),
    collection_ids: unwrap(collections).map(item => item.collection_id),
  };
}

export type AdminBookInput = {
  title: string;
  slug: string;
  description: string;
  author_id: string;
  genre: string;
  tag: string;
  cover_color: string;
  cover_color_dark: string;
  cover_path: string | null;
  pdf_path: string | null;
  file_size_bytes: number | null;
  read_time_minutes: number | null;
  price_cents: number;
  currency: string;
  format: string;
  is_premium: boolean;
  is_published: boolean;
  category_ids: string[];
  collection_ids: string[];
};

async function syncBookJoins(bookId: string, categoryIds: string[], collectionIds: string[]) {
  const [existingCats, existingCols] = await Promise.all([
    supabase.from('book_categories').delete().eq('book_id', bookId),
    supabase.from('collection_books').delete().eq('book_id', bookId),
  ]);
  if (existingCats.error) throw new Error(existingCats.error.message);
  if (existingCols.error) throw new Error(existingCols.error.message);

  if (categoryIds.length) {
    const inserted = await supabase.from('book_categories').insert(
      categoryIds.map(category_id => ({ book_id: bookId, category_id })),
    );
    if (inserted.error) throw new Error(inserted.error.message);
  }

  if (collectionIds.length) {
    const inserted = await supabase.from('collection_books').insert(
      collectionIds.map((collection_id, index) => ({
        book_id: bookId,
        collection_id,
        sort_order: index,
      })),
    );
    if (inserted.error) throw new Error(inserted.error.message);
  }
}

function bookPayload(input: AdminBookInput) {
  return {
    title: input.title.trim(),
    slug: input.slug.trim() || uniqueSlug(input.title),
    description: input.description.trim(),
    author_id: input.author_id,
    genre: input.genre.trim() || null,
    tag: input.tag.trim() || null,
    cover_color: input.cover_color.trim() || null,
    cover_color_dark: input.cover_color_dark.trim() || null,
    cover_path: input.cover_path,
    pdf_path: input.pdf_path,
    file_size_bytes: input.file_size_bytes,
    read_time_minutes: input.read_time_minutes,
    price_cents: input.price_cents,
    currency: input.currency,
    format: input.format,
    is_premium: input.is_premium,
    is_published: input.is_published,
    published_at: input.is_published ? new Date().toISOString() : null,
  };
}

export async function createAdminBook(input: AdminBookInput): Promise<string> {
  if (input.is_published && !input.pdf_path) {
    throw new Error('Upload a PDF before publishing.');
  }

  const inserted = unwrap(
    await supabase.from('books').insert(bookPayload(input)).select('id').single(),
  );
  await syncBookJoins(inserted.id, input.category_ids, input.collection_ids);
  return inserted.id;
}

export async function updateAdminBook(id: string, input: AdminBookInput) {
  if (input.is_published && !input.pdf_path) {
    throw new Error('Upload a PDF before publishing.');
  }

  unwrap(
    await supabase.from('books').update(bookPayload(input)).eq('id', id).select('id').single(),
  );
  await syncBookJoins(id, input.category_ids, input.collection_ids);
}

export async function deleteAdminBook(id: string) {
  const result = await supabase.from('books').delete().eq('id', id);
  if (result.error) {
    throw new Error(result.error.message);
  }
}

export async function listAdminAuthors(): Promise<AdminAuthor[]> {
  return unwrap(
    await supabase
      .from('authors')
      .select('id,slug,name,bio')
      .order('name'),
  ) as AdminAuthor[];
}

export async function upsertAdminAuthor(input: {
  id?: string;
  name: string;
  slug: string;
  bio: string;
}) {
  const payload = {
    name: input.name.trim(),
    slug: input.slug.trim() || uniqueSlug(input.name),
    bio: input.bio.trim() || null,
  };

  if (input.id) {
    unwrap(
      await supabase.from('authors').update(payload).eq('id', input.id).select('id').single(),
    );
    return input.id;
  }

  return unwrap(await supabase.from('authors').insert(payload).select('id').single()).id;
}

export async function deleteAdminAuthor(id: string) {
  const result = await supabase.from('authors').delete().eq('id', id);
  if (result.error) {
    throw new Error(
      result.error.message.includes('foreign key') ||
        result.error.message.includes('23503')
        ? 'This author still has books. Reassign or delete those books first.'
        : result.error.message,
    );
  }
}

export async function listAdminCategories(): Promise<AdminCategory[]> {
  return unwrap(
    await supabase
      .from('categories')
      .select('id,slug,label,icon_key,accent,accent_dark,sort_order')
      .order('sort_order')
      .order('label'),
  ) as AdminCategory[];
}

export async function upsertAdminCategory(input: {
  id?: string;
  label: string;
  slug: string;
  icon_key: string;
  accent: string;
  accent_dark: string;
  sort_order: number;
}) {
  const payload = {
    label: input.label.trim(),
    slug: input.slug.trim() || uniqueSlug(input.label),
    icon_key: input.icon_key.trim() || 'book-marked',
    accent: input.accent.trim() || null,
    accent_dark: input.accent_dark.trim() || null,
    sort_order: input.sort_order,
  };

  if (input.id) {
    unwrap(
      await supabase.from('categories').update(payload).eq('id', input.id).select('id').single(),
    );
    return input.id;
  }

  return unwrap(await supabase.from('categories').insert(payload).select('id').single()).id;
}

export async function deleteAdminCategory(id: string) {
  const result = await supabase.from('categories').delete().eq('id', id);
  if (result.error) {
    throw new Error(result.error.message);
  }
}

export async function listAdminCollections(): Promise<AdminCollection[]> {
  const [collections, memberships] = await Promise.all([
    supabase
      .from('collections')
      .select('id,slug,title,subtitle,accent,kind,sort_order,is_published')
      .order('sort_order'),
    supabase.from('collection_books').select('collection_id,book_id,sort_order').order('sort_order'),
  ]);

  const booksByCollection = new Map<string, string[]>();
  for (const row of unwrap(memberships)) {
    const list = booksByCollection.get(row.collection_id) ?? [];
    list.push(row.book_id);
    booksByCollection.set(row.collection_id, list);
  }

  return unwrap(collections).map(row => ({
    ...row,
    kind: row.kind as AdminCollection['kind'],
    book_ids: booksByCollection.get(row.id) ?? [],
  }));
}

export async function upsertAdminCollection(input: {
  id?: string;
  title: string;
  slug: string;
  subtitle: string;
  accent: string;
  kind: AdminCollection['kind'];
  sort_order: number;
  is_published: boolean;
  book_ids: string[];
}) {
  const payload = {
    title: input.title.trim(),
    slug: input.slug.trim() || uniqueSlug(input.title),
    subtitle: input.subtitle.trim() || null,
    accent: input.accent.trim() || null,
    kind: input.kind,
    sort_order: input.sort_order,
    is_published: input.is_published,
  };

  const id = input.id
    ? unwrap(
        await supabase.from('collections').update(payload).eq('id', input.id).select('id').single(),
      ).id
    : unwrap(await supabase.from('collections').insert(payload).select('id').single()).id;

  const cleared = await supabase.from('collection_books').delete().eq('collection_id', id);
  if (cleared.error) throw new Error(cleared.error.message);

  if (input.book_ids.length) {
    const inserted = await supabase.from('collection_books').insert(
      input.book_ids.map((book_id, sort_order) => ({
        collection_id: id,
        book_id,
        sort_order,
      })),
    );
    if (inserted.error) throw new Error(inserted.error.message);
  }

  return id;
}

export async function deleteAdminCollection(id: string) {
  const result = await supabase.from('collections').delete().eq('id', id);
  if (result.error) {
    throw new Error(result.error.message);
  }
}

function decodeBase64(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const cleaned = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const output = new Uint8Array(Math.floor((cleaned.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let index = 0;

  for (let i = 0; i < cleaned.length; i += 1) {
    const value = chars.indexOf(cleaned[i]);
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output[index] = (buffer >> bits) & 0xff;
      index += 1;
    }
  }

  return output.subarray(0, index);
}

async function uploadBytes(
  bucket: 'covers' | 'pdfs',
  objectPath: string,
  fileUri: string,
  contentType: string,
) {
  const path = fileUri.replace('file://', '');
  const base64 = await ReactNativeBlobUtil.fs.readFile(path, 'base64');
  const bytes = decodeBase64(base64);
  const result = await supabase.storage.from(bucket).upload(objectPath, bytes, {
    contentType,
    upsert: true,
  });
  if (result.error) {
    throw new Error(result.error.message);
  }
  return `${bucket}/${objectPath}`;
}

export async function uploadAdminCover(localUri: string, slug: string, mime = 'image/jpeg') {
  const extension = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const objectPath = `${slug}-${Date.now()}.${extension}`;
  return uploadBytes('covers', objectPath, localUri, mime);
}

export async function uploadAdminPdf(localUri: string, slug: string, sizeBytes?: number) {
  const objectPath = `${slug}-${Date.now()}.pdf`;
  const path = await uploadBytes('pdfs', objectPath, localUri, 'application/pdf');
  return { path, sizeBytes: sizeBytes ?? null };
}

export function adminCoverUrl(path: string | null): string | undefined {
  if (!path) return undefined;
  return supabase.storage.from('covers').getPublicUrl(stripStoragePrefix(path, 'covers')).data
    .publicUrl;
}
