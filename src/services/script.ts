/**
 * Script detection for book titles.
 *
 * The catalogue mixes scripts inside a single `title` column, and the redesign
 * needs to know which face to set a title in (Nastaliq or Latin) and which
 * titles to keep when the reader filters by reading language.
 *
 * NOTE: this distinguishes Arabic *script* from Latin, which covers Urdu vs
 * English — the split that actually matters for typesetting. Telling Urdu from
 * Arabic reliably needs a `books.language` column; until that exists, both fall
 * under `arabic-script` and the language filter offers Urdu / English only.
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
