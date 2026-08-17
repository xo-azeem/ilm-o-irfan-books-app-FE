import { coverColors } from '@/theme/palette';

export type CatalogListRow = {
  id: string;
  title: string;
  author_name: string;
  cover_path: string | null;
  cover_color: string | null;
  cover_color_dark: string | null;
  rating: number | string | null;
  tag: string | null;
  genre: string | null;
  read_time_minutes: number | null;
  price_cents: number;
  currency: string;
  format: string;
  is_premium: boolean;
  description?: string;
};

const fallbackCover = coverColors.forest;

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
export function asNumber(value: number | string | null | undefined): number | undefined {
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

export function authorName(
  authors: { name: string } | { name: string }[] | null | undefined,
): string {
  if (!authors) {
    return 'Unknown';
  }
  if (Array.isArray(authors)) {
    return authors[0]?.name ?? 'Unknown';
  }
  return authors.name;
}

export function mapCatalogBook(
  row: CatalogListRow,
  coverUrl?: string,
) {
  return {
    id: row.id,
    title: row.title,
    author: row.author_name,
    description: row.description ?? `A thoughtful read by ${row.author_name}.`,
    coverColor: row.cover_color ?? fallbackCover.light,
    coverColorDark: row.cover_color_dark ?? fallbackCover.dark,
    coverUrl,
    rating: asNumber(row.rating),
    tag: row.tag ?? undefined,
    genre: row.genre ?? 'Islamic Studies',
    readTime: formatReadTime(row.read_time_minutes),
    price: centsToAmount(asNumber(row.price_cents) ?? 0),
    currency: row.currency,
    format: row.format,
    isPremium: row.is_premium,
  };
}
