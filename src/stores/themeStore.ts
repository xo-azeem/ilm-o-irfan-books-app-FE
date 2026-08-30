import { Appearance } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { mmkvStorage } from '@/stores/storage';

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

/** The reader's page tone, applied to every book they open. */
export type PageTone = 'paper' | 'sepia' | 'midnight';

type ThemeState = {
  themePreference: ThemePreference;
  /** Reading defaults live here so the reader sheet and Appearance agree. */
  pageTone: PageTone;
  keepScreenAwake: boolean;

  setThemePreference: (preference: ThemePreference) => void;
  setPageTone: (tone: PageTone) => void;
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

export const useThemeStore = create<ThemeState>()(
  persist(
    set => ({
      themePreference: 'system',
      pageTone: 'sepia',
      keepScreenAwake: true,

      setThemePreference: preference => {
        applyThemePreference(preference);
        set({ themePreference: preference });
      },
      setPageTone: pageTone => set({ pageTone }),
      setKeepScreenAwake: keepScreenAwake => set({ keepScreenAwake }),
    }),
    {
      name: 'ilm-theme-preference',
      storage: createJSONStorage(() => mmkvStorage),
      // Runs synchronously with MMKV, so the saved theme is applied to the
      // native Appearance before the first frame paints.
      onRehydrateStorage: () => state => {
        applyThemePreference(state?.themePreference ?? 'system');
      },
    },
  ),
);
