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

import type { BookLanguage } from '@/services/api/types';

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

/**
 * True for a book whose pages turn the other way.
 *
 * Urdu and Arabic are set right-to-left, and a book in either is bound on the
 * right: the free edge of a page is its left edge, and turning forward is
 * carrying that edge over to the right.
 *
 * The recorded language decides, and nothing else does. The title's script is
 * deliberately not consulted: an English translation is as often as not
 * titled in the script of the original, and a page that turns the wrong way
 * is a far worse mistake than a title set in the wrong face. A book nobody
 * has recorded a language for turns the way an English book does.
 */
export function readsRightToLeft(
  language: BookLanguage | null | undefined,
): boolean {
  return language === 'urdu' || language === 'arabic';
}
