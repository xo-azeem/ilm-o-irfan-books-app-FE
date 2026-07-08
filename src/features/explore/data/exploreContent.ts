import type { LucideIcon } from 'lucide-react-native';
import {
  BookMarked,
  Globe,
  Landmark,
  ScrollText,
  Sparkles,
  Scale,
} from 'lucide-react-native';

import { coverColors, palette } from '@/theme/palette';

export type BookItem = {
  id: string;
  title: string;
  author: string;
  coverColor: string;
  coverColorDark: string;
  rating?: number;
  tag?: string;
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

export const heroCarouselBooks: HeroCarouselBook[] = [
  {
    id: 'hero-1',
    title: 'Foundations of Tafsir',
    author: 'Dr. Yasir Qadhi',
    description:
      'A cinematic journey into the principles of Quranic interpretation — structured, clear, and deeply engaging.',
    readTime: '4 hr read',
    genre: 'Quranic Studies',
    coverColor: coverColors.forest.light,
    coverColorDark: coverColors.forest.dark,
    rating: 4.9,
    tag: "Editor's pick",
  },
  {
    id: 'hero-2',
    title: 'Revival of the Sciences',
    author: 'Al-Ghazali',
    description:
      'Rediscover the spiritual sciences through one of Islam\'s greatest thinkers.',
    readTime: '6 hr read',
    genre: 'Spirituality',
    coverColor: coverColors.pine.light,
    coverColorDark: coverColors.pine.dark,
    rating: 4.9,
    tag: 'Classic',
  },
  {
    id: 'hero-3',
    title: 'Seerah: The Prophetic Life',
    author: 'Sh. Yasir',
    description:
      'Walk through the life of the Prophet ﷺ with vivid storytelling and scholarly depth.',
    readTime: '5 hr read',
    genre: 'History',
    coverColor: coverColors.lime.light,
    coverColorDark: coverColors.lime.dark,
    rating: 4.7,
  },
  {
    id: 'hero-4',
    title: 'Inner Dimensions of Prayer',
    author: 'Ibn Qayyim',
    description:
      'Transform your salah with profound insights into presence, humility, and devotion.',
    readTime: '3 hr read',
    genre: 'Spirituality',
    coverColor: coverColors.emerald.light,
    coverColorDark: coverColors.emerald.dark,
    rating: 4.8,
  },
  {
    id: 'hero-5',
    title: 'Purification of the Heart',
    author: 'Hamza Yusuf',
    description:
      'A modern classic on cleansing the soul and nurturing sincerity in every action.',
    readTime: '4 hr read',
    genre: 'Self Development',
    coverColor: coverColors.olive.light,
    coverColorDark: coverColors.olive.dark,
    rating: 4.6,
    tag: 'Trending',
  },
];

export const featuredBook: HeroCarouselBook = heroCarouselBooks[0];

export const trendingBooks: BookItem[] = [
  {
    id: 't1',
    title: 'Inner Dimensions of Prayer',
    author: 'Ibn Qayyim',
    coverColor: coverColors.emerald.light,
    coverColorDark: coverColors.emerald.dark,
    rating: 4.8,
  },
  {
    id: 't2',
    title: 'Revival of the Sciences',
    author: 'Al-Ghazali',
    coverColor: coverColors.pine.light,
    coverColorDark: coverColors.pine.dark,
    rating: 4.9,
    tag: 'Classic',
  },
  {
    id: 't3',
    title: 'Seerah: The Prophetic Life',
    author: 'Sh. Yasir',
    coverColor: coverColors.lime.light,
    coverColorDark: coverColors.lime.dark,
    rating: 4.7,
  },
  {
    id: 't4',
    title: 'Purification of the Heart',
    author: 'Hamza Yusuf',
    coverColor: coverColors.olive.light,
    coverColorDark: coverColors.olive.dark,
    rating: 4.6,
  },
];

export const newArrivals: BookItem[] = [
  {
    id: 'n1',
    title: 'Usul al-Fiqh Essentials',
    author: 'Various',
    coverColor: coverColors.sage.light,
    coverColorDark: coverColors.sage.dark,
    tag: 'New',
  },
  {
    id: 'n2',
    title: 'Arabic Grammar Made Easy',
    author: 'Dr. V. Abdur Rahim',
    coverColor: coverColors.lime.light,
    coverColorDark: coverColors.lime.dark,
    tag: 'New',
  },
  {
    id: 'n3',
    title: 'Ethics in Islam',
    author: 'Tariq Ramadan',
    coverColor: coverColors.forest.light,
    coverColorDark: coverColors.forest.dark,
  },
];

export const categories: CategoryItem[] = [
  {
    id: 'c1',
    label: 'Quranic Studies',
    count: '128',
    icon: BookMarked,
    accent: palette.green,
    accentDark: palette.yellowGreen,
  },
  {
    id: 'c2',
    label: 'Spirituality',
    count: '84',
    icon: Sparkles,
    accent: '#7CB518',
    accentDark: palette.chartreuse,
  },
  {
    id: 'c3',
    label: 'History',
    count: '56',
    icon: Landmark,
    accent: '#C9940A',
    accentDark: palette.sunflower,
  },
  {
    id: 'c4',
    label: 'Fiqh & Law',
    count: '42',
    icon: Scale,
    accent: '#4A9E5C',
    accentDark: '#72B878',
  },
  {
    id: 'c5',
    label: 'Hadith',
    count: '67',
    icon: ScrollText,
    accent: palette.yellowGreen,
    accentDark: palette.limelight,
  },
  {
    id: 'c6',
    label: 'Arabic',
    count: '38',
    icon: Globe,
    accent: '#2A9B72',
    accentDark: '#4EC4A0',
  },
];

export const curatedCollections = [
  {
    id: 'col1',
    title: 'Beginner\'s Path',
    subtitle: '12 essential reads to start your journey',
    bookCount: 12,
    accent: palette.green,
  },
  {
    id: 'col2',
    title: 'Ramadan Reading List',
    subtitle: 'Reflections for the blessed month',
    bookCount: 8,
    accent: palette.sunflower,
  },
];

function toBookItem(book: BookItem): BookItem {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    coverColor: book.coverColor,
    coverColorDark: book.coverColorDark,
    rating: book.rating,
    tag: book.tag,
  };
}

export const searchCatalogBooks: BookItem[] = (() => {
  const seen = new Set<string>();
  const books: BookItem[] = [];

  for (const book of [...trendingBooks, ...newArrivals, ...heroCarouselBooks]) {
    if (seen.has(book.id)) {
      continue;
    }
    seen.add(book.id);
    books.push(toBookItem(book));
  }

  return books;
})();
