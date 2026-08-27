import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { getBook, getCategories, getHomeCatalog, searchCatalog } from '@/services/catalog';

export function useHomeCatalog() {
  return useQuery({
    queryKey: ['catalog', 'home'],
    queryFn: getHomeCatalog,
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
    queryFn: getCategories,
    staleTime: 10 * 60_000,
  });
}

export function useBook(id: string) {
  return useQuery({
    queryKey: ['catalog', 'book', id],
    queryFn: () => getBook(id),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  });
}
