import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { mmkvStorage } from '@/stores/storage';

/**
 * How a long list of books is laid out: one book per row with its author,
 * length and access, or a grid of covers with the title beneath.
 *
 * One preference for every list — Discover, a collection, the Trending and
 * New arrivals pages, "Because you read" — so switching it on one of them
 * switches it everywhere. It is a way of looking at the shelf, not a
 * property of any one shelf.
 */
export const BOOK_LIST_LAYOUTS = ['list', 'tiles'] as const;

export type BookListLayout = (typeof BOOK_LIST_LAYOUTS)[number];

export const DEFAULT_BOOK_LIST_LAYOUT: BookListLayout = 'list';

type BookListState = {
  layout: BookListLayout;
  setLayout: (layout: BookListLayout) => void;
};

export const useBookListStore = create<BookListState>()(
  persist(
    set => ({
      layout: DEFAULT_BOOK_LIST_LAYOUT,
      setLayout: layout => set({ layout }),
    }),
    {
      name: 'ilm-book-list-layout',
      storage: createJSONStorage(() => mmkvStorage),
      version: 1,
      partialize: state => ({ layout: state.layout }),
      // A persisted value outlives the code that wrote it; anything not
      // recognised falls back to the default rather than being trusted.
      migrate: persisted => {
        const saved = (persisted ?? {}) as Partial<BookListState>;
        return {
          layout: BOOK_LIST_LAYOUTS.includes(saved.layout as BookListLayout)
            ? (saved.layout as BookListLayout)
            : DEFAULT_BOOK_LIST_LAYOUT,
        };
      },
    },
  ),
);
