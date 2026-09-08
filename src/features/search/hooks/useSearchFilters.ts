import { useCallback, useMemo, useState } from 'react';

import { isUrduTitle } from '@/services/script';
import type { BookLanguage, BookLengthBucket } from '@/services/api/types';
import type { CatalogBook, CatalogFilters } from '@/services/catalog';

/**
 * Discover's filter state — the single source of truth behind the filter
 * sheet, the subject panel and the chip row under the search field. All three
 * read this object and write it through the same actions, so a subject picked
 * on the panel is the same filter the sheet shows selected and the same chip
 * the reader can dismiss.
 *
 * Every filter but one is asked of the database, before `LIMIT`, so paging a
 * filtered list is the same operation as paging the whole catalogue and the
 * count on screen is the real number of matches:
 *
 *   · subject  — `book_categories`, as the `category` parameter
 *   · language — `books.language`, a recorded column and not a guess
 *   · length   — a bucket name whose boundaries the server owns
 *   · access   — `is_premium`, as `premium`
 *   · rating   — `rating >= minRating`
 *
 * The exception is `downloadedOnly`, which is this device's state: the
 * catalogue endpoints are public and unauthenticated and cannot know it.
 *
 * `apply` still checks the other four against the rows that came back, and
 * that is deliberate — see the comment on it.
 */
export type LanguageFilter = BookLanguage;
export type LengthFilter = BookLengthBucket;

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

/** The rating the "4★ and up" toggle asks the backend for. */
const HIGHLY_RATED = 4;

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

/**
 * The length chips.
 *
 * Pages, and honestly so: the backend buckets on a real `page_count` where a
 * reader has reported one, and on its own estimate otherwise. These are labels
 * for the server's boundaries — `short` under 200, `medium` 200–599, `long`
 * 600 and up — and must be changed to follow them, never the other way round.
 */
export const LENGTH_LABELS: Record<LengthFilter, string> = {
  short: 'Under 200p',
  medium: '200–599p',
  long: '600p+',
};

export const LANGUAGE_LABELS: Record<LanguageFilter, string> = {
  urdu: 'Urdu',
  english: 'English',
  arabic: 'Arabic',
};

/** The order the sheet lists them in. */
export const LANGUAGES: LanguageFilter[] = ['urdu', 'english', 'arabic'];
export const LENGTHS: LengthFilter[] = ['short', 'medium', 'long'];

/** The server's bucket boundaries, in pages, for the estimate below. */
const LENGTH_BOUNDS: Record<LengthFilter, [number, number]> = {
  short: [0, 200],
  medium: [200, 600],
  long: [600, Number.POSITIVE_INFINITY],
};

/**
 * A book's bucket when the row did not carry one.
 *
 * Reads pages back out of the formatted read time, which was itself estimated
 * from the PDF's file size — an estimate of an estimate, and exactly why the
 * bucket belongs on the server. Only reached on a payload with no
 * `length_bucket`.
 */
function estimateBucket(readTime: string | null | undefined): LengthFilter | null {
  if (!readTime) {
    return null;
  }
  const match = /(\d+)\s*(min|hr)/.exec(readTime);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  const minutes = match[2] === 'hr' ? value * 60 : value;
  // ~1.5 minutes a page is the industry rule of thumb for non-fiction.
  const pages = Math.round(minutes / 1.5);

  return (
    (Object.keys(LENGTH_BOUNDS) as LengthFilter[]).find(bucket => {
      const [min, max] = LENGTH_BOUNDS[bucket];
      return pages >= min && pages < max;
    }) ?? null
  );
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

/** What `apply` hands back: the rows to draw, and what the count means. */
export type AppliedFilters = {
  rows: CatalogBook[];
  /**
   * True when the page had to be narrowed here, so the backend's `totalCount`
   * is no longer the number of matches and the list must count what it holds.
   */
  countIsLocal: boolean;
};

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
   * The query the catalogue is asked for.
   *
   * `downloadedOnly` is not in here: no public endpoint knows this reader's
   * downloads. Everything else goes to the database.
   */
  const serverFilters = useMemo<CatalogFilters>(
    () => ({
      categoryId: filters.categoryId,
      languages: filters.languages,
      lengths: filters.lengths,
      membershipOnly: filters.membershipOnly,
      minRating: filters.highlyRatedOnly ? HIGHLY_RATED : undefined,
    }),
    [filters],
  );

  /** How many of the filters the server is being asked to answer. */
  const serverFilterCount =
    filters.languages.length +
    filters.lengths.length +
    (filters.membershipOnly ? 1 : 0) +
    (filters.highlyRatedOnly ? 1 : 0);

  /** Does this row satisfy the filters the query already asked for? */
  const matchesQuery = useCallback(
    (book: CatalogBook) => {
      if (filters.languages.length > 0) {
        // The recorded column, and the old script guess only where a
        // deployment has not got one. The guess reads romanised Urdu as
        // English and cannot see Arabic at all, which is what the column fixed.
        const language =
          book.language ?? (isUrduTitle(book.title) ? 'urdu' : 'english');
        if (!filters.languages.includes(language)) {
          return false;
        }
      }

      if (filters.lengths.length > 0) {
        const bucket = book.lengthBucket ?? estimateBucket(book.readTime);
        if (!bucket || !filters.lengths.includes(bucket)) {
          return false;
        }
      }

      if (filters.membershipOnly && !book.isPremium) {
        return false;
      }

      if (filters.highlyRatedOnly && (book.rating ?? 0) < HIGHLY_RATED) {
        return false;
      }

      return true;
    },
    [filters],
  );

  /**
   * Narrows the page that came back, and says what the count now means.
   *
   * The four query filters are re-checked here rather than trusted, because
   * "the parameter was sent" and "the parameter was applied" are different
   * facts: a deployment can carry the `language` column on its cards while its
   * endpoint still ignores `?language=`, which is exactly the state production
   * was in when this was written. Re-checking is cheap — one pass over a page
   * of twenty — and it is the only way to be sure the reader is looking at what
   * they asked for.
   *
   * What the check *costs* is the count. If nothing was dropped, the backend
   * had already done the work and its `totalCount` is the true number of
   * matches. If rows were dropped, the query was not applied and the only
   * honest number is the one on screen. `countIsLocal` carries that distinction
   * up to the list, which also uses it to decide whether a thin page means "no
   * more matches" or "fetch the next one".
   *
   * Once the backend filters, this stops dropping anything and the list quietly
   * goes back to the server's own count.
   */
  const apply = useCallback(
    (books: CatalogBook[]): AppliedFilters => {
      const matching = serverFilterCount === 0 ? books : books.filter(matchesQuery);
      const serverHonoured = matching.length === books.length;

      const rows = filters.downloadedOnly
        ? matching.filter(book => downloadedIds?.has(book.id))
        : matching;

      return {
        rows,
        countIsLocal: filters.downloadedOnly || !serverHonoured,
      };
    },
    [downloadedIds, filters.downloadedOnly, matchesQuery, serverFilterCount],
  );

  const tokens = useMemo(() => activeTokens(filters), [filters]);

  return {
    filters,
    tokens,
    activeCount: tokens.length,
    serverFilters,
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
