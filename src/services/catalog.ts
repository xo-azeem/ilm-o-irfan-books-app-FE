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
  request,
  requestData,
  requestList,
  requestPage,
  withEndpoint,
  type Page,
} from '@/services/api/client';
import type {
  BookAuthor,
  BookDetailRow,
  BookLanguage,
  BookLengthBucket,
  BookListItem,
  CarouselPayload,
  CarouselSlideRow,
  CarouselSource,
  CategoryRow,
  CollectionInfoRow,
  CollectionRow,
  HomeFeedPayload,
  PlanRow,
  TrendingWeeklyPayload,
} from '@/services/api/types';
import { palette } from '@/theme/palette';
import {
  asNumber,
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
 * The pool the new-arrivals rail falls back to when the feed is short.
 *
 * A deployment that predates the curated shelves caps its book list at 12,
 * which is fewer than the rails render between them, so that path takes a
 * second paged read. The current backend sends the carousel, the weekly draw
 * and a long enough book list in one answer, and skips it.
 */
const HOME_POOL_SIZE = 24;

/**
 * Discover's page size.
 *
 * Two screenfuls of rows, which is what `onEndReachedThreshold` needs in front
 * of the reader for the next page to land before they scroll to it.
 */
const BROWSE_PAGE_SIZE = 20;

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
    throw Object.assign(new Error('Expected data was not returned.'), {
      status: 404,
    });
  }
  return result.data;
}

/**
 * A cover to load, from any API payload.
 *
 * The backend computes `coverUrl` on every book card and every nested `book`,
 * so that is the only thing drawn from. `cover_path` is the raw Storage key
 * and is never turned into a URL here — the bucket layout is the backend's to
 * know, and an app that guessed at it would break the first time it changed.
 *
 * `undefined` is a real answer: a book with no cover file draws its
 * `cover_color` placeholder, which every cover component already does.
 */
export function coverUrlFor(row: {
  coverUrl?: string | null;
}): string | undefined {
  return row.coverUrl ?? undefined;
}

function toCatalogBook(row: CatalogListRow): CatalogBook {
  return mapCatalogBook(row, coverUrlFor(row));
}

function fromListItem(row: BookListItem): CatalogBook {
  return toCatalogBook(row);
}

/** A `books` row selected with its author as a nested relation, not a column. */
type JoinedBookRow = Omit<CatalogListRow, 'author_name'> & {
  authors?: unknown;
};

/**
 * A row read straight from a view, for the PostgREST fallbacks.
 *
 * These bypass the API entirely — they exist only for a project with the Edge
 * Functions undeployed — so there is no `coverUrl` to read and the path is
 * resolved here instead. Nothing on the endpoint paths comes through here.
 */
function fromViewRow(row: CatalogListRow): CatalogBook {
  return mapCatalogBook(row, publicCoverUrl(row.cover_path));
}

function fromJoinedRow(row: JoinedBookRow): CatalogBook {
  return fromViewRow({
    ...row,
    author_name: authorName(
      row.authors as { name: string } | { name: string }[] | null,
    ),
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

/** The shape an endpoint's "no such thing" answer becomes for a list screen. */
function emptyPage<T>(page: number, pageSize: number): Page<T> {
  return {
    data: [],
    page,
    pageSize,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: page > 1,
  };
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
 * A carousel slide, ready to draw.
 *
 * The backend applies `sort_order`, resolves the headline, image and accent
 * against the book wherever the admin left an override blank, and drops any
 * slide that is switched off, outside its run window, or pointing at an
 * unpublished book. So this is a straight translation of the row — nothing
 * here is chosen, reordered, filtered or topped up by the app.
 */
export type CatalogSlide = {
  /**
   * A stable key for the list: the slide's own id when the admin curated it,
   * or the book's id for a weekly-draw slide, which has none of its own.
   */
  id: string;
  /** The book the slide opens. Its card is already in the payload. */
  bookId: string;
  /** Already resolved against the book's title. */
  headline: string;
  /** Undefined when unset: the element is hidden rather than drawn empty. */
  subtitle?: string;
  badge?: string;
  /** The CTA's text; undefined means the app's own default label. */
  ctaLabel?: string;
  /** Already resolved against the book's `cover_color`. */
  accent?: string;
  /**
   * The slide's artwork, already resolved: the admin's override, or the book's
   * own cover where there is none. This is what the slide draws.
   */
  imageUrl?: string;
  /** The book's own cover, for a thumbnail alongside the artwork. */
  coverUrl?: string;
  title: string;
  author: string;
  rating?: number;
  isPremium: boolean;
};

function toSlide(row: CarouselSlideRow): CatalogSlide {
  return {
    // Fallback slides arrive with `slide_id: null`; without this every page of
    // the weekly draw would share the key "null".
    id: row.slide_id ?? row.book_id,
    bookId: row.book_id,
    // No local fallback on the words or the colour: the backend has already
    // put the book's own title and cover colour wherever the admin left the
    // override blank, so a second fallback here could only disagree with it.
    headline: row.headline,
    subtitle: row.subtitle ?? undefined,
    accent: row.accent ?? undefined,
    // Both images arrive as URLs; `image_path` and `cover_path` are the raw
    // Storage keys behind them and are not read. A slide with neither draws on
    // its accent colour, the same placeholder a coverless book gets.
    imageUrl: row.imageUrl ?? undefined,
    coverUrl: coverUrlFor(row),
    badge: row.badge ?? undefined,
    ctaLabel: row.cta_label ?? undefined,
    title: row.title,
    author: authorName(row.author_name),
    rating: asNumber(row.rating),
    isPremium: Boolean(row.is_premium),
  };
}

/**
 * How many books the rails ask for.
 *
 * Caps, not quotas: the backend sends `hero` and `newArrivals` curated and
 * already backfilled, so a rail is only topped up locally on a deployment that
 * has not shipped that yet. `trending` is the legacy path's cap — the current
 * backend sends the weekly draw at the length it means, and that is drawn.
 */
const RAIL_TARGET = { hero: 5, trending: 10, arrivals: 10 } as const;

/**
 * The rails, from whichever shape `home-feed` answered with.
 *
 * With `shelves` present, `hero` and `newArrivals` are the editor's own
 * `home-hero` and `new-arrivals` collections in the order they were put in,
 * each already backfilled server-side with the newest published books — so
 * neither arrives blank, and neither is hidden or re-picked here. The trending
 * rail is the weekly draw, drawn exactly as it arrived: the same books in the
 * same order for every reader until Monday 00:00 UTC, never re-sorted,
 * re-sliced or topped up. A rail that stops shifting under the reader is the
 * whole point of the draw having moved off the client.
 *
 * The top-up below is only for a deployment that predates that backfill and
 * still answers `hero: []`. Without `shelves` at all, the rails are derived
 * from the book pool exactly as before: highest rated for the hero and for
 * trending, newest first for arrivals.
 */
function railsFrom(feed: HomeFeedPayload | null, pool: BookListItem[]) {
  const shelves = feed?.shelves;

  // `books-list` is already ordered newest-first, and `home-feed` sends the
  // same rows; merging keeps whatever the feed adds without duplicating it.
  const catalogue = dedupeById([...pool, ...(feed?.books ?? [])]).map(
    fromListItem,
  );

  if (shelves) {
    return {
      hero: railOr(
        shelves.hero,
        [...catalogue].sort(byRating),
        RAIL_TARGET.hero,
      ),
      trending: (shelves.trending ?? []).map(fromListItem),
      arrivals: railOr(shelves.newArrivals, catalogue, RAIL_TARGET.arrivals),
    };
  }

  const trending = [...catalogue].sort(byRating);

  return {
    hero: trending.slice(0, RAIL_TARGET.hero),
    trending: trending.slice(0, RAIL_TARGET.trending),
    arrivals: catalogue.slice(0, RAIL_TARGET.arrivals),
  };
}

/** A curated shelf, or the catalogue for a deployment that still sends none. */
function railOr(
  curated: BookListItem[] | undefined,
  spare: CatalogBook[],
  cap: number,
): CatalogBook[] {
  const rail = curated?.length ? curated.map(fromListItem) : spare;
  return rail.slice(0, cap);
}

/**
 * Whether the feed already drew Home, or the catalogue has to be read for it.
 *
 * Only the curated rails can come up short, and only on a deployment that has
 * not shipped their server-side backfill. The carousel and the trending rail
 * are never asked about: an empty carousel is a deliberate admin state and a
 * short weekly draw is a small catalogue, and reading more books to pad either
 * one is exactly the client-side curation this replaced.
 */
function feedIsEnough(feed: HomeFeedPayload | null): boolean {
  const shelves = feed?.shelves;
  if (!shelves) return false;

  const books = feed?.books?.length ?? 0;
  const arrivals = shelves.newArrivals?.length || books;
  const hero = shelves.hero?.length || books;

  return arrivals >= RAIL_TARGET.arrivals && hero >= RAIL_TARGET.hero;
}

async function homeFromEndpoints(signal?: AbortSignal) {
  const feed = await requestData<HomeFeedPayload>(ENDPOINTS.homeFeed, {
    signal,
  });

  // One round trip is enough when the feed already carries the whole of Home.
  // Otherwise the catalogue is read for what the rails are short of — the same
  // page the no-shelves path has always used.
  const pool = feedIsEnough(feed)
    ? []
    : (
        await requestPage<BookListItem>(ENDPOINTS.booksList, {
          pageSize: HOME_POOL_SIZE,
          signal,
        })
      ).data;

  return {
    // Rendered in the order given, or not at all. The backend already stands
    // in its weekly draw when the admin has curated nothing, so an empty list
    // means there is nothing to show (no published books, or the carousel read
    // failed server-side) — not a gap for the app to fill.
    carousel: (feed?.carousel ?? []).map(toSlide),
    // Which of the two the backend sent. Analytics and debugging only; the UI
    // draws both identically.
    carouselSource: feed?.carouselSource ?? null,
    ...railsFrom(feed ?? null, pool),
    collections: (feed?.collections ?? []).map(toCollection),
    categories: (feed?.categories ?? []).map(toCategory),
    featuredCollectionId: feed?.featuredCollectionId ?? null,
    // `app_settings.support_email`, so Help Center writes to whatever address
    // an admin has set rather than to one frozen into the bundle.
    supportEmail: feed?.supportEmail ?? null,
  };
}

async function homeFromTables() {
  const [hero, trending, arrivals, collections, categories] = await Promise.all(
    [
      supabase
        .from('books')
        .select(DETAIL_FIELDS)
        .eq('is_published', true)
        .order('rating', { ascending: false })
        .limit(RAIL_TARGET.hero),
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
    ],
  );

  return {
    // The carousel lives only behind its endpoint. There is no table read that
    // reproduces an admin's slides, and inventing one here is the curation this
    // removed — a project without the functions deployed shows no carousel.
    carousel: [] as CatalogSlide[],
    carouselSource: null as CarouselSource | null,
    // Only this rail carries real blurbs, so the hero keeps the `books` read.
    hero: unwrap(hero).map(fromJoinedRow),
    trending: unwrap(trending).map(row => fromViewRow(row as CatalogListRow)),
    arrivals: unwrap(arrivals).map(row => fromViewRow(row as CatalogListRow)),
    collections: unwrap(collections).map(row =>
      toCollection(row as CollectionRow),
    ),
    categories: unwrap(categories).map(row => toCategory(row as CategoryRow)),
    // The tables path has no `app_settings` grant for `anon`, so the feature
    // slot and the support address stay unset rather than failing the whole
    // read for them.
    featuredCollectionId: null as string | null,
    supportEmail: null as string | null,
  };
}

export async function getHomeCatalog(signal?: AbortSignal) {
  return withEndpoint(
    ENDPOINTS.homeFeed,
    () => homeFromEndpoints(signal),
    () => homeFromTables(),
  );
}

/**
 * The carousel on its own.
 *
 * Home takes it out of `home-feed`, which carries the identical payload in the
 * same round trip; this is for refreshing that one rail. There is no table
 * fallback — an undeployed function means no carousel, not a locally assembled
 * one.
 */
export async function getCarousel(
  signal?: AbortSignal,
): Promise<CatalogSlide[]> {
  const payload = await requestData<CarouselPayload>(ENDPOINTS.carouselList, {
    signal,
  });
  return (payload?.slides ?? []).map(toSlide);
}

export type WeeklyTrending = {
  /** Monday 00:00 UTC of the draw these books belong to. */
  weekStart: string | null;
  /**
   * When the draw stops being current — always the following Monday 00:00 UTC.
   * Cache until then rather than polling; the answer cannot change before it.
   */
  expiresAt: string | null;
  books: CatalogBook[];
};

/**
 * The weekly draw, with the week it belongs to.
 *
 * Home reads the same books out of `home-feed`; this is for a surface that
 * needs `weekStart` / `expiresAt`. The books are chosen once a week and are
 * identical for every reader — the order is the backend's, and it is kept.
 */
export async function getWeeklyTrending({
  limit = 10,
  signal,
}: { limit?: number; signal?: AbortSignal } = {}): Promise<WeeklyTrending> {
  const payload = await requestData<TrendingWeeklyPayload>(
    ENDPOINTS.trendingWeekly,
    {
      query: { limit },
      signal,
    },
  );

  return {
    weekStart: payload?.weekStart ?? null,
    expiresAt: payload?.expiresAt ?? null,
    books: (payload?.books ?? []).map(fromListItem),
  };
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

/**
 * What Discover narrows the catalogue by.
 *
 * Every one of these is answered by the database, before `LIMIT` — so
 * `totalCount` and `hasNextPage` describe the filtered set and paging a
 * filtered list is the same operation as paging an unfiltered one. The app
 * neither re-checks them nor re-derives what they mean; `length`, in
 * particular, is a bucket *name* precisely so the boundaries live in one place.
 *
 * "Downloaded only" is deliberately absent: that is this device's state, and
 * these endpoints are public and unauthenticated.
 */
/**
 * How the catalogue is ordered.
 *
 * The server's own default is `newest` while browsing and `relevance` once
 * there is a search term, so Discover sends nothing at all until the reader
 * picks an order themselves — which keeps "best match" meaning best match
 * without the app having to know which endpoint it is talking to.
 *
 * Ordering is the database's in every case. Sorting a page here would reorder
 * twenty rows out of a hundred and twenty and call it a sorted catalogue.
 */
export type CatalogSort = 'newest' | 'rating' | 'title' | 'relevance';

export type CatalogFilters = {
  /**
   * A `categories.id`. The backend's `category` parameter resolves either an id
   * or a slug, and answers 404 `NOT_FOUND` for a subject that does not exist.
   */
  categoryId?: string | null;
  /** Any of these — the endpoint ORs values inside one parameter. */
  languages?: BookLanguage[];
  lengths?: BookLengthBucket[];
  /** "Only books in my membership". `premium=false` would mean free-only, so
   *  the parameter is sent only when the toggle is on. */
  membershipOnly?: boolean;
  /** `rating >= minRating`; the backend clamps it to 0–5. */
  minRating?: number;
  /**
   * The order to return matches in. Omitted means "the server's default for
   * this call" — newest for a browse, relevance for a search.
   */
  sort?: CatalogSort | null;
};

export type BrowseParams = CatalogFilters & {
  /** Free text. Empty is a browse, which reads the catalog list instead. */
  query?: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
};

/**
 * The filters as the endpoints take them.
 *
 * A parameter that is not set is left out rather than sent empty — `buildUrl`
 * drops `undefined` — and an older deployment ignores the ones it does not
 * know, which is what lets this ship before the backend does.
 */
function filterQuery(filters: CatalogFilters) {
  return {
    category: filters.categoryId ?? undefined,
    language: filters.languages?.length
      ? filters.languages.join(',')
      : undefined,
    length: filters.lengths?.length ? filters.lengths.join(',') : undefined,
    premium: filters.membershipOnly ? true : undefined,
    minRating: filters.minRating,
    sort: filters.sort ?? undefined,
  };
}

/** Books in one subject, for the fallback path that has no `category` filter. */
async function bookIdsInCategory(categoryId: string): Promise<string[]> {
  const result = await supabase
    .from('book_categories')
    .select('book_id')
    .eq('category_id', categoryId);

  return unwrap(result).map(row => (row as { book_id: string }).book_id);
}

/**
 * One page of the published catalog, newest first.
 *
 * `categoryId` is pushed down to the backend rather than applied here, so a
 * subject filter narrows what the *database* pages over — page 2 of "History"
 * is the second page of that subject, not the second page of everything with
 * the non-matching rows dropped.
 */
export async function listBooks({
  page = 1,
  pageSize = BROWSE_PAGE_SIZE,
  signal,
  ...filters
}: Omit<BrowseParams, 'query'> = {}): Promise<Page<CatalogBook>> {
  const { categoryId = null } = filters;

  return withEndpoint(
    ENDPOINTS.booksList,
    async () => {
      try {
        const result = await requestPage<BookListItem>(ENDPOINTS.booksList, {
          page,
          pageSize,
          query: filterQuery(filters),
          signal,
        });
        return { ...result, data: result.data.map(fromListItem) };
      } catch (error) {
        // A subject the catalogue has since dropped answers 404 NOT_FOUND. That
        // is an empty shelf, not a broken tab — but an undeployed function is a
        // 404 too, and that one has to reach the fallback.
        if (
          error instanceof ApiError &&
          error.status === 404 &&
          !isEndpointMissing(error)
        ) {
          return emptyPage<CatalogBook>(page, pageSize);
        }
        throw error;
      }
    },
    async () => {
      const offset = (page - 1) * pageSize;

      let builder = supabase
        .from('book_list_items')
        .select(LIST_FIELDS, { count: 'exact' })
        .order('published_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (categoryId) {
        builder = builder.in('id', await bookIdsInCategory(categoryId));
      }

      const result = await builder;

      const rows = unwrap(result).map(row =>
        fromViewRow(row as CatalogListRow),
      );
      const totalCount = result.count ?? null;

      return {
        data: rows,
        page,
        pageSize,
        totalCount,
        totalPages:
          totalCount == null ? null : Math.ceil(totalCount / pageSize),
        hasNextPage:
          totalCount == null
            ? rows.length === pageSize
            : page * pageSize < totalCount,
        hasPreviousPage: page > 1,
      };
    },
  );
}

/**
 * One page of Discover: a search when the reader has typed, a browse when they
 * have not, narrowed to a subject in either case.
 *
 * Both backend endpoints answer with the same pagination envelope, so the
 * screen above pages one list and never has to know which one replied. A
 * subject that no longer exists is an empty page rather than a failure — the
 * reader's saved filter should not break the whole tab.
 */
export async function browseCatalog({
  query = '',
  page = 1,
  pageSize = BROWSE_PAGE_SIZE,
  signal,
  ...filters
}: BrowseParams = {}): Promise<Page<CatalogBook>> {
  const term = query.trim();
  const { categoryId = null } = filters;

  if (!term) {
    return listBooks({ page, pageSize, signal, ...filters });
  }

  return withEndpoint(
    ENDPOINTS.booksSearch,
    async () => {
      try {
        const result = await requestPage<BookListItem>(ENDPOINTS.booksSearch, {
          page,
          pageSize,
          // The same filter set as the browse: one SQL function backs both, so
          // a filter cannot mean one thing while searching and another while
          // browsing.
          query: { q: term, ...filterQuery(filters) },
          signal,
        });
        return { ...result, data: result.data.map(fromListItem) };
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 404 &&
          !isEndpointMissing(error)
        ) {
          return emptyPage<CatalogBook>(page, pageSize);
        }
        throw error;
      }
    },
    async () => {
      const offset = (page - 1) * pageSize;

      // The fallback searches `books`, whose `search_vector` predates the view
      // column the endpoint uses, so it works on an un-migrated project too.
      let builder = supabase
        .from('books')
        .select(DETAIL_FIELDS, { count: 'exact' })
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (categoryId) {
        builder = builder.in('id', await bookIdsInCategory(categoryId));
      }
      if (signal) {
        builder = builder.abortSignal(signal);
      }

      const result = await builder.textSearch('search_vector', term, {
        type: 'plain',
        config: 'english',
      });

      const rows = unwrap(result).map(fromJoinedRow);
      const totalCount = result.count ?? null;

      return {
        data: rows,
        page,
        pageSize,
        totalCount,
        totalPages:
          totalCount == null ? null : Math.ceil(totalCount / pageSize),
        hasNextPage:
          totalCount == null
            ? rows.length === pageSize
            : page * pageSize < totalCount,
        hasPreviousPage: page > 1,
      };
    },
  );
}

/** The collection a `collection-books` page belongs to, for its own header. */
export type CatalogCollectionInfo = {
  id: string;
  slug: string | null;
  title: string;
  subtitle?: string;
  kind: string;
};

export type CollectionBooksPage = Page<CatalogBook> & {
  /** `null` only when the collection could not be resolved at all. */
  collection: CatalogCollectionInfo | null;
};

function toCollectionInfo(row: CollectionInfoRow): CatalogCollectionInfo {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    kind: row.kind,
  };
}

/**
 * One collection's books, in the order an editor put them in.
 *
 * Addressed by `id` or by `slug` — exactly one, never both, which the
 * endpoint rejects as `INVALID_REQUEST`. The answer carries the collection
 * itself alongside the page, so the screen titles itself from what the server
 * says rather than from whatever was passed through navigation.
 *
 * Only published books are counted and paged, so the order given is the order
 * drawn: no re-sorting, no filtering, and an empty collection is a real answer
 * rather than something to backfill.
 *
 * There is no table fallback. The junction read would have to re-derive the
 * publish filter and the sort, and get both subtly wrong.
 */
export async function getCollectionBooks({
  id,
  slug,
  page = 1,
  pageSize = BROWSE_PAGE_SIZE,
  signal,
}: {
  id?: string | null;
  slug?: string | null;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}): Promise<CollectionBooksPage> {
  type Payload = Page<BookListItem> & { collection?: CollectionInfoRow | null };

  try {
    const payload = await request<Payload | null>(ENDPOINTS.collectionBooks, {
      // One or the other: sending both is a 400, so the id wins when a caller
      // somehow holds each.
      query: { ...(id ? { id } : { slug }), page, pageSize },
      signal,
    });

    return {
      data: (payload?.data ?? []).map(fromListItem),
      page: payload?.page ?? page,
      pageSize: payload?.pageSize ?? pageSize,
      totalCount: payload?.totalCount ?? null,
      totalPages: payload?.totalPages ?? null,
      hasNextPage: payload?.hasNextPage ?? false,
      hasPreviousPage: payload?.hasPreviousPage ?? page > 1,
      collection: payload?.collection
        ? toCollectionInfo(payload.collection)
        : null,
    };
  } catch (error) {
    // A collection that has been unpublished or renamed is an empty shelf, not
    // a failure. A missing *function* is still a fault and passes through.
    if (
      error instanceof ApiError &&
      error.status === 404 &&
      !isEndpointMissing(error)
    ) {
      return { ...emptyPage<CatalogBook>(page, pageSize), collection: null };
    }
    throw error;
  }
}

export async function getCategories(
  signal?: AbortSignal,
): Promise<CatalogCategory[]> {
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
    async () =>
      (await requestData<PlanRow[]>(ENDPOINTS.plansList, { signal })) ?? [],
    async () => {
      const result = await supabase
        .from('plans')
        .select(
          'id,code,name,price_cents,currency,interval,features,revenuecat_product_id,is_active,sort_order',
        )
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
        if (
          error instanceof ApiError &&
          error.status === 404 &&
          !isEndpointMissing(error)
        ) {
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
