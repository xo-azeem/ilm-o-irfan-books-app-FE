import type { LucideIcon } from 'lucide-react-native';
import {
  Bell,
  BookOpen,
  Bookmark,
  CircleHelp,
  CreditCard,
  Download,
  Flame,
  Globe,
  Info,
  LogOut,
  Moon,
  Shield,
  Star,
  Sun,
  Smartphone,
  UserRound,
} from 'lucide-react-native';

import { coverColors, palette } from '@/theme/palette';
import type { ProfileStackScreen } from '@/features/profile/navigation/types';
import type { ThemePreference } from '@/stores/themeStore';

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

export type ProfileAchievement = {
  id: string;
  label: string;
  value: string;
  caption: string;
  icon: LucideIcon;
  accent: string;
  accentDark: string;
};

export type ProfileRow = {
  id: string;
  label: string;
  value?: string;
  icon: LucideIcon;
  accent: string;
  accentDark: string;
  destructive?: boolean;
  screen?: ProfileStackScreen;
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

export const profileAchievements: ProfileAchievement[] = [
  {
    id: 'achievement-streak',
    label: 'Day streak',
    value: '5',
    caption: 'Keep the momentum',
    icon: Flame,
    accent: palette.sunflower,
    accentDark: palette.sunflower,
  },
  {
    id: 'achievement-saved',
    label: 'Saved',
    value: '9',
    caption: 'In your library',
    icon: Bookmark,
    accent: palette.green,
    accentDark: palette.yellowGreen,
  },
];

export const profileLessonsSummary = {
  label: 'Lessons',
  value: profileStats.find(stat => stat.id === 'stat-lessons')?.value ?? '0',
};

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
        screen: 'PersonalDetails',
      },
      {
        id: 'row-subscription',
        label: 'Subscription',
        value: 'Premium',
        icon: CreditCard,
        accent: '#C9940A',
        accentDark: palette.sunflower,
        screen: 'Subscription',
      },
      {
        id: 'row-downloads',
        label: 'Downloads',
        value: '6',
        icon: Download,
        accent: '#2A9B72',
        accentDark: '#4EC4A0',
        screen: 'Downloads',
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
        screen: 'Notifications',
      },
      {
        id: 'row-appearance',
        label: 'Appearance',
        icon: Moon,
        accent: '#4A9E5C',
        accentDark: '#72B878',
        screen: 'Appearance',
      },
      {
        id: 'row-language',
        label: 'Language',
        value: 'English',
        icon: Globe,
        accent: palette.yellowGreen,
        accentDark: palette.limelight,
        screen: 'Language',
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
        screen: 'HelpCenter',
      },
      {
        id: 'row-rate',
        label: 'Rate the app',
        icon: Star,
        accent: '#C9940A',
        accentDark: palette.sunflower,
        screen: 'RateApp',
      },
      {
        id: 'row-privacy',
        label: 'Privacy & security',
        icon: Shield,
        accent: '#2A9B72',
        accentDark: '#4EC4A0',
        screen: 'PrivacySecurity',
      },
      {
        id: 'row-about',
        label: 'About',
        value: 'v1.0.0',
        icon: Info,
        accent: '#4A9E5C',
        accentDark: '#72B878',
        screen: 'About',
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

export type PersonalDetails = {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export const personalDetailsDefaults: PersonalDetails = {
  fullName: profileUser.name,
  email: profileUser.email,
  phone: '+92 300 123 4567',
  dateOfBirth: '14 March 1996',
  addressLine1: '42 Garden Town',
  addressLine2: 'Block C, Street 7',
  city: 'Lahore',
  state: 'Punjab',
  postalCode: '54000',
  country: 'Pakistan',
};

export const personalDetailsFields = [
  { id: 'name', label: 'Full name', value: profileUser.name },
  { id: 'email', label: 'Email', value: profileUser.email },
  { id: 'phone', label: 'Phone', value: personalDetailsDefaults.phone },
  { id: 'location', label: 'Location', value: `${personalDetailsDefaults.city}, ${personalDetailsDefaults.country}` },
];

export const subscriptionPlan = {
  name: 'Premium',
  price: 'Rs 1,499 / month',
  renewsOn: 'Renews on 15 Aug 2026',
  features: [
    'Unlimited access to all books',
    'Offline downloads',
    'Audio lessons & highlights',
    'Early access to new releases',
  ],
};

export const downloadedBooks = [
  {
    id: 'dl1',
    title: 'Introduction to Usul al-Fiqh',
    author: 'Dr. Yasir Qadhi',
    size: '24 MB',
    coverColor: coverColors.forest.light,
    coverColorDark: coverColors.forest.dark,
  },
  {
    id: 'dl2',
    title: 'Seerah: Early Makkah',
    author: 'Sh. Yasir',
    size: '18 MB',
    coverColor: coverColors.lime.light,
    coverColorDark: coverColors.lime.dark,
  },
  {
    id: 'dl3',
    title: 'Purification of the Heart',
    author: 'Hamza Yusuf',
    size: '21 MB',
    coverColor: coverColors.olive.light,
    coverColorDark: coverColors.olive.dark,
  },
  {
    id: 'dl4',
    title: 'Inner Dimensions of Prayer',
    author: 'Ibn Qayyim',
    size: '16 MB',
    coverColor: coverColors.emerald.light,
    coverColorDark: coverColors.emerald.dark,
  },
  {
    id: 'dl5',
    title: 'Revival of the Sciences',
    author: 'Al-Ghazali',
    size: '29 MB',
    coverColor: coverColors.pine.light,
    coverColorDark: coverColors.pine.dark,
  },
  {
    id: 'dl6',
    title: 'Arabic Grammar Made Easy',
    author: 'Dr. V. Abdur Rahim',
    size: '14 MB',
    coverColor: coverColors.sage.light,
    coverColorDark: coverColors.sage.dark,
  },
];

export const helpTopics = [
  {
    id: 'help1',
    question: 'How do I download books for offline reading?',
    answer:
      'Open any book and tap the download icon on the reader screen. Downloaded titles appear under Profile → Downloads.',
  },
  {
    id: 'help2',
    question: 'Can I sync progress across devices?',
    answer:
      'Yes. Sign in with the same account on each device and your reading progress, highlights, and saved lessons will stay in sync.',
  },
  {
    id: 'help3',
    question: 'How do I manage my subscription?',
    answer:
      'Go to Profile → Subscription to view your plan, renewal date, and billing options.',
  },
  {
    id: 'help4',
    question: 'How do I change the app language?',
    answer:
      'Open Profile → Language and choose from the available languages. The app will apply your selection immediately.',
  },
];

export const languageOptions = [
  { id: 'en', label: 'English', description: 'Default' },
  { id: 'ur', label: 'Urdu', description: 'اردو' },
  { id: 'ar', label: 'Arabic', description: 'العربية' },
];

export type AppearanceOption = {
  id: ThemePreference;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const appearanceOptions: AppearanceOption[] = [
  {
    id: 'system',
    label: 'System',
    description: 'Match device settings',
    icon: Smartphone,
  },
  {
    id: 'light',
    label: 'Light',
    description: 'Always use light mode',
    icon: Sun,
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Always use dark mode',
    icon: Moon,
  },
];

export const privacyOptions = [
  {
    id: 'privacy-profile',
    label: 'Profile visibility',
    description: 'Show reading activity to friends',
    defaultValue: false,
  },
  {
    id: 'privacy-analytics',
    label: 'Usage analytics',
    description: 'Help improve the app with anonymous data',
    defaultValue: true,
  },
  {
    id: 'privacy-biometric',
    label: 'Biometric lock',
    description: 'Require Face ID or fingerprint to open',
    defaultValue: false,
  },
];

export const aboutDetails = [
  { id: 'about-version', label: 'Version', value: '1.0.0' },
  { id: 'about-build', label: 'Build', value: '2026.07.08' },
  { id: 'about-platform', label: 'Platform', value: 'React Native' },
  { id: 'about-support', label: 'Support', value: 'support@ilmoirfan.com' },
];
