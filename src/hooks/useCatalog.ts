import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import {
  getBook,
  getCategories,
  getHomeCatalog,
  listBooks,
  searchCatalog,
} from '@/services/catalog';

export function useHomeCatalog() {
  return useQuery({
    queryKey: ['catalog', 'home'],
    queryFn: ({ signal }) => getHomeCatalog(signal),
    staleTime: 5 * 60_000,
    retry: 1,
    retryDelay: 1_000,
  });
}

export function useCatalogSearch(query: string) {
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: ['catalog', 'search', debounced.trim().toLowerCase()],
    queryFn: ({ signal }) => searchCatalog(debounced, signal),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
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
 * The full catalog, one page at a time.
 *
 * `books-list` answers with the backend's pagination envelope, so the next page
 * comes from `hasNextPage` rather than from guessing at a short page.
 */
export function useBooksPages(pageSize = 20) {
  return useInfiniteQuery({
    queryKey: ['catalog', 'books', pageSize],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => listBooks(pageParam, pageSize, signal),
    getNextPageParam: page => (page.hasNextPage ? page.page + 1 : undefined),
    staleTime: 5 * 60_000,
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
