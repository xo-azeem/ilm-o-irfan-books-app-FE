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
import { APP_VERSION } from '@/config/appVersion';
import type { ProfileStackScreen } from '@/features/profile/navigation/types';

/** The settings rows, keyed to their labels in `profile.settings.rows`. */
export type ProfileRowId =
  | 'personal'
  | 'subscription'
  | 'downloads'
  | 'notifications'
  | 'appearance'
  | 'language'
  | 'help'
  | 'privacy';

export type ProfileGroupId = 'account' | 'preferences' | 'support';

export type ProfileRow = {
  id: ProfileRowId;
  icon?: LucideIcon;
  iconTone?: IconTileTone;
  screen?: ProfileStackScreen;
};

export type ProfileGroup = {
  id: ProfileGroupId;
  rows: ProfileRow[];
};

/**
 * The settings menu — exactly the four groups the app has always had, with the
 * coloured icon tiles kept. It renders beneath the reading record on the profile
 * tab, so this data is only navigation; the words come from the dictionary.
 */
export const profileGroups: ProfileGroup[] = [
  {
    id: 'account',
    rows: [
      {
        id: 'personal',
        icon: UserRound,
        iconTone: 'primary',
        screen: 'PersonalDetails',
      },
      {
        id: 'subscription',
        icon: CreditCard,
        iconTone: 'gold',
        screen: 'Subscription',
      },
      {
        id: 'downloads',
        icon: Download,
        iconTone: 'primary',
        screen: 'Downloads',
      },
    ],
  },
  {
    id: 'preferences',
    rows: [
      {
        id: 'notifications',
        icon: Bell,
        iconTone: 'lime',
        screen: 'Notifications',
      },
      {
        id: 'appearance',
        icon: Moon,
        iconTone: 'primary',
        screen: 'Appearance',
      },
      {
        id: 'language',
        icon: Globe,
        iconTone: 'lime',
        screen: 'Language',
      },
    ],
  },
  {
    id: 'support',
    rows: [
      {
        id: 'help',
        icon: CircleHelp,
        iconTone: 'neutral',
        screen: 'HelpCenter',
      },
      {
        id: 'privacy',
        icon: Shield,
        iconTone: 'neutral',
        screen: 'PrivacySecurity',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Privacy
// ---------------------------------------------------------------------------

/** Labelled by `account.privacy.rows`. */
export const accountSecurityRows = [
  'sign-in-methods',
  'change-email',
  'change-password',
  'devices',
  'export',
] as const;

export type AccountSecurityRowId = (typeof accountSecurityRows)[number];

/** Labelled by `account.privacy.legalRows`. */
export const legalRows = ['privacy-policy', 'terms'] as const;

export type LegalRowId = (typeof legalRows)[number];

// ---------------------------------------------------------------------------
// Help & about
// ---------------------------------------------------------------------------

/** The help topics live in the dictionary (`profile.help.topics`). */

export const supportContact = {
  email: 'support@ilmoirfan.com',
};

/** Labelled by `profile.help[id]`. */
export const aboutDetails: {
  id: 'version' | 'build' | 'platform';
  value: string;
}[] = [
  { id: 'version', value: APP_VERSION },
  { id: 'build', value: '2026.07.08' },
  { id: 'platform', value: 'React Native' },
];

// The standing membership pitch — for a deployment whose plans carry no
// `features[]` — lives in the dictionary (`account.paywall.benefits` and
// `account.subscription.includes`). Prices are deliberately absent from it:
// the only price the app may show is the store's own `priceString`.
