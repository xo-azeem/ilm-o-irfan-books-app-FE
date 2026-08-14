import {
  BookMarked,
  Globe,
  Landmark,
  ScrollText,
  Sparkles,
  Scale,
  type LucideIcon,
} from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import { palette } from '@/theme/palette';
import {
  authorName,
  mapCatalogBook,
  stripStoragePrefix,
  type CatalogListRow,
} from '@/services/mappers';

export type CatalogBook = ReturnType<typeof mapCatalogBook>;

export type CatalogCategory = {
  id: string;
  label: string;
  count: string;
  icon: LucideIcon;
  accent: string;
  accentDark: string;
};

export type CatalogCollection = {
  id: string;
  title: string;
  subtitle: string;
  bookCount: number;
  accent: string;
  kind: string;
};

const iconByKey: Record<string, LucideIcon> = {
  'book-marked': BookMarked,
  book: BookMarked,
  sparkles: Sparkles,
  landmark: Landmark,
  scale: Scale,
  'scroll-text': ScrollText,
  globe: Globe,
};

const LIST_FIELDS =
  'id,title,author_name,cover_path,cover_color,cover_color_dark,rating,tag,genre,read_time_minutes,price_cents,currency,format,is_premium';

function coverUrl(path: string | null): string | undefined {
  if (!path) {
    return undefined;
  }
  return supabase.storage
    .from('covers')
    .getPublicUrl(stripStoragePrefix(path, 'covers')).data.publicUrl;
}

function unwrap<T>(result: {
  data: T | null;
  error: { message: string; code?: string } | null;
}): T {
  if (result.error) {
    throw Object.assign(new Error(result.error.message), {
      status: Number(result.error.code) || undefined,
    });
  }
  if (result.data == null) {
    throw Object.assign(new Error('Expected data was not returned.'), { status: 404 });
  }
  return result.data;
}

function toCatalogBook(row: CatalogListRow): CatalogBook {
  return mapCatalogBook(row, coverUrl(row.cover_path));
}

export { mapCatalogBook };

export async function getHomeCatalog() {
  const [hero, trending, arrivals, collections] = await Promise.all([
    supabase
      .from('books')
      .select(
        'id,title,description,cover_path,cover_color,cover_color_dark,rating,tag,genre,read_time_minutes,price_cents,currency,format,is_premium,authors!inner(name)',
      )
      .eq('is_published', true)
      .order('rating', { ascending: false })
      .limit(5),
    supabase
      .from('book_list_items')
      .select(LIST_FIELDS)
      .order('rating', { ascending: false })
      .limit(10),
    supabase
      .from('book_list_items')
      .select(LIST_FIELDS)
      .order('published_at', { ascending: false })
      .limit(10),
    supabase
      .from('collection_summaries')
      .select('id,title,subtitle,accent,kind,book_count,sort_order')
      .order('sort_order')
      .limit(10),
  ]);

  return {
    hero: unwrap(hero).map(row =>
      toCatalogBook({
        ...row,
        author_name: authorName(row.authors as { name: string } | { name: string }[]),
      }),
    ),
    trending: unwrap(trending).map(toCatalogBook),
    arrivals: unwrap(arrivals).map(toCatalogBook),
    collections: unwrap(collections).map(row => ({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle ?? '',
      bookCount: row.book_count,
      accent: row.accent ?? palette.green,
      kind: row.kind,
    } satisfies CatalogCollection)),
  };
}

export async function searchCatalog(query: string, signal?: AbortSignal) {
  let queryBuilder = supabase
    .from('books')
    .select(
      'id,title,description,cover_path,cover_color,cover_color_dark,rating,tag,genre,read_time_minutes,price_cents,currency,format,is_premium,authors!inner(name)',
    )
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(50);

  if (signal) {
    queryBuilder = queryBuilder.abortSignal(signal);
  }

  const result = query.trim()
    ? await queryBuilder.textSearch('search_vector', query.trim(), {
        type: 'plain',
        config: 'english',
      })
    : await queryBuilder;

  return unwrap(result).map(row =>
    toCatalogBook({
      ...row,
      author_name: authorName(row.authors as { name: string } | { name: string }[]),
    }),
  );
}

export async function getCategories() {
  const result = await supabase
    .from('category_with_counts')
    .select('id,label,icon_key,accent,accent_dark,book_count,sort_order')
    .order('sort_order')
    .order('label');

  return unwrap(result).map(
    row =>
      ({
        id: row.id,
        label: row.label,
        count: String(row.book_count),
        icon: iconByKey[row.icon_key] ?? BookMarked,
        accent: row.accent ?? palette.green,
        accentDark: row.accent_dark ?? palette.yellowGreen,
      }) satisfies CatalogCategory,
  );
}

export async function getBook(id: string): Promise<CatalogBook | null> {
  const result = await supabase
    .from('books')
    .select(
      'id,title,description,cover_path,cover_color,cover_color_dark,rating,tag,genre,read_time_minutes,price_cents,currency,format,is_premium,authors!inner(name)',
    )
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle();

  if (result.error) {
    throw Object.assign(new Error(result.error.message), { status: 500 });
  }
  if (!result.data) {
    return null;
  }

  return toCatalogBook({
    ...result.data,
    author_name: authorName(result.data.authors as { name: string } | { name: string }[]),
  });
}
