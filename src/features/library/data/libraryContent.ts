import type { LucideIcon } from 'lucide-react-native';
import {
  Bookmark,
  CheckCircle2,
  Clock3,
  Download,
  Heart,
  Highlighter,
} from 'lucide-react-native';

import { coverColors, palette } from '@/theme/palette';

export type LibraryBook = {
  id: string;
  title: string;
  author: string;
  coverColor: string;
  coverColorDark: string;
};

export type ReadingBook = LibraryBook & {
  chapter: string;
  timeLeft: string;
  progress: number;
};

export type LibraryStat = {
  id: string;
  label: string;
  value: string;
};

export type LibraryShelf = {
  id: string;
  label: string;
  count: string;
  icon: LucideIcon;
  accent: string;
  accentDark: string;
};

export const inProgressBooks: ReadingBook[] = [
  {
    id: 'lib-continue',
    title: 'Introduction to Usul al-Fiqh',
    author: 'Dr. Yasir Qadhi',
    chapter: 'Chapter 4 · The Sources of Law',
    timeLeft: '18 min left in this chapter',
    progress: 0.35,
    coverColor: coverColors.forest.light,
    coverColorDark: coverColors.forest.dark,
  },
  {
    id: 'ip1',
    title: 'Seerah: Early Makkah',
    author: 'Sh. Yasir',
    chapter: 'Chapter 6 of 9',
    timeLeft: '42 min left',
    progress: 0.62,
    coverColor: coverColors.lime.light,
    coverColorDark: coverColors.lime.dark,
  },
  {
    id: 'ip2',
    title: 'Purification of the Heart',
    author: 'Hamza Yusuf',
    chapter: 'Lesson 2 of 10',
    timeLeft: '32 min left',
    progress: 0.2,
    coverColor: coverColors.olive.light,
    coverColorDark: coverColors.olive.dark,
  },
  {
    id: 'ip3',
    title: 'Inner Dimensions of Prayer',
    author: 'Ibn Qayyim',
    chapter: 'Chapter 3 of 7',
    timeLeft: '1 hr 5 min left',
    progress: 0.44,
    coverColor: coverColors.emerald.light,
    coverColorDark: coverColors.emerald.dark,
  },
];

export const continueReading = inProgressBooks[0]!;

export const readingStats: LibraryStat[] = [
  { id: 'stat-reading', label: 'Reading', value: '3' },
  { id: 'stat-finished', label: 'Finished', value: '12' },
  { id: 'stat-streak', label: 'Day streak', value: '5' },
];

export const libraryShelves: LibraryShelf[] = [
  {
    id: 'shelf-saved',
    label: 'Saved lessons',
    count: '14',
    icon: Bookmark,
    accent: palette.green,
    accentDark: palette.yellowGreen,
  },
  {
    id: 'shelf-downloaded',
    label: 'Downloaded',
    count: '6',
    icon: Download,
    accent: '#2A9B72',
    accentDark: '#4EC4A0',
  },
  {
    id: 'shelf-highlights',
    label: 'Highlights & notes',
    count: '38',
    icon: Highlighter,
    accent: '#C9940A',
    accentDark: palette.sunflower,
  },
  {
    id: 'shelf-finished',
    label: 'Finished',
    count: '12',
    icon: CheckCircle2,
    accent: '#4A9E5C',
    accentDark: '#72B878',
  },
  {
    id: 'shelf-wishlist',
    label: 'Wishlist',
    count: '9',
    icon: Heart,
    accent: '#7CB518',
    accentDark: palette.chartreuse,
  },
  {
    id: 'shelf-history',
    label: 'Reading history',
    count: '',
    icon: Clock3,
    accent: palette.yellowGreen,
    accentDark: palette.limelight,
  },
];

export const finishedBooks: LibraryBook[] = [
  {
    id: 'fin1',
    title: 'Revival of the Sciences',
    author: 'Al-Ghazali',
    coverColor: coverColors.pine.light,
    coverColorDark: coverColors.pine.dark,
  },
  {
    id: 'fin2',
    title: 'Ethics in Islam',
    author: 'Tariq Ramadan',
    coverColor: coverColors.forest.light,
    coverColorDark: coverColors.forest.dark,
  },
  {
    id: 'fin3',
    title: 'Arabic Grammar Made Easy',
    author: 'Dr. V. Abdur Rahim',
    coverColor: coverColors.lime.light,
    coverColorDark: coverColors.lime.dark,
  },
  {
    id: 'fin4',
    title: 'Usul al-Fiqh Essentials',
    author: 'Various',
    coverColor: coverColors.sage.light,
    coverColorDark: coverColors.sage.dark,
  },
];
