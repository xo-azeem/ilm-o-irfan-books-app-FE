import { useCallback, useMemo, useState } from 'react';

import type { BookLanguage, BookLengthBucket } from '@/services/api/types';
import type {
  CatalogBook,
  CatalogFilters,
  CatalogSort,
} from '@/services/catalog';

/**
 * Discover's filter state — the single source of truth behind the filter
 * sheet, the subject panel and the chip row under the search field. All three
 * read this object and write it through the same actions, so a subject picked
 * on the panel is the same filter the sheet shows selected and the same chip
 * the reader can dismiss.
 *
 * Every filter but one is asked of the database, before `LIMIT`, which is what
 * makes the count on screen the real number of matches and paging a filtered
 * list the same operation as paging the whole catalogue:
 *
 *   · subject  — `book_categories`, as the `category` parameter
 *   · language — `books.language`, a recorded column and not a guess
 *   · length   — a bucket name whose boundaries the server owns
 *   · access   — `is_premium`, as `premium`
 *   · rating   — `rating >= minRating`
 *   · order    — `sort`, applied before the page is cut
 *
 * Nothing above re-checks any of them against the rows that come back. Filters
 * are applied before `LIMIT`/`OFFSET`, so a page that arrives is already the
 * answer; dropping a row from it here would contradict the `totalCount` and
 * `hasNextPage` that describe the very set it was cut from — and re-deriving a
 * language or a length bucket locally is precisely the guesswork the server-side
 * columns replaced.
 *
 * The one exception is `downloadedOnly`, which is this device's state: the
 * catalogue endpoints are public and unauthenticated and cannot know it. It was
 * deliberately declined as a parameter, so it is the only filter applied to the
 * rows after they arrive — and the only one that makes the count local.
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
  /**
   * The order the reader chose, or `null` for the server's own default —
   * newest while browsing, best match once they have typed.
   */
  sort: CatalogSort | null;
};

export const EMPTY_FILTERS: SearchFilters = {
  categoryId: null,
  languages: [],
  lengths: [],
  membershipOnly: false,
  downloadedOnly: false,
  highlyRatedOnly: false,
  sort: null,
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

/**
 * The orderings the sheet offers.
 *
 * `relevance` is not among them: it is what the backend already does with a
 * search term, and offering it as a choice while browsing would ask the
 * database to rank against nothing. Leaving the sort unset is how the reader
 * asks for it.
 */
export const SORTS: CatalogSort[] = ['newest', 'rating', 'title'];

export const SORT_LABELS: Record<CatalogSort, string> = {
  newest: 'Newest',
  rating: 'Top rated',
  title: 'Title A–Z',
  relevance: 'Best match',
};

/** The order the sheet lists them in. */
export const LANGUAGES: LanguageFilter[] = ['urdu', 'english', 'arabic'];
export const LENGTHS: LengthFilter[] = ['short', 'medium', 'long'];

/** The active filters, in the order the chip row shows them. */
export function activeTokens(filters: SearchFilters): FilterToken[] {
  return [
    ...(filters.categoryId
      ? [{ kind: 'category', value: filters.categoryId } as const]
      : []),
    ...filters.languages.map(value => ({ kind: 'language', value }) as const),
    ...filters.lengths.map(value => ({ kind: 'length', value }) as const),
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
   * True only when the downloaded toggle has narrowed the page, which is the
   * one case the backend's `totalCount` stops describing what is on screen and
   * the list has to count what it holds instead.
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
    (membershipOnly: boolean) =>
      setFilters(current => ({ ...current, membershipOnly })),
    [],
  );

  const setDownloadedOnly = useCallback(
    (downloadedOnly: boolean) =>
      setFilters(current => ({ ...current, downloadedOnly })),
    [],
  );

  const setHighlyRatedOnly = useCallback(
    (highlyRatedOnly: boolean) =>
      setFilters(current => ({ ...current, highlyRatedOnly })),
    [],
  );

  const setSort = useCallback(
    (sort: CatalogSort | null) => setFilters(current => ({ ...current, sort })),
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
      sort: filters.sort,
    }),
    [filters],
  );

  /**
   * Applies the one filter the backend cannot.
   *
   * Only `downloadedOnly` is left to do here, and only because it is this
   * device's state — `books-list` is public and unauthenticated and has no way
   * to know what this reader has on disk. A `downloaded` parameter was asked
   * for and deliberately declined; the rows come from `downloads-list`.
   *
   * Everything else arrives already narrowed. The page the backend sent *is*
   * the answer, so it is drawn as it came: re-checking a language or a length
   * here would mean re-deriving what the server decided, and dropping a row
   * would put the list at odds with the `totalCount` and `hasNextPage` that
   * describe the set the page was cut from.
   *
   * `countIsLocal` therefore says one thing only: whether the downloaded
   * toggle has narrowed the page, in which case the server's total no longer
   * describes what is on screen.
   */
  const apply = useCallback(
    (books: CatalogBook[]): AppliedFilters => {
      if (!filters.downloadedOnly) {
        return { rows: books, countIsLocal: false };
      }

      return {
        rows: books.filter(book => downloadedIds?.has(book.id)),
        countIsLocal: true,
      };
    },
    [downloadedIds, filters.downloadedOnly],
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
    setSort,
  };
}
