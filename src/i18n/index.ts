import { useLocaleStore } from '@/i18n/localeStore';
import { LOCALE_META, type Locale } from '@/i18n/locale';
import { strings, type Strings } from '@/i18n/strings';

export {
  LOCALES,
  LOCALE_META,
  isArabicScript,
  type Locale,
} from '@/i18n/locale';
export { strings, dateLocale, type Strings } from '@/i18n/strings';
export { useLocaleStore } from '@/i18n/localeStore';

/**
 * The interface copy in the reader's language. Every screen reads its words
 * through this, so changing the language re-renders the whole app at once.
 *
 * Read it as `const s = useStrings()` and then `s.home.greeting` — the
 * dictionary is a typed object, so a missing key is a compile error and the
 * IDE completes the rest. Strings that take values are functions:
 * `s.reader.pageOf(page, total)`.
 */
export function useStrings(): Strings {
  const locale = useLocaleStore(state => state.locale);
  return strings(locale);
}

export function useLocale(): Locale {
  return useLocaleStore(state => state.locale);
}

/** The BCP 47 tag `toLocaleDateString` and friends are given. */
export function useDateLocale(): string {
  const locale = useLocaleStore(state => state.locale);
  return LOCALE_META[locale].tag;
}
