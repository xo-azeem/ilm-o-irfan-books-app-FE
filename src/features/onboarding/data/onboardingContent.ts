import type { ReadingLanguage, ReadingRhythm } from '@/stores/onboardingStore';

/**
 * The subjects offered on first run. These mirror the catalogue's top-level
 * categories; Home rearranges its rows around whatever is chosen here.
 */
export const ONBOARDING_SUBJECTS = [
  { id: 'seerat', label: 'Seerat' },
  { id: 'tafseer', label: 'Tafseer' },
  { id: 'fiqh', label: 'Fiqh' },
  { id: 'hadith', label: 'Hadith' },
  { id: 'urdu-adab', label: 'Urdu literature' },
  { id: 'history', label: 'History' },
  { id: 'philosophy', label: 'Philosophy' },
  { id: 'education', label: 'Education' },
  { id: 'biography', label: 'Biography' },
  { id: 'language', label: 'Language' },
] as const;

export const READING_LANGUAGES: { value: ReadingLanguage; label: string }[] = [
  { value: 'both', label: 'Both' },
  { value: 'urdu', label: 'اردو' },
  { value: 'english', label: 'English' },
];

/**
 * Reading rhythms. Each sets a daily goal and the hour the app is allowed to
 * nudge — which is why the copy describes a habit, not a number.
 */
export const READING_RHYTHMS: {
  value: ReadingRhythm;
  label: string;
  detail: string;
}[] = [
  { value: 'casual', label: 'Casual', detail: 'A few pages, now and then' },
  { value: 'daily', label: 'Daily', detail: '20 minutes every day' },
  { value: 'night-owl', label: 'Night owl', detail: 'After Isha, lights low' },
  { value: 'weekend', label: 'Weekend reader', detail: 'Long sittings, Friday to Sunday' },
  { value: 'scholar', label: 'Scholar', detail: 'Several books in parallel' },
];
