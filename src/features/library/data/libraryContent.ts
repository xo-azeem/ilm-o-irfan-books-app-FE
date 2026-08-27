import type { LucideIcon } from 'lucide-react-native';
import {
  Bookmark,
  CheckCircle2,
  Clock3,
  Download,
  Heart,
  Highlighter,
} from 'lucide-react-native';

import { palette } from '@/theme/palette';

export type LibraryBook = {
  id: string;
  title: string;
  author: string;
  coverColor: string;
  coverColorDark: string;
  coverUrl?: string;
};

export type ReadingBook = LibraryBook & {
  chapter: string;
  timeLeft: string;
  progress: number;
};

export type LibraryShelf = {
  id: string;
  label: string;
  count: string;
  icon: LucideIcon;
  accent: string;
  accentDark: string;
};

export const libraryShelves: LibraryShelf[] = [
  {
    id: 'shelf-saved',
    label: 'Saved lessons',
    count: '0',
    icon: Bookmark,
    accent: palette.green,
    accentDark: palette.yellowGreen,
  },
  {
    id: 'shelf-downloaded',
    label: 'Downloaded',
    count: '0',
    icon: Download,
    accent: '#2A9B72',
    accentDark: '#4EC4A0',
  },
  {
    id: 'shelf-highlights',
    label: 'Highlights & notes',
    count: '0',
    icon: Highlighter,
    accent: '#C9940A',
    accentDark: palette.sunflower,
  },
  {
    id: 'shelf-finished',
    label: 'Finished',
    count: '0',
    icon: CheckCircle2,
    accent: '#4A9E5C',
    accentDark: '#72B878',
  },
  {
    id: 'shelf-wishlist',
    label: 'Wishlist',
    count: '0',
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
