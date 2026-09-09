import type { BookCard } from '@/api/types';
import type {
  BookItem,
  HeroCarouselBook,
  SearchCatalogBook,
} from '@/features/explore/data/exploreContent';
import { palette } from '@/theme/palette';

export function formatReadTime(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) {
    return '';
  }
  if (minutes < 60) {
    return `${minutes} min read`;
  }
  const hours = Math.round(minutes / 60);
  return `${hours} hr read`;
}

export function mapBookCard(book: BookCard): BookItem & {
  coverUrl: string | null;
  readTimeMinutes: number | null;
  genre: string | null;
  description?: string;
} {
  return {
    id: book.id,
    title: book.title,
    author: book.author_name ?? 'Unknown author',
    coverColor: book.cover_color ?? palette.green,
    coverColorDark: book.cover_color_dark ?? '#1A332C',
    rating: book.rating ?? undefined,
    tag: book.tag ?? undefined,
    coverUrl: book.coverUrl,
    readTimeMinutes: book.read_time_minutes,
    genre: book.genre,
    description: book.description ?? undefined,
  };
}

export function mapHeroBook(book: BookCard): HeroCarouselBook & { coverUrl: string | null } {
  const base = mapBookCard(book);
  return {
    ...base,
    description: book.description ?? book.genre ?? 'Featured title',
    readTime: formatReadTime(book.read_time_minutes),
    genre: book.genre ?? '',
  };
}

export function mapSearchBook(book: BookCard): SearchCatalogBook & { coverUrl: string | null } {
  const base = mapBookCard(book);
  return {
    ...base,
    description: book.description ?? book.genre ?? '',
  };
}
