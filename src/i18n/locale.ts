/**
 * The languages the interface can be read in.
 *
 * Declared as an array rather than a bare union so the persisted value can be
 * checked against the same list the type is built from. English is the
 * fallback everywhere: a locale that is not recognised reads as English.
 */
export const LOCALES = ['en', 'ur'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export type LocaleMeta = {
  /** The language named in itself, which is how a language list reads. */
  native: string;
  /**
   * The same named in the other language, so a reader who has landed in the
   * wrong one can still find their way back.
   */
  foreign: string;
  /** Which face the interface is set in. */
  script: 'latin' | 'urdu';
  /** The BCP 47 tag dates and numbers are formatted with. */
  tag: string;
};

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { native: 'English', foreign: 'انگریزی', script: 'latin', tag: 'en-GB' },
  ur: { native: 'اردو', foreign: 'Urdu', script: 'urdu', tag: 'ur-PK' },
};

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

/** Arabic block, Supplement, Extended-A and the presentation forms. */
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

/**
 * True when a run of text is in the Arabic script — Urdu, Arabic, Persian —
 * and so needs the Nastaliq face, right-to-left direction and no tracking.
 * Decided on the text itself rather than the interface language, because an
 * Urdu interface still shows English book titles and addresses, and an
 * English one still shows Urdu ones.
 */
export function isArabicScript(text: string | null | undefined): boolean {
  return !!text && ARABIC_SCRIPT.test(text);
}
