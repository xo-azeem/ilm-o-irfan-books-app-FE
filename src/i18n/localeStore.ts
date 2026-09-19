import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { setCurrentLocale } from '@/i18n/current';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/i18n/locale';
import { mmkvStorage } from '@/stores/storage';

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

/**
 * The interface language, kept apart from the theme store so a bad theme
 * record can never take the language with it, and read synchronously from
 * MMKV so the first frame is already in the right language.
 */
export const useLocaleStore = create<LocaleState>()(
  persist(
    set => ({
      locale: DEFAULT_LOCALE,
      setLocale: locale => {
        setCurrentLocale(locale);
        set({ locale });
      },
    }),
    {
      name: 'ilm-locale',
      storage: createJSONStorage(() => mmkvStorage),
      version: 1,
      partialize: state => ({ locale: state.locale }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<LocaleState>;
        return {
          ...current,
          locale: isLocale(saved.locale) ? saved.locale : DEFAULT_LOCALE,
        };
      },
      // Synchronous with MMKV, so services read the saved language before
      // the first screen asks them for anything.
      onRehydrateStorage: () => state => {
        setCurrentLocale(state?.locale ?? DEFAULT_LOCALE);
      },
    },
  ),
);
