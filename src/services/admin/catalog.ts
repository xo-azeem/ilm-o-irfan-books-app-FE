import { assertOk, supabase, unwrap } from './client';
import {
  uniqueSlug,
  type AdminAuthor,
  type AdminCategory,
  type AdminCollection,
  type AdminCollectionKind,
} from './types';

// ---------------------------------------------------------------- authors

export async function listAdminAuthors(query = ''): Promise<AdminAuthor[]> {
  let builder = supabase
    .from('admin_author_rows')
    .select('id,slug,name,bio,avatar_path,created_at,updated_at,book_count,published_count')
    .order('name');

  const trimmed = query.trim();
  if (trimmed) {
    builder = builder.ilike('name', `%${trimmed}%`);
  }

  return unwrap(await builder) as AdminAuthor[];
}

export type AdminAuthorInput = {
  id?: string;
  name: string;
  slug: string;
  bio: string;
  avatar_path: string | null;
};

export async function upsertAdminAuthor(input: AdminAuthorInput): Promise<string> {
  const payload = {
    name: input.name.trim(),
    slug: input.slug.trim() || uniqueSlug(input.name),
    bio: input.bio.trim() || null,
    avatar_path: input.avatar_path,
  };

  if (input.id) {
    unwrap(await supabase.from('authors').update(payload).eq('id', input.id).select('id').single());
    return input.id;
  }

  return unwrap(await supabase.from('authors').insert(payload).select('id').single()).id;
}

export async function deleteAdminAuthor(id: string) {
  assertOk(await supabase.from('authors').delete().eq('id', id));
}

// ------------------------------------------------------------- categories

export async function listAdminCategories(): Promise<AdminCategory[]> {
  return unwrap(
    await supabase
      .from('admin_category_rows')
      .select('id,slug,label,icon_key,accent,accent_dark,sort_order,created_at,book_count')
      .order('sort_order')
      .order('label'),
  ) as AdminCategory[];
}

export type AdminCategoryInput = {
  id?: string;
  label: string;
  slug: string;
  icon_key: string;
  accent: string;
  accent_dark: string;
  sort_order: number;
};

export async function upsertAdminCategory(input: AdminCategoryInput): Promise<string> {
  const payload = {
    label: input.label.trim(),
    slug: input.slug.trim() || uniqueSlug(input.label),
    icon_key: input.icon_key.trim() || 'book-marked',
    accent: input.accent.trim() || null,
    accent_dark: input.accent_dark.trim() || input.accent.trim() || null,
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
  assertOk(await supabase.from('categories').delete().eq('id', id));
}

// ------------------------------------------------------------ collections

export async function listAdminCollections(): Promise<AdminCollection[]> {
  return unwrap(
    await supabase
      .from('admin_collection_rows')
      .select(
        'id,slug,title,subtitle,accent,kind,sort_order,is_published,created_at,updated_at,book_count',
      )
      .order('sort_order')
      .order('title'),
  ) as AdminCollection[];
}

/** Ordered membership for the collection editor. */
export async function getCollectionBookIds(collectionId: string): Promise<string[]> {
  const rows = unwrap(
    await supabase
      .from('collection_books')
      .select('book_id,sort_order')
      .eq('collection_id', collectionId)
      .order('sort_order'),
  ) as Array<{ book_id: string }>;

  return rows.map(row => row.book_id);
}

export type AdminCollectionInput = {
  id?: string;
  title: string;
  slug: string;
  subtitle: string;
  accent: string;
  kind: AdminCollectionKind;
  sort_order: number;
  is_published: boolean;
  book_ids: string[];
};

export async function upsertAdminCollection(input: AdminCollectionInput): Promise<string> {
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

  assertOk(
    await supabase.rpc('admin_set_collection_books', {
      p_collection_id: id,
      p_book_ids: input.book_ids,
    }),
  );

  return id;
}

/**
 * Flips a collection's visibility without touching its membership.
 *
 * `upsertAdminCollection` rewrites the whole row plus its book list, which is
 * far too much work — and too much risk — for a switch on the Catalog tab.
 */
export async function setCollectionPublished(id: string, isPublished: boolean) {
  unwrap(
    await supabase
      .from('collections')
      .update({ is_published: isPublished })
      .eq('id', id)
      .select('id')
      .single(),
  );
}

export async function deleteAdminCollection(id: string) {
  assertOk(await supabase.from('collections').delete().eq('id', id));
}

export async function reorderCatalog(table: 'categories' | 'collections', ids: string[]) {
  assertOk(await supabase.rpc('admin_reorder', { p_table: table, p_ids: ids }));
}
