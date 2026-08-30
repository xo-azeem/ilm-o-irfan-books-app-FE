import { useCallback } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { mmkvStorage } from '@/stores/storage';

const MAX_RECENTS = 8;

type RecentSearchState = {
  recents: string[];
  remember: (term: string) => void;
  clear: () => void;
};

/**
 * Recent searches, persisted on the device only — they are a convenience, not
 * account data, so they never leave the phone.
 */
const useRecentSearchStore = create<RecentSearchState>()(
  persist(
    set => ({
      recents: [],
      remember: term => {
        const trimmed = term.trim();
        if (!trimmed) {
          return;
        }
        set(state => ({
          // Re-searching an old term moves it to the front rather than
          // duplicating it.
          recents: [
            trimmed,
            ...state.recents.filter(
              existing => existing.toLowerCase() !== trimmed.toLowerCase(),
            ),
          ].slice(0, MAX_RECENTS),
        }));
      },
      clear: () => set({ recents: [] }),
    }),
    {
      name: 'ilm-recent-searches',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);

export function useRecentSearches() {
  const recents = useRecentSearchStore(state => state.recents);
  const rememberTerm = useRecentSearchStore(state => state.remember);
  const clearAll = useRecentSearchStore(state => state.clear);

  const remember = useCallback((term: string) => rememberTerm(term), [rememberTerm]);
  const clear = useCallback(() => clearAll(), [clearAll]);

  return { recents, remember, clear };
}
