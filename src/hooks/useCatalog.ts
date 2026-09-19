import {
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  browseCatalog,
  getBook,
  getCarousel,
  getCategories,
  getCollectionBooks,
  getHomeCatalog,
  getWeeklyTrending,
  HOME_RAIL_LIMIT,
  shelfCopy,
  type CatalogBook,
  type CatalogFilters,
  type CollectionBooksPage,
  type ShelfLink,
} from '@/services/catalog';

/**
 * The carousel, the weekly draw and the rest of Home in one round trip.
 *
 * Defined once so the splash can warm exactly the query Home will read: the
 * key, the function and the stale window have to agree, or the prefetch lands
 * in a slot Home never looks at and the skeleton shows regardless.
 */
export const homeCatalogQuery = queryOptions({
  queryKey: ['catalog', 'home'],
  queryFn: ({ signal }) => getHomeCatalog(signal),
  staleTime: 5 * 60_000,
  retry: 1,
  retryDelay: 1_000,
});

export function useHomeCatalog() {
  return useQuery(homeCatalogQuery);
}

/**
 * Starts the Home feed request without a screen to read it.
 *
 * Fired from under the splash, so the round trip overlaps the session check
 * instead of waiting behind it. Resolves once the request has settled either
 * way — a failed feed is Home's error state to draw, not a reason to hold the
 * splash — and never throws.
 */
export function prefetchHomeCatalog(client: QueryClient): Promise<void> {
  return client.prefetchQuery(homeCatalogQuery);
}

/**
 * The carousel on its own, for refreshing that one rail.
 *
 * Home does not use this — it takes the identical payload out of `home-feed`,
 * because the carousel is the first thing on screen and a second round trip is
 * a second chance for Home to render half-empty.
 */
export function useCarousel(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['catalog', 'carousel'],
    queryFn: ({ signal }) => getCarousel(signal),
    enabled: options.enabled ?? true,
    // The endpoint is cached `public, max-age=60`; this matches it rather than
    // working around it with a cache-busting parameter.
    staleTime: 60_000,
  });
}

/**
 * The weekly draw with its week metadata, for a "Trending this week" screen.
 *
 * The set is fixed until `expiresAt` — the following Monday 00:00 UTC — so the
 * response is held that long instead of being polled for. Home's own rail
 * comes from `home-feed`, which carries the same draw without the metadata.
 */
export function useWeeklyTrending(limit = 10) {
  return useQuery({
    queryKey: ['catalog', 'trending-weekly', limit],
    queryFn: ({ signal }) => getWeeklyTrending({ limit, signal }),
    staleTime: query => {
      const expiresAt = query.state.data?.expiresAt;
      if (!expiresAt) {
        // No metadata to go on: fall back to the endpoint's own max-age.
        return 15 * 60_000;
      }
      return Math.max(new Date(expiresAt).getTime() - Date.now(), 0);
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['catalog', 'categories'],
    queryFn: ({ signal }) => getCategories(signal),
    staleTime: 10 * 60_000,
  });
}

/**
 * Discover's list: the whole catalog, one page at a time.
 *
 * Search text and the subject filter are part of the key, so changing either
 * starts a fresh pagination rather than appending a different query's pages to
 * the ones already on screen. `hasNextPage` comes from the backend's envelope,
 * which is what lets the list ask for page N+1 before the reader reaches the
 * bottom of page N instead of guessing from a short page.
 *
 * A new key does not empty the list: the previous term's pages are held as
 * placeholder data until the first page of the new one lands, so typing narrows
 * the results in place rather than flashing a skeleton between every word.
 * Callers read `isPlaceholderData` to tell the two apart — and must not page
 * placeholder data, since its `hasNextPage` describes a different query.
 *
 * `query` is the settled term, not the live text: `SearchField` holds each
 * keystroke back for its own beat before reporting, so nothing here waits
 * again.
 */
export function useCatalogFeed(query: string, filters: CatalogFilters) {
  const term = query.trim();

  return useInfiniteQuery({
    queryKey: ['catalog', 'feed', term.toLowerCase(), filters],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      browseCatalog({ ...filters, query: term, page: pageParam, signal }),
    getNextPageParam: page => (page.hasNextPage ? page.page + 1 : undefined),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useBook(id: string) {
  return useQuery({
    queryKey: ['catalog', 'book', id],
    queryFn: ({ signal }) => getBook(id, signal),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  });
}

/** Discover's and a collection's page size, when nothing seeds page one. */
const COLLECTION_PAGE_SIZE = 20;

/**
 * Page one of a collection, as Home already holds it.
 *
 * The Trending and New arrivals rails are the first ten of exactly what
 * `collection-books` pages for those shelves, so when the reader opens either
 * one the page has nothing to fetch until they scroll past what was on Home.
 * The page is read at the rail's size so that page two starts where the rail
 * stopped — a bigger page one would have re-read the same ten.
 *
 * `null` for any other collection, or when Home has not loaded: those read
 * from the network as usual.
 */
function railSeed(
  client: QueryClient,
  id: string | null | undefined,
  slug: string | null | undefined,
): { page: CollectionBooksPage; updatedAt: number } | null {
  const state = client.getQueryState(homeCatalogQuery.queryKey);
  const home = state?.data as
    Awaited<ReturnType<typeof getHomeCatalog>> | undefined;
  if (!home || !state?.dataUpdatedAt) {
    return null;
  }

  const matches = (link: ShelfLink | null) =>
    Boolean(link) &&
    ((id && link?.collectionId === id) || (!id && slug && link?.slug === slug));

  let rail: {
    link: ShelfLink;
    books: CatalogBook[];
    copy: { title: string; subtitle: string };
  };
  if (matches(home.trendingLink)) {
    rail = {
      link: home.trendingLink as ShelfLink,
      books: home.trending,
      copy: shelfCopy().trending,
    };
  } else if (matches(home.arrivalsLink)) {
    rail = {
      link: home.arrivalsLink as ShelfLink,
      books: home.arrivals,
      copy: shelfCopy().arrivals,
    };
  } else {
    return null;
  }

  const totalCount = Math.max(rail.link.totalCount, rail.books.length);
  return {
    updatedAt: state.dataUpdatedAt,
    page: {
      data: rail.books,
      page: 1,
      pageSize: HOME_RAIL_LIMIT,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / HOME_RAIL_LIMIT)),
      hasNextPage: totalCount > rail.books.length,
      hasPreviousPage: false,
      // The server's own title replaces this the first time the page is
      // refetched; until then the heading is the one the reader just tapped.
      collection: {
        id: rail.link.collectionId,
        slug: rail.link.slug,
        title: rail.copy.title,
        subtitle: rail.copy.subtitle,
        kind: 'shelf',
        isSystem: true,
      },
      source: rail.link.source,
    },
  };
}

/**
 * One collection's books, paged.
 *
 * Addressed by whichever handle the caller has — the Home strip carries ids, a
 * deep link would carry a slug. The collection itself rides along on the first
 * page, so the screen has its own title without being told one.
 *
 * A collection that is also a Home rail starts from the rail: page one is the
 * ten books already on screen, aged as Home's own feed is, so a fresh Home
 * means no request at all and a stale one refreshes in the background behind
 * the seeded list. The page size is part of the key because the seeded and
 * the cold reads page at different sizes and must not share pages.
 */
export function useCollectionBooks({
  id,
  slug,
}: {
  id?: string | null;
  slug?: string | null;
}) {
  const client = useQueryClient();
  const seed = useMemo(() => railSeed(client, id, slug), [client, id, slug]);
  const pageSize = seed ? HOME_RAIL_LIMIT : COLLECTION_PAGE_SIZE;

  return useInfiniteQuery({
    queryKey: ['catalog', 'collection', id ?? null, slug ?? null, pageSize],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      getCollectionBooks({ id, slug, page: pageParam, pageSize, signal }),
    getNextPageParam: page => (page.hasNextPage ? page.page + 1 : undefined),
    enabled: Boolean(id || slug),
    staleTime: 5 * 60_000,
    initialData: seed
      ? () => ({ pages: [seed.page], pageParams: [1] })
      : undefined,
    initialDataUpdatedAt: seed?.updatedAt,
  });
}
