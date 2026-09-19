import { useEffect, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useProfile, useSaveLocale } from '@/hooks/useAccount';
import { useLocaleStore } from '@/i18n/localeStore';
import type { Locale } from '@/i18n/locale';
import { useAuthStore } from '@/stores/authStore';

/**
 * Keeps the device's interface language and the account's in step.
 *
 * The device's choice lives in MMKV (the locale store) and is what every
 * screen reads; the account's lives on `profiles.locale` and rides along
 * with the profile read. Two moments matter:
 *
 *   - sign-in, on a device that has never seen this account: the account's
 *     language, if it has one, becomes the device's — so a reader who chose
 *     Urdu on their phone opens their tablet in Urdu. An account with no
 *     language yet takes the device's, so the choice is recorded from the
 *     first sign-in onward.
 *   - a change made on another device while this one is signed in: the next
 *     profile read carries a language different from the last one seen, and
 *     the device follows it.
 *
 * A change made on *this* device goes the other way (`LanguageScreen` →
 * `useSaveLocale`) and never comes back through here: the save writes the
 * new language into the cached profile first, so the value this effect sees
 * next is the one the device already has.
 */
export function LocaleSyncProvider({ children }: { children: ReactNode }) {
  const userId = useAuthStore(state => state.userId);
  const { data: profile } = useProfile();
  const locale = useLocaleStore(state => state.locale);
  const setLocale = useLocaleStore(state => state.setLocale);
  const client = useQueryClient();
  const save = useSaveLocale();

  // The account's language as last read, per account, so only a *change* on
  // the server moves the device — not every refetch of the same value.
  const seen = useRef<{ userId: string; locale: Locale | null } | null>(null);

  const serverLocale = profile?.locale;
  const saveLocale = save.mutate;

  useEffect(() => {
    if (!userId) {
      // Signed out: the next account to sign in is met afresh, even if it
      // is the same one — the device may have changed language meanwhile.
      seen.current = null;
      return;
    }
    if (serverLocale === undefined) {
      return;
    }

    const firstSight = seen.current?.userId !== userId;
    const changed = firstSight || seen.current?.locale !== serverLocale;
    seen.current = { userId, locale: serverLocale };
    if (!changed) {
      return;
    }

    if (serverLocale === null) {
      // Nothing on the account yet: this device's choice becomes it.
      if (firstSight) {
        saveLocale(locale);
      }
      return;
    }

    if (serverLocale !== locale) {
      setLocale(serverLocale);
      // Cached sentences the services composed — read times, "Page 6 of
      // 424" — are in the old language; re-read them in the background.
      void client.invalidateQueries({
        predicate: query => query.queryKey[0] !== 'profile',
      });
    }
    // `locale` is read, not watched: a local change is written to the server
    // by the screen that made it, and this effect answers to the server.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, saveLocale, serverLocale, setLocale, userId]);

  return children;
}
