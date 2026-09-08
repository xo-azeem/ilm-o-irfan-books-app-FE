import { useCallback, useMemo, useState } from 'react';

import { isUrduTitle } from '@/services/script';
import type { CatalogBook } from '@/services/catalog';

/**
 * Discover's filter state — the single source of truth behind the filter
 * sheet, the subject panel and the chip row under the search field. All three
 * read this object and write it through the same actions, so a subject picked
 * on the panel is the same filter the sheet shows selected and the same chip
 * the reader can dismiss.
 *
 * Every filter is backed by something the catalogue actually has:
 *   · subject  — `book_categories`, pushed down to the backend's `category`
 *   · language — derived from the title's script (see `services/script`)
 *   · length   — `read_time_minutes`
 *   · access   — `is_premium`, plus the reader's own downloads
 *   · rating   — `rating`
 *
 * Only the subject is answered by the server. The rest refine the page the
 * server sent, which is why `apply` deliberately ignores `categoryId`.
 */
export type LanguageFilter = 'urdu' | 'english';
export type LengthFilter = 'short' | 'medium' | 'long';

export type SearchFilters = {
  /** A `categories.id`, or null for every subject. */
  categoryId: string | null;
  languages: LanguageFilter[];
  lengths: LengthFilter[];
  membershipOnly: boolean;
  downloadedOnly: boolean;
  highlyRatedOnly: boolean;
};

export const EMPTY_FILTERS: SearchFilters = {
  categoryId: null,
  languages: [],
  lengths: [],
  membershipOnly: false,
  downloadedOnly: false,
  highlyRatedOnly: false,
};

/**
 * One active filter, as the chip row draws it.
 *
 * The token is what a chip's dismiss passes back to `remove`, so the row needs
 * no per-filter callbacks of its own.
 */
export type FilterToken =
  | { kind: 'category'; value: string }
  | { kind: 'language'; value: LanguageFilter }
  | { kind: 'length'; value: LengthFilter }
  | { kind: 'membership' }
  | { kind: 'downloaded' }
  | { kind: 'rating' };

/** Read-time buckets, in minutes, matching the sheet's three length chips. */
const LENGTH_BOUNDS: Record<LengthFilter, [number, number]> = {
  short: [0, 200],
  medium: [200, 600],
  long: [600, Number.POSITIVE_INFINITY],
};

export const LENGTH_LABELS: Record<LengthFilter, string> = {
  short: 'Under 200p',
  medium: '200–600p',
  long: '600p+',
};

export const LANGUAGE_LABELS: Record<LanguageFilter, string> = {
  urdu: 'Urdu',
  english: 'English',
};

/** A rough pages-per-minute conversion, so length reads in pages as designed. */
function approximatePages(readTimeMinutes: string | null | undefined): number | null {
  if (!readTimeMinutes) {
    return null;
  }
  const match = /(\d+)\s*(min|hr)/.exec(readTimeMinutes);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  const minutes = match[2] === 'hr' ? value * 60 : value;
  // ~1.5 minutes a page is the industry rule of thumb for non-fiction.
  return Math.round(minutes / 1.5);
}

/** The active filters, in the order the chip row shows them. */
export function activeTokens(filters: SearchFilters): FilterToken[] {
  return [
    ...(filters.categoryId
      ? [{ kind: 'category', value: filters.categoryId } as const]
      : []),
    ...filters.languages.map(value => ({ kind: 'language', value } as const)),
    ...filters.lengths.map(value => ({ kind: 'length', value } as const)),
    ...(filters.membershipOnly ? [{ kind: 'membership' } as const] : []),
    ...(filters.downloadedOnly ? [{ kind: 'downloaded' } as const] : []),
    ...(filters.highlyRatedOnly ? [{ kind: 'rating' } as const] : []),
  ];
}

/** A stable key for a token, for React keys and the chip row. */
export function tokenKey(token: FilterToken): string {
  return 'value' in token ? `${token.kind}:${token.value}` : token.kind;
}

/**
 * A token's chip label. Subjects are named by the catalogue, so the caller
 * passes the lookup rather than this module reaching for the category list.
 */
export function tokenLabel(
  token: FilterToken,
  subjectName: (id: string) => string | undefined,
): string {
  switch (token.kind) {
    case 'category':
      return subjectName(token.value) ?? 'Subject';
    case 'language':
      return LANGUAGE_LABELS[token.value];
    case 'length':
      return LENGTH_LABELS[token.value];
    case 'membership':
      return 'In membership';
    case 'downloaded':
      return 'Downloaded';
    case 'rating':
      return '4★ and up';
  }
}

export function useSearchFilters(downloadedIds?: Set<string>) {
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);

  /** Picking the subject already selected clears it, so a tile toggles. */
  const setCategory = useCallback((categoryId: string | null) => {
    setFilters(current => ({
      ...current,
      categoryId: current.categoryId === categoryId ? null : categoryId,
    }));
  }, []);

  const toggleLanguage = useCallback((value: LanguageFilter) => {
    setFilters(current => ({
      ...current,
      languages: current.languages.includes(value)
        ? current.languages.filter(item => item !== value)
        : [...current.languages, value],
    }));
  }, []);

  const toggleLength = useCallback((value: LengthFilter) => {
    setFilters(current => ({
      ...current,
      lengths: current.lengths.includes(value)
        ? current.lengths.filter(item => item !== value)
        : [...current.lengths, value],
    }));
  }, []);

  const setMembershipOnly = useCallback(
    (membershipOnly: boolean) => setFilters(current => ({ ...current, membershipOnly })),
    [],
  );

  const setDownloadedOnly = useCallback(
    (downloadedOnly: boolean) => setFilters(current => ({ ...current, downloadedOnly })),
    [],
  );

  const setHighlyRatedOnly = useCallback(
    (highlyRatedOnly: boolean) => setFilters(current => ({ ...current, highlyRatedOnly })),
    [],
  );

  const reset = useCallback(() => setFilters(EMPTY_FILTERS), []);

  /** Dismissing a chip in the row under the search field. */
  const remove = useCallback((token: FilterToken) => {
    setFilters(current => {
      switch (token.kind) {
        case 'category':
          return { ...current, categoryId: null };
        case 'language':
          return {
            ...current,
            languages: current.languages.filter(item => item !== token.value),
          };
        case 'length':
          return {
            ...current,
            lengths: current.lengths.filter(item => item !== token.value),
          };
        case 'membership':
          return { ...current, membershipOnly: false };
        case 'downloaded':
          return { ...current, downloadedOnly: false };
        case 'rating':
          return { ...current, highlyRatedOnly: false };
      }
    });
  }, []);

  /**
   * Refines the pages the backend sent.
   *
   * The subject is not re-checked here: it narrowed the query itself, so a row
   * that came back is in that subject by definition, and re-deriving it would
   * need a category the lean list payload does not carry.
   */
  const apply = useCallback(
    (books: CatalogBook[]) =>
      books.filter(book => {
        if (filters.languages.length > 0) {
          const language: LanguageFilter = isUrduTitle(book.title) ? 'urdu' : 'english';
          if (!filters.languages.includes(language)) {
            return false;
          }
        }

        if (filters.lengths.length > 0) {
          const pages = approximatePages(book.readTime);
          if (pages == null) {
            return false;
          }
          const matches = filters.lengths.some(length => {
            const [min, max] = LENGTH_BOUNDS[length];
            return pages >= min && pages < max;
          });
          if (!matches) {
            return false;
          }
        }

        if (filters.membershipOnly && !book.isPremium) {
          return false;
        }

        if (filters.downloadedOnly && !downloadedIds?.has(book.id)) {
          return false;
        }

        if (filters.highlyRatedOnly && (book.rating ?? 0) < 4) {
          return false;
        }

        return true;
      }),
    [downloadedIds, filters],
  );

  const tokens = useMemo(() => activeTokens(filters), [filters]);

  /**
   * Whether anything other than the subject is narrowing the list.
   *
   * The subject is answered by the backend, so every page it returns is full.
   * The client-side filters are the ones that can thin a page down to nothing
   * and leave the screen looking empty while pages are still waiting, which is
   * what the list uses this to decide to keep paging.
   */
  const refinesClientSide = useMemo(
    () => tokens.some(token => token.kind !== 'category'),
    [tokens],
  );

  return {
    filters,
    tokens,
    activeCount: tokens.length,
    refinesClientSide,
    apply,
    remove,
    reset,
    setCategory,
    toggleLanguage,
    toggleLength,
    setMembershipOnly,
    setDownloadedOnly,
    setHighlyRatedOnly,
  };
}
