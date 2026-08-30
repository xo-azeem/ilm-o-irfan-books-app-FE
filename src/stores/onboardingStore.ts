import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { mmkvStorage } from '@/stores/storage';

/** Which script leads a book title app-wide. */
export type ReadingLanguage = 'both' | 'urdu' | 'english';

/** Sets the daily goal and when the app nudges. */
export type ReadingRhythm = 'casual' | 'daily' | 'night-owl' | 'weekend' | 'scholar';

type OnboardingState = {
  /** True once the reader has been through — or skipped — the first-run flow. */
  completed: boolean;
  subjects: string[];
  language: ReadingLanguage;
  rhythm: ReadingRhythm | null;
  /**
   * Set when the reader leaves first-run via "I already have an account", so
   * the app stack opens on sign-in rather than Home. Transient — never
   * persisted, because it describes one navigation, not a preference.
   */
  wantsSignIn: boolean;

  toggleSubject: (id: string) => void;
  setLanguage: (language: ReadingLanguage) => void;
  setRhythm: (rhythm: ReadingRhythm | null) => void;
  complete: () => void;
  /** Leaves first-run and asks the app stack to open on sign-in. */
  completeWithSignIn: () => void;
  clearSignInIntent: () => void;
  reset: () => void;
};

/** Home re-weights its rows once at least this many subjects are chosen. */
export const MIN_SUBJECTS = 3;

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    set => ({
      completed: false,
      subjects: [],
      language: 'both',
      rhythm: null,
      wantsSignIn: false,

      toggleSubject: id =>
        set(state => ({
          subjects: state.subjects.includes(id)
            ? state.subjects.filter(subject => subject !== id)
            : [...state.subjects, id],
        })),
      setLanguage: language => set({ language }),
      setRhythm: rhythm => set({ rhythm }),
      complete: () => set({ completed: true }),
      completeWithSignIn: () => set({ completed: true, wantsSignIn: true }),
      clearSignInIntent: () => set({ wantsSignIn: false }),
      reset: () =>
        set({
          completed: false,
          subjects: [],
          language: 'both',
          rhythm: null,
          wantsSignIn: false,
        }),
    }),
    {
      name: 'ilm-onboarding',
      storage: createJSONStorage(() => mmkvStorage),
      // `wantsSignIn` is a one-shot navigation intent, not a saved preference.
      partialize: state => ({
        completed: state.completed,
        subjects: state.subjects,
        language: state.language,
        rhythm: state.rhythm,
      }),
    },
  ),
);
