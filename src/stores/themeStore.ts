import { Appearance } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { mmkvStorage } from '@/stores/storage';
import { FONT_SCALE_ORDER, type FontScale } from '@/theme/typography';

/**
 * Declared as arrays rather than bare unions so `migrate` can check a persisted
 * value against the same list the type is built from — the two cannot drift.
 */
export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

/** The reader's page tone, applied to every book they open. */
export const PAGE_TONES = ['paper', 'sepia', 'midnight'] as const;

export type PageTone = (typeof PAGE_TONES)[number];

/**
 * How a book moves under the finger.
 *
 * `swipe` carries one page off and the next on, `flip` folds the page over on
 * its spine the way paper does, and `scroll` runs the whole book as one
 * continuous column. The first two are a page at a time and differ only in the
 * motion; the last is a different way of holding the book.
 */
export const READING_MODE_VALUES = ['swipe', 'flip', 'scroll'] as const;

export type ReadingMode = (typeof READING_MODE_VALUES)[number];

export const READING_MODES: { value: ReadingMode; label: string }[] = [
  { value: 'swipe', label: 'Swipe' },
  { value: 'flip', label: 'Flip' },
  { value: 'scroll', label: 'Scroll' },
];

/**
 * What each mode is called where there is room to say it.
 *
 * A three-letter segment cannot describe a page turn, so both places that
 * offer the choice say more beside it — the reader's own sheet in a word or
 * two, the Appearance screen in a line. Kept here with the modes themselves so
 * adding a fourth cannot leave either of them describing the wrong thing.
 */
export const READING_MODE_TAGS: Record<ReadingMode, string> = {
  swipe: 'PAGE BY PAGE',
  flip: 'PAPER FLIP',
  scroll: 'ONE COLUMN',
};

export const READING_MODE_HINTS: Record<ReadingMode, string> = {
  swipe: 'One page at a time, turned sideways',
  flip: 'Pages fold over on the spine, the way paper does',
  scroll: 'The book runs as one column you scroll',
};

type ThemeState = {
  themePreference: ThemePreference;
  /**
   * The app-wide text size. Resolved once by ThemeStateProvider and handed to
   * the whole tree through theme context, so every `Text` already subscribed
   * to the palette picks it up without a subscription of its own.
   */
  fontScale: FontScale;
  /** Reading defaults live here so the reader sheet and Appearance agree. */
  pageTone: PageTone;
  readingMode: ReadingMode;
  keepScreenAwake: boolean;

  setThemePreference: (preference: ThemePreference) => void;
  setFontScale: (scale: FontScale) => void;
  setPageTone: (tone: PageTone) => void;
  setReadingMode: (mode: ReadingMode) => void;
  setKeepScreenAwake: (value: boolean) => void;
};

export function applyThemePreference(preference: ThemePreference) {
  try {
    // RN 0.82+ removed nullable support; 'unspecified' resets to the system
    // theme. Wrapped defensively so a native failure never crashes the app.
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  } catch (error) {
    if (__DEV__) {
      console.warn('[theme] Failed to apply color scheme', error);
    }
  }
}

type ThemeSettings = Pick<
  ThemeState,
  'themePreference' | 'fontScale' | 'pageTone' | 'readingMode' | 'keepScreenAwake'
>;

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/**
 * Persisted preferences outlive the code that wrote them, and these values are
 * load-bearing: a bad `fontScale` reaches every glyph in the app through theme
 * context, and a bad `themePreference` reaches every surface. Anything not
 * recognised falls back to its default rather than being trusted.
 */
function sanitizeSettings(persisted: unknown): ThemeSettings {
  const saved = (persisted ?? {}) as Partial<ThemeSettings>;

  return {
    themePreference: pick(saved.themePreference, THEME_PREFERENCES, 'dark'),
    fontScale: pick(saved.fontScale, FONT_SCALE_ORDER, 'default'),
    pageTone: pick(saved.pageTone, PAGE_TONES, 'sepia'),
    readingMode: pick(saved.readingMode, READING_MODE_VALUES, 'swipe'),
    keepScreenAwake:
      typeof saved.keepScreenAwake === 'boolean' ? saved.keepScreenAwake : true,
  };
}

export const useThemeStore = create<ThemeState>()(
  persist(
    set => ({
      // The board is a dark product — every artboard is drawn on #080B09, and
      // its own Appearance screen shows Dark as the active choice. Following
      // the device instead would hand a first-run reader on a light phone a
      // palette the design never specifies. Readers can still pick System.
      themePreference: 'dark',
      fontScale: 'default',
      pageTone: 'sepia',
      readingMode: 'swipe',
      keepScreenAwake: true,

      setThemePreference: preference => {
        applyThemePreference(preference);
        set({ themePreference: preference });
      },
      setFontScale: fontScale => set({ fontScale }),
      setPageTone: pageTone => set({ pageTone }),
      setReadingMode: readingMode => set({ readingMode }),
      setKeepScreenAwake: keepScreenAwake => set({ keepScreenAwake }),
    }),
    {
      name: 'ilm-theme-preference',
      storage: createJSONStorage(() => mmkvStorage),
      version: 1,

      // Only the settings are written back. Without this the setters are handed
      // to JSON.stringify on every change just to be dropped again.
      partialize: state => ({
        themePreference: state.themePreference,
        fontScale: state.fontScale,
        pageTone: state.pageTone,
        readingMode: state.readingMode,
        keepScreenAwake: state.keepScreenAwake,
      }),

      migrate: persisted => sanitizeSettings(persisted),

      // `migrate` only fires when the version changes, but a stored value can be
      // wrong on any launch — hand-edited storage, a downgrade, a half-written
      // record. `merge` runs on every hydration, so validation lives here and
      // the version stays free for real schema moves.
      merge: (persisted, current) => ({ ...current, ...sanitizeSettings(persisted) }),

      // Runs synchronously with MMKV, so the saved theme is applied to the
      // native Appearance before the first frame paints.
      onRehydrateStorage: () => state => {
        applyThemePreference(state?.themePreference ?? 'dark');
      },
    },
  ),
);
