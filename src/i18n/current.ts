import { DEFAULT_LOCALE, type Locale } from '@/i18n/locale';

/**
 * The interface language, held where code with no React and no storage can
 * read it: services composing an error message, a formatter naming a month.
 * The locale store writes it here on hydration and on every change; nothing
 * else does. Kept apart from the store so this module has no native imports
 * and the code that reads it stays testable.
 */
let current: Locale = DEFAULT_LOCALE;

const listeners = new Set<(locale: Locale) => void>();

export function getLocale(): Locale {
  return current;
}

export function setCurrentLocale(locale: Locale): void {
  if (locale === current) return;
  current = locale;
  listeners.forEach(listener => listener(locale));
}

export function onLocaleChange(listener: (locale: Locale) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
