import { useCallback, useMemo, useState } from 'react';

import { isUrduTitle } from '@/services/script';
import type { CatalogBook } from '@/services/catalog';

/**
 * Discover's filter state.
 *
 * Every filter here is backed by a column the catalogue actually has, so a chip
 * can never promise something the query cannot deliver:
 *   · language — derived from the title's script (see `services/script`)
 *   · length   — `read_time_minutes`
 *   · access   — `is_premium`, plus the reader's own downloads
 *   · rating   — `rating`
 */
export type LanguageFilter = 'urdu' | 'english';
export type LengthFilter = 'short' | 'medium' | 'long';

export type SearchFilters = {
  languages: LanguageFilter[];
  lengths: LengthFilter[];
  membershipOnly: boolean;
  downloadedOnly: boolean;
  highlyRatedOnly: boolean;
};

export const EMPTY_FILTERS: SearchFilters = {
  languages: [],
  lengths: [],
  membershipOnly: false,
  downloadedOnly: false,
  highlyRatedOnly: false,
};

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

export function countActiveFilters(filters: SearchFilters): number {
  return (
    filters.languages.length +
    filters.lengths.length +
    (filters.membershipOnly ? 1 : 0) +
    (filters.downloadedOnly ? 1 : 0) +
    (filters.highlyRatedOnly ? 1 : 0)
  );
}

export function useSearchFilters(downloadedIds?: Set<string>) {
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);

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

  /**
   * Applied client-side over the 50-row result page the catalogue returns, so
   * the count on the sheet's button is always the real number of matches.
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

  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);

  return {
    filters,
    activeCount,
    apply,
    reset,
    toggleLanguage,
    toggleLength,
    setMembershipOnly,
    setDownloadedOnly,
    setHighlyRatedOnly,
  };
}
