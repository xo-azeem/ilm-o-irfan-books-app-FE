import { getLocale } from '@/i18n/current';
import { LOCALE_META, type Locale } from '@/i18n/locale';

import { en } from './en';
import { ur } from './ur';

export type Strings = typeof en;

const DICTIONARIES: Record<Locale, Strings> = { en, ur };

/**
 * The copy in a language — the current one unless another is named. For
 * code with no React in it; components read `useStrings()` so they re-render
 * when the language changes.
 */
export function strings(locale: Locale = getLocale()): Strings {
  return DICTIONARIES[locale];
}

/** The BCP 47 tag dates and numbers are formatted with, outside React. */
export function dateLocale(locale: Locale = getLocale()): string {
  return LOCALE_META[locale].tag;
}
