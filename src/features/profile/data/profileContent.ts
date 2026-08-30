import type { LucideIcon } from 'lucide-react-native';
import {
  Bell,
  CircleHelp,
  CreditCard,
  Download,
  Globe,
  Moon,
  Shield,
  UserRound,
} from 'lucide-react-native';

import type { IconTileTone } from '@/components/ui';
import type { ProfileStackScreen } from '@/features/profile/navigation/types';

export type ProfileRow = {
  id: string;
  label: string;
  /** A live value shown on the right — "Premium", "English", "6". */
  value?: string;
  icon?: LucideIcon;
  iconTone?: IconTileTone;
  screen?: ProfileStackScreen;
};

export type ProfileGroup = {
  id: string;
  title: string;
  rows: ProfileRow[];
};

/**
 * The settings menu — exactly the four groups the app has always had, with the
 * coloured icon tiles kept. Statistics moved to their own screen, so this page
 * is only navigation.
 */
export const profileGroups: ProfileGroup[] = [
  {
    id: 'group-account',
    title: 'Account',
    rows: [
      {
        id: 'row-personal',
        label: 'Personal details',
        icon: UserRound,
        iconTone: 'primary',
        screen: 'PersonalDetails',
      },
      {
        id: 'row-subscription',
        label: 'Subscription',
        icon: CreditCard,
        iconTone: 'gold',
        screen: 'Subscription',
      },
      {
        id: 'row-downloads',
        label: 'Downloads',
        icon: Download,
        iconTone: 'primary',
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
        icon: Bell,
        iconTone: 'lime',
        screen: 'Notifications',
      },
      {
        id: 'row-appearance',
        label: 'Appearance',
        icon: Moon,
        iconTone: 'primary',
        screen: 'Appearance',
      },
      {
        id: 'row-language',
        label: 'Language',
        icon: Globe,
        iconTone: 'lime',
        screen: 'Language',
      },
    ],
  },
  {
    id: 'group-support',
    title: 'Support',
    rows: [
      { id: 'row-help', label: 'Help center', icon: CircleHelp, iconTone: 'neutral', screen: 'HelpCenter' },
      {
        id: 'row-privacy',
        label: 'Privacy & security',
        icon: Shield,
        iconTone: 'neutral',
        screen: 'PrivacySecurity',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationToggle = {
  id: string;
  label: string;
  description: string;
  defaultValue: boolean;
};

export type NotificationGroup = {
  id: string;
  title: string;
  toggles: NotificationToggle[];
};

export const notificationGroups: NotificationGroup[] = [
  {
    id: 'notif-reading',
    title: 'Reading',
    toggles: [
      {
        id: 'daily-reminder',
        label: 'Daily reminder',
        description: 'A gentle nudge to keep your streak going',
        defaultValue: true,
      },
      {
        id: 'reading-goals',
        label: 'Reading goals',
        description: 'Updates on your weekly progress',
        defaultValue: true,
      },
    ],
  },
  {
    id: 'notif-library',
    title: 'Library',
    toggles: [
      {
        id: 'new-releases',
        label: 'New book releases',
        description: 'When fresh titles are added',
        defaultValue: true,
      },
      {
        id: 'offers',
        label: 'Offers & updates',
        description: 'Occasional news from Ilm o Irfan',
        defaultValue: false,
      },
    ],
  },
];

export const quietHoursDefault = { from: '11:00 pm', to: '6:00 am' };

// ---------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------

export const languageOptions = [
  { id: 'en', label: 'English', description: 'Default' },
  { id: 'ur', label: 'Urdu', description: 'اردو', script: 'urdu' as const },
  { id: 'ar', label: 'Arabic', description: 'العربية', script: 'arabic' as const },
];

/**
 * Catalogue preferences, kept separate from interface language — the
 * distinction a mixed-script catalogue actually needs.
 */
export const catalogueToggles = [
  {
    id: 'urdu-first',
    label: 'Show Urdu titles first',
    description: 'Where a book has both scripts',
    defaultValue: true,
  },
  {
    id: 'hide-unreadable',
    label: "Hide books I can't read",
    description: 'Filters other languages out of Discover',
    defaultValue: false,
  },
];

// ---------------------------------------------------------------------------
// Privacy
// ---------------------------------------------------------------------------

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

export const accountSecurityRows = [
  { id: 'change-password', label: 'Change password' },
  { id: 'devices', label: 'Signed-in devices', value: '3' },
  { id: 'export', label: 'Download my data' },
];

export const legalRows = [
  { id: 'privacy-policy', label: 'Privacy policy' },
  { id: 'terms', label: 'Terms of use' },
];

// ---------------------------------------------------------------------------
// Help & about
// ---------------------------------------------------------------------------

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

export const supportContact = {
  email: 'support@ilmoirfan.com',
  replyTime: 'replies in 24h',
};

export const aboutDetails = [
  { id: 'about-version', label: 'Version', value: '1.0.0' },
  { id: 'about-build', label: 'Build', value: '2026.07.08' },
  { id: 'about-platform', label: 'Platform', value: 'React Native' },
];

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

export const membershipBenefits = [
  'Every book in the catalogue, unlimited',
  'Offline reading and downloads',
  'Early access to new releases',
  'Reading statistics and goals',
];

export const membershipPlans = [
  {
    id: 'yearly',
    name: 'Yearly',
    price: 'Rs 3,900',
    detail: 'Rs 325 / month, billed once',
    badge: 'BEST VALUE · SAVE 34%',
    recommended: true,
  },
  {
    id: 'monthly',
    name: 'Monthly',
    price: 'Rs 490',
    detail: 'Cancel any time',
    recommended: false,
  },
];

export const subscriptionIncludes = [
  'Unlimited access to all books',
  'Offline downloads',
  'Audio lessons & highlights',
  'Early access to new releases',
];
