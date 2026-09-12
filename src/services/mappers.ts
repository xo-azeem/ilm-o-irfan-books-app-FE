import type { BookLanguage, BookLengthBucket } from '@/services/api/types';
import { coverColors } from '@/theme/palette';

/**
 * The list row every catalog surface maps from.
 *
 * Nullability follows `public.book_list_items`, which now joins authors with a
 * `left join`: a book with no author record returns `author_name: null` instead
 * of being dropped from the catalog entirely.
 */
export type CatalogListRow = {
  id: string;
  title: string;
  author_name: string | null;
  /** The raw Storage key. Prefer `coverUrl`, which the endpoints resolve. */
  cover_path: string | null;
  /** The endpoint's own resolved cover URL, absent on the fallback path. */
  coverUrl?: string | null;
  cover_color: string | null;
  cover_color_dark: string | null;
  rating: number | string | null;
  tag: string | null;
  genre: string | null;
  read_time_minutes: number | null;
  price_cents: number | string | null;
  currency: string | null;
  format: string | null;
  is_premium: boolean | null;
  description?: string | null;
  language?: BookLanguage | null;
  page_count?: number | null;
  length_bucket?: BookLengthBucket | null;
};

const fallbackCover = coverColors.forest;

export const UNKNOWN_AUTHOR = 'Unknown';
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_FORMAT = 'Digital edition';

export function stripStoragePrefix(path: string, prefix: string): string {
  return path.replace(new RegExp(`^${prefix}/`), '');
}

export function formatReadTime(minutes: number | null): string {
  if (!minutes) {
    return 'Read at your pace';
  }
  if (minutes < 60) {
    return `${minutes} min read`;
  }
  return `${Math.round(minutes / 60)} hr read`;
}

export function centsToAmount(cents: number): number {
  return cents / 100;
}

/** PostgREST often serializes `numeric` as a string. */
export function asNumber(
  value: number | string | null | undefined,
): number | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function isEntitlementActive(
  status: string | null | undefined,
  expiresAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (status !== 'active') {
    return false;
  }
  return !expiresAt || new Date(expiresAt).getTime() > now;
}

/**
 * Reads a display name out of any shape the backend uses for an author: the
 * flattened `author_name` column, a nested object, or PostgREST's array form.
 */
export function authorName(
  authors:
    | { name: string | null }
    | { name: string | null }[]
    | string
    | null
    | undefined,
): string {
  if (!authors) {
    return UNKNOWN_AUTHOR;
  }
  if (typeof authors === 'string') {
    return authors.trim() || UNKNOWN_AUTHOR;
  }
  if (Array.isArray(authors)) {
    return authors[0]?.name?.trim() || UNKNOWN_AUTHOR;
  }
  return authors.name?.trim() || UNKNOWN_AUTHOR;
}

export function mapCatalogBook(row: CatalogListRow, coverUrl?: string) {
  const author = authorName(row.author_name);

  return {
    id: row.id,
    title: row.title,
    author,
    // An unattributed book must not read "A thoughtful read by Unknown."
    description:
      row.description ??
      (author === UNKNOWN_AUTHOR
        ? 'A thoughtful read from the Ilm o Irfan library.'
        : `A thoughtful read by ${author}.`),
    coverColor: row.cover_color ?? fallbackCover.light,
    coverColorDark: row.cover_color_dark ?? fallbackCover.dark,
    coverUrl,
    rating: asNumber(row.rating),
    tag: row.tag ?? undefined,
    genre: row.genre ?? 'Islamic Studies',
    readTime: formatReadTime(row.read_time_minutes),
    price: centsToAmount(asNumber(row.price_cents) ?? 0),
    currency: row.currency ?? DEFAULT_CURRENCY,
    format: row.format ?? DEFAULT_FORMAT,
    isPremium: Boolean(row.is_premium),
    /** The recorded language, or `null` when the catalogue has not said. */
    language: row.language ?? null,
    /** A real count once a reader has opened the book; `null` before that. */
    pageCount: row.page_count ?? null,
    /**
     * Left `undefined` when the row did not carry the field at all, which is
     * how the app tells a server-filtered deployment from an older one. A book
     * the server could not bucket is `null`, which is a different answer.
     */
    lengthBucket: row.length_bucket,
  };
}
