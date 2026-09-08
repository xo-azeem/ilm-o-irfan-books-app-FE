/**
 * Script detection for book titles.
 *
 * The catalogue mixes scripts inside a single `title` column, and the redesign
 * needs to know which face to set a title in (Nastaliq or Latin) and which
 * titles to keep when the reader filters by reading language.
 *
 * NOTE: this distinguishes Arabic *script* from Latin, which is the split that
 * matters for typesetting, and it is now used for nothing else. Language is a
 * recorded column — `books.language`, one of urdu / english / arabic — because
 * the script of a title cannot tell you the language of the work: a romanised
 * Urdu title like "Jannat Ki Talash" is Latin script and an Urdu book.
 */

/** Arabic block, Arabic Supplement, Extended-A, and the Arabic presentation forms. */
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

export type TitleScript = 'arabic-script' | 'latin';

export function scriptOf(text: string | null | undefined): TitleScript {
  return text && ARABIC_SCRIPT.test(text) ? 'arabic-script' : 'latin';
}

/** True when a title should be set in Nastaliq and read right-to-left. */
export function isUrduTitle(title: string | null | undefined): boolean {
  return scriptOf(title) === 'arabic-script';
}
