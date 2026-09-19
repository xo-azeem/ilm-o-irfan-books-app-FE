import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  Card,
  SettingsGroup,
  SettingsRow,
  Text,
  UrduText,
} from '@/components/ui';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import {
  LOCALE_META,
  LOCALES,
  useLocaleStore,
  useStrings,
  type Locale,
} from '@/i18n';
import { useSaveLocale } from '@/hooks/useAccount';
import { useAuthStore } from '@/stores/authStore';
import { fontSize } from '@/theme/typography';

/**
 * Language.
 *
 * The interface language, applied the moment a row is tapped: every screen
 * reads its words through `useStrings`, so the whole app re-renders in the
 * new language without a restart. The reading language — which script leads
 * a book's title — is a separate choice, made on first run and kept in the
 * onboarding store, because a reader who wants an English interface may
 * still want Urdu titles to lead.
 */
export function LanguageScreen() {
  const s = useStrings();
  const locale = useLocaleStore(state => state.locale);
  const setLocale = useLocaleStore(state => state.setLocale);
  const client = useQueryClient();
  const signedIn = useAuthStore(state => Boolean(state.userId));
  const save = useSaveLocale();

  // The device remembers the choice on its own (MMKV, in the locale store);
  // a signed-in reader's account remembers it too, so their next device
  // starts in the same language. The few sentences the services write into
  // cached data — a read time, an unattributed author, "Page 6 of 424" —
  // were composed in the old language, so everything else is re-read in the
  // background once the switch is made. The profile is left out of that
  // sweep: the save owns its refetch, once the new language is on the server.
  const choose = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      setLocale(next);
      if (signedIn) {
        save.mutate(next);
      }
      void client.invalidateQueries({
        predicate: query => query.queryKey[0] !== 'profile',
      });
    },
    [client, locale, save, setLocale, signedIn],
  );

  return (
    <ProfileSubScreenLayout
      title={s.profile.language.title}
      subtitle={s.profile.language.subtitle}
    >
      <SettingsGroup>
        {LOCALES.map(option => (
          <LanguageRow
            key={option}
            locale={option}
            selected={locale === option}
            onSelect={choose}
          />
        ))}
      </SettingsGroup>

      <Card tone="alt" padded={15}>
        <Text size={12.5} leading={1.55} tone="muted">
          {s.profile.language.note}
        </Text>
      </Card>
    </ProfileSubScreenLayout>
  );
}

/**
 * One language, named in itself on the left and in the other language on
 * the right, so a reader who has landed in the wrong one can still find
 * their way back.
 */
function LanguageRow({
  locale,
  selected,
  onSelect,
}: {
  locale: Locale;
  selected: boolean;
  onSelect: (locale: Locale) => void;
}) {
  const s = useStrings();
  const meta = LOCALE_META[locale];

  return (
    <SettingsRow
      title={meta.native}
      subtitle={locale === 'en' ? s.profile.language.default : undefined}
      trailing={
        meta.script === 'urdu' ? (
          <Text size={fontSize.bodySmall} leading={1.3} tone="muted">
            {meta.foreign}
          </Text>
        ) : (
          <UrduText size={17} tone="muted">
            {meta.foreign}
          </UrduText>
        )
      }
      selected={selected}
      onPress={() => onSelect(locale)}
    />
  );
}
