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
import { ENDPOINTS } from '@/services/api/endpoints';
import {
  ApiError,
  isEndpointMissing,
  requestData,
  requestList,
  requestPage,
  withEndpoint,
  type Page,
} from '@/services/api/client';
import type {
  BookAuthor,
  BookDetailRow,
  BookListItem,
  CategoryRow,
  CollectionRow,
  HomeFeedPayload,
  PlanRow,
} from '@/services/api/types';
import { palette } from '@/theme/palette';
import {
  authorName,
  mapCatalogBook,
  stripStoragePrefix,
  type CatalogListRow,
} from '@/services/mappers';

/**
 * The public catalog.
 *
 * Every read prefers the backend's Edge Function endpoints (`home-feed`,
 * `books-list`, `book-detail`, `books-search`, `categories-list`,
 * `plans-list`), and falls back to the equivalent PostgREST query when the
 * function is not deployed on the project the app is pointed at — see
 * `withEndpoint`. The two paths return the same shape, so nothing above this
 * module can tell which one answered.
 */

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

/**
 * Columns of `book_list_items` the fallback reads.
 *
 * Deliberately not `*`: the view gained a `search_vector` column, and selecting
 * it would fail on a project whose migrations have not been applied yet.
 */
const LIST_FIELDS =
  'id,title,author_name,cover_path,cover_color,cover_color_dark,rating,tag,genre,read_time_minutes,price_cents,currency,format,is_premium';

/** The `books` columns the fallback needs when it wants a description too. */
const DETAIL_FIELDS =
  'id,title,description,cover_path,cover_color,cover_color_dark,rating,tag,genre,read_time_minutes,price_cents,currency,format,is_premium,authors(name)';

/**
 * The pool the home rails fall back to when `home-feed` sends no `shelves`.
 *
 * A deployment that predates the curated shelves caps its book list at 12,
 * which is fewer than the hero, the trending rail and the mood-filtered
 * arrivals render between them, so that path takes a second paged read. The
 * current backend answers with all three shelves already ordered, and skips it.
 */
const HOME_POOL_SIZE = 24;
const SEARCH_PAGE_SIZE = 50;

export function publicCoverUrl(path: string | null): string | undefined {
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
  return mapCatalogBook(row, publicCoverUrl(row.cover_path));
}

function fromListItem(row: BookListItem): CatalogBook {
  return toCatalogBook(row);
}

/** A `books` row selected with its author as a nested relation, not a column. */
type JoinedBookRow = Omit<CatalogListRow, 'author_name'> & { authors?: unknown };

function fromJoinedRow(row: JoinedBookRow): CatalogBook {
  return toCatalogBook({
    ...row,
    author_name: authorName(row.authors as { name: string } | { name: string }[] | null),
  });
}

function toCollection(row: CollectionRow): CatalogCollection {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? '',
    bookCount: row.book_count,
    accent: row.accent ?? palette.green,
    kind: row.kind,
  };
}

function toCategory(row: CategoryRow): CatalogCategory {
  return {
    id: row.id,
    label: row.label,
    count: String(row.book_count ?? 0),
    icon: iconByKey[row.icon_key ?? ''] ?? BookMarked,
    accent: row.accent ?? palette.green,
    accentDark: row.accent_dark ?? palette.yellowGreen,
  };
}

/** Highest rating first; unrated books sort last rather than as zero. */
function byRating(a: CatalogBook, b: CatalogBook): number {
  return (b.rating ?? -1) - (a.rating ?? -1);
}

function dedupeById(rows: BookListItem[]): BookListItem[] {
  const seen = new Map<string, BookListItem>();
  for (const row of rows) {
    if (!seen.has(row.id)) {
      seen.set(row.id, row);
    }
  }
  return [...seen.values()];
}

export { mapCatalogBook };

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

/**
 * The rails, from whichever shape `home-feed` answered with.
 *
 * When the feed carries `shelves`, those are the editor's own hero, trending
 * and new-arrivals lists — already ordered, and already backfilled server-side
 * with the newest titles for any shelf that has no membership yet. Re-sorting
 * them here would throw that curation away, so they are passed through as-is.
 *
 * Without `shelves` the rails are derived from the book pool exactly as before:
 * newest first for arrivals, highest rated for hero and trending.
 */
function railsFrom(feed: HomeFeedPayload | null, pool: BookListItem[]) {
  const shelves = feed?.shelves;

  if (shelves) {
    return {
      hero: (shelves.hero ?? []).slice(0, 5).map(fromListItem),
      trending: (shelves.trending ?? []).slice(0, 10).map(fromListItem),
      arrivals: (shelves.newArrivals ?? []).slice(0, 10).map(fromListItem),
    };
  }

  // `books-list` is already ordered newest-first, and `home-feed` sends the
  // same rows; merging keeps whatever the feed adds without duplicating it.
  const arrivals = dedupeById([...pool, ...(feed?.books ?? [])]).map(fromListItem);
  const trending = [...arrivals].sort(byRating);

  return {
    hero: trending.slice(0, 5),
    trending: trending.slice(0, 10),
    arrivals: arrivals.slice(0, 10),
  };
}

async function homeFromEndpoints(signal?: AbortSignal) {
  const feed = await requestData<HomeFeedPayload>(ENDPOINTS.homeFeed, { signal });

  // One round trip is enough once the feed carries its shelves. The extra
  // `books-list` page is only fetched on a deployment that does not, and that
  // read is what the rails are then derived from.
  const pool = feed?.shelves
    ? []
    : (await requestPage<BookListItem>(ENDPOINTS.booksList, { pageSize: HOME_POOL_SIZE, signal }))
        .data;

  return {
    ...railsFrom(feed ?? null, pool),
    collections: (feed?.collections ?? []).map(toCollection),
    categories: (feed?.categories ?? []).map(toCategory),
    featuredCollectionId: feed?.featuredCollectionId ?? null,
  };
}

async function homeFromTables() {
  const [hero, trending, arrivals, collections, categories] = await Promise.all([
    supabase
      .from('books')
      .select(DETAIL_FIELDS)
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
    supabase
      .from('category_with_counts')
      .select('id,label,icon_key,accent,accent_dark,book_count,sort_order')
      .order('sort_order')
      .limit(10),
  ]);

  return {
    // Only this rail carries real blurbs, so the hero keeps the `books` read.
    hero: unwrap(hero).map(fromJoinedRow),
    trending: unwrap(trending).map(row => toCatalogBook(row as CatalogListRow)),
    arrivals: unwrap(arrivals).map(row => toCatalogBook(row as CatalogListRow)),
    collections: unwrap(collections).map(row => toCollection(row as CollectionRow)),
    categories: unwrap(categories).map(row => toCategory(row as CategoryRow)),
    // The tables path has no `app_settings` grant for `anon`, so the feature
    // slot stays unset rather than failing the whole read for it.
    featuredCollectionId: null as string | null,
  };
}

export async function getHomeCatalog(signal?: AbortSignal) {
  return withEndpoint(
    ENDPOINTS.homeFeed,
    () => homeFromEndpoints(signal),
    () => homeFromTables(),
  );
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

/** One page of the published catalog, newest first. */
export async function listBooks(
  page = 1,
  pageSize = 20,
  signal?: AbortSignal,
): Promise<Page<CatalogBook>> {
  return withEndpoint(
    ENDPOINTS.booksList,
    async () => {
      const result = await requestPage<BookListItem>(ENDPOINTS.booksList, {
        page,
        pageSize,
        signal,
      });
      return { ...result, data: result.data.map(fromListItem) };
    },
    async () => {
      const offset = (page - 1) * pageSize;
      const result = await supabase
        .from('book_list_items')
        .select(LIST_FIELDS, { count: 'exact' })
        .order('published_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      const rows = unwrap(result).map(row => toCatalogBook(row as CatalogListRow));
      const totalCount = result.count ?? null;

      return {
        data: rows,
        page,
        pageSize,
        totalCount,
        totalPages: totalCount == null ? null : Math.ceil(totalCount / pageSize),
        hasNextPage:
          totalCount == null ? rows.length === pageSize : page * pageSize < totalCount,
        hasPreviousPage: page > 1,
      };
    },
  );
}

/**
 * Full-text search across the catalog.
 *
 * An empty query is a browse, not a search: `books-search` answers with an
 * empty page in that case, so the newest titles come from the catalog list
 * instead — which is what the Discover tab shows before the reader types.
 */
export async function searchCatalog(
  query: string,
  signal?: AbortSignal,
): Promise<CatalogBook[]> {
  const term = query.trim();

  if (!term) {
    return (await listBooks(1, SEARCH_PAGE_SIZE, signal)).data;
  }

  return withEndpoint(
    ENDPOINTS.booksSearch,
    async () => {
      const rows = await requestList<BookListItem>(ENDPOINTS.booksSearch, {
        query: { q: term },
        pageSize: SEARCH_PAGE_SIZE,
        signal,
      });
      return rows.map(fromListItem);
    },
    async () => {
      // The fallback searches `books`, whose `search_vector` predates the view
      // column the endpoint uses, so it works on an un-migrated project too.
      let builder = supabase
        .from('books')
        .select(DETAIL_FIELDS)
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(SEARCH_PAGE_SIZE);

      if (signal) {
        builder = builder.abortSignal(signal);
      }

      const result = await builder.textSearch('search_vector', term, {
        type: 'plain',
        config: 'english',
      });

      return unwrap(result).map(fromJoinedRow);
    },
  );
}

export async function getCategories(signal?: AbortSignal): Promise<CatalogCategory[]> {
  return withEndpoint(
    ENDPOINTS.categoriesList,
    async () => {
      const rows = await requestList<CategoryRow>(ENDPOINTS.categoriesList, {
        pageSize: 100,
        signal,
      });
      return rows.map(toCategory);
    },
    async () => {
      const result = await supabase
        .from('category_with_counts')
        .select('id,label,icon_key,accent,accent_dark,book_count,sort_order')
        .order('sort_order')
        .order('label');

      return unwrap(result).map(row => toCategory(row as CategoryRow));
    },
  );
}

/** Active premium plans, for the subscription and paywall screens. */
export async function getPlans(signal?: AbortSignal): Promise<PlanRow[]> {
  return withEndpoint(
    ENDPOINTS.plansList,
    async () => (await requestData<PlanRow[]>(ENDPOINTS.plansList, { signal })) ?? [],
    async () => {
      const result = await supabase
        .from('plans')
        .select('id,code,name,price_cents,currency,interval,features,is_active,sort_order')
        .eq('is_active', true)
        .order('sort_order');

      return unwrap(result) as PlanRow[];
    },
  );
}

export async function getBook(
  id: string,
  signal?: AbortSignal,
): Promise<CatalogBook | null> {
  return withEndpoint(
    ENDPOINTS.bookDetail,
    async () => {
      try {
        const row = await requestData<BookDetailRow>(ENDPOINTS.bookDetail, {
          query: { id },
          signal,
        });
        return row ? fromDetail(row) : null;
      } catch (error) {
        // A missing or unpublished book is an empty state, not a failure — but
        // an undeployed function is a 404 too, so that one has to pass through
        // to the fallback rather than being swallowed here as "no such book".
        if (error instanceof ApiError && error.status === 404 && !isEndpointMissing(error)) {
          return null;
        }
        throw error;
      }
    },
    async () => {
      const result = await supabase
        .from('books')
        .select(DETAIL_FIELDS)
        .eq('id', id)
        .eq('is_published', true)
        .maybeSingle();

      if (result.error) {
        throw Object.assign(new Error(result.error.message), { status: 500 });
      }
      return result.data ? fromJoinedRow(result.data as JoinedBookRow) : null;
    },
  );
}

function fromDetail(row: BookDetailRow): CatalogBook {
  return toCatalogBook({
    ...row,
    author_name: authorName(row.author as BookAuthor | BookAuthor[] | null),
  });
}
