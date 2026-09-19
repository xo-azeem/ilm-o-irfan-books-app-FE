import type { Strings } from '@/i18n';
import type { ReadingLanguage, ReadingRhythm } from '@/stores/onboardingStore';

/**
 * The subjects offered on first run. These mirror the catalogue's top-level
 * categories; Home rearranges its rows around whatever is chosen here. The
 * ids are what is persisted; the labels come from the dictionary so the
 * chips read in the interface language.
 */
export const ONBOARDING_SUBJECT_IDS = [
  'seerat',
  'tafseer',
  'fiqh',
  'hadith',
  'urdu-adab',
  'history',
  'philosophy',
  'education',
  'biography',
  'language',
] as const;

export type OnboardingSubjectId = (typeof ONBOARDING_SUBJECT_IDS)[number];

export function onboardingSubjects(
  s: Strings,
): { id: OnboardingSubjectId; label: string }[] {
  return ONBOARDING_SUBJECT_IDS.map(id => ({
    id,
    label: s.onboarding.subjects.labels[id],
  }));
}

export function readingLanguages(
  s: Strings,
): { value: ReadingLanguage; label: string }[] {
  return [
    { value: 'both', label: s.onboarding.readingLanguages.both },
    { value: 'urdu', label: s.onboarding.readingLanguages.urdu },
    { value: 'english', label: s.onboarding.readingLanguages.english },
  ];
}

/**
 * Reading rhythms. Each sets a daily goal and the hour the app is allowed to
 * nudge — which is why the copy describes a habit, not a number.
 */
const READING_RHYTHM_VALUES: ReadingRhythm[] = [
  'casual',
  'daily',
  'night-owl',
  'weekend',
  'scholar',
];

export function readingRhythms(
  s: Strings,
): { value: ReadingRhythm; label: string; detail: string }[] {
  return READING_RHYTHM_VALUES.map(value => ({
    value,
    ...s.onboarding.rhythm.options[value],
  }));
}
