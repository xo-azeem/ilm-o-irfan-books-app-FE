import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import {
  browseCatalog,
  getBook,
  getCarousel,
  getCategories,
  getCollectionBooks,
  getHomeCatalog,
  getWeeklyTrending,
  type CatalogFilters,
} from '@/services/catalog';

/** The carousel, the weekly draw and the rest of Home in one round trip. */
export function useHomeCatalog() {
  return useQuery({
    queryKey: ['catalog', 'home'],
    queryFn: ({ signal }) => getHomeCatalog(signal),
    staleTime: 5 * 60_000,
    retry: 1,
    retryDelay: 1_000,
  });
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

/** Holds a value still for `delay` ms — one debounce for the search field. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [delay, value]);

  return debounced;
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
 */
export function useCatalogFeed(query: string, filters: CatalogFilters) {
  const debounced = useDebounced(query);
  const term = debounced.trim();

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

/**
 * One collection's books, paged.
 *
 * Addressed by whichever handle the caller has — the Home strip carries ids, a
 * deep link would carry a slug. The collection itself rides along on the first
 * page, so the screen has its own title without being told one.
 */
export function useCollectionBooks({
  id,
  slug,
}: {
  id?: string | null;
  slug?: string | null;
}) {
  return useInfiniteQuery({
    queryKey: ['catalog', 'collection', id ?? null, slug ?? null],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      getCollectionBooks({ id, slug, page: pageParam, signal }),
    getNextPageParam: page => (page.hasNextPage ? page.page + 1 : undefined),
    enabled: Boolean(id || slug),
    staleTime: 5 * 60_000,
  });
}
