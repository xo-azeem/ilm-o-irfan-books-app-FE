import type { LucideIcon } from 'lucide-react-native';
import {
  Bell,
  BookOpen,
  CircleHelp,
  CreditCard,
  Download,
  Globe,
  Info,
  LogOut,
  Moon,
  Shield,
  Star,
  UserRound,
} from 'lucide-react-native';

import { palette } from '@/theme/palette';

export type ProfileUser = {
  name: string;
  email: string;
  initials: string;
  memberSince: string;
  plan: string;
};

export type ProfileStat = {
  id: string;
  label: string;
  value: string;
};

export type ProfileRow = {
  id: string;
  label: string;
  value?: string;
  icon: LucideIcon;
  accent: string;
  accentDark: string;
  destructive?: boolean;
};

export type ProfileGroup = {
  id: string;
  title: string;
  rows: ProfileRow[];
};

export const profileUser: ProfileUser = {
  name: 'Ahmad Raza',
  email: 'ahmad.raza@email.com',
  initials: 'AR',
  memberSince: 'Member since 2024',
  plan: 'Premium',
};

export const profileStats: ProfileStat[] = [
  { id: 'stat-lessons', label: 'Lessons', value: '12' },
  { id: 'stat-streak', label: 'Day streak', value: '5' },
  { id: 'stat-saved', label: 'Saved', value: '9' },
];

export const profileGroups: ProfileGroup[] = [
  {
    id: 'group-account',
    title: 'Account',
    rows: [
      {
        id: 'row-personal',
        label: 'Personal details',
        icon: UserRound,
        accent: palette.green,
        accentDark: palette.yellowGreen,
      },
      {
        id: 'row-subscription',
        label: 'Subscription',
        value: 'Premium',
        icon: CreditCard,
        accent: '#C9940A',
        accentDark: palette.sunflower,
      },
      {
        id: 'row-downloads',
        label: 'Downloads',
        value: '6',
        icon: Download,
        accent: '#2A9B72',
        accentDark: '#4EC4A0',
      },
    ],
  },
  {
    id: 'group-preferences',
    title: 'Preferences',
    rows: [
      {
        id: 'row-notifications',
        label: 'Notifications',
        value: 'On',
        icon: Bell,
        accent: '#7CB518',
        accentDark: palette.chartreuse,
      },
      {
        id: 'row-appearance',
        label: 'Appearance',
        value: 'System',
        icon: Moon,
        accent: '#4A9E5C',
        accentDark: '#72B878',
      },
      {
        id: 'row-language',
        label: 'Language',
        value: 'English',
        icon: Globe,
        accent: palette.yellowGreen,
        accentDark: palette.limelight,
      },
    ],
  },
  {
    id: 'group-support',
    title: 'Support',
    rows: [
      {
        id: 'row-help',
        label: 'Help center',
        icon: CircleHelp,
        accent: palette.green,
        accentDark: palette.yellowGreen,
      },
      {
        id: 'row-rate',
        label: 'Rate the app',
        icon: Star,
        accent: '#C9940A',
        accentDark: palette.sunflower,
      },
      {
        id: 'row-privacy',
        label: 'Privacy & security',
        icon: Shield,
        accent: '#2A9B72',
        accentDark: '#4EC4A0',
      },
      {
        id: 'row-about',
        label: 'About',
        value: 'v1.0.0',
        icon: Info,
        accent: '#4A9E5C',
        accentDark: '#72B878',
      },
    ],
  },
  {
    id: 'group-session',
    title: '',
    rows: [
      {
        id: 'row-signout',
        label: 'Sign out',
        icon: LogOut,
        accent: '#D14343',
        accentDark: '#E86A6A',
        destructive: true,
      },
    ],
  },
];

export const readingHighlight = {
  icon: BookOpen,
  title: 'Ramadan reading goal',
  subtitle: '8 of 12 books completed',
  progress: 8 / 12,
};
