import type { LucideIcon } from 'lucide-react-native';

export type BookItem = {
  id: string;
  title: string;
  author: string;
  coverColor: string;
  coverColorDark: string;
  coverUrl?: string;
  rating?: number;
  tag?: string;
};

export type SearchCatalogBook = BookItem & {
  description: string;
};

export type HeroCarouselBook = BookItem & {
  description: string;
  readTime: string;
  genre: string;
};

export type CategoryItem = {
  id: string;
  label: string;
  count: string;
  icon: LucideIcon;
  accent: string;
  accentDark: string;
};
