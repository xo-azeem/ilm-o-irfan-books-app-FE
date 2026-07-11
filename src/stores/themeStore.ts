import { Appearance } from 'react-native';
import { createMMKV, type MMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

type ThemeState = {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
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

// MMKV is a synchronous native store, so the persisted preference is available
// on the very first render — this removes the async hydration gate and the
// startup theme flash entirely. Guarded so a missing native binary (e.g. before
// a native rebuild after install) transparently falls back to in-memory state
// instead of crashing at launch.
let mmkv: MMKV | null = null;
try {
  mmkv = createMMKV({ id: 'ilm-app-storage' });
} catch (error) {
  if (__DEV__) {
    console.warn('[theme] MMKV unavailable; using in-memory storage', error);
  }
}

const memoryStore = new Map<string, string>();

const themeStorage: StateStorage = {
  getItem: name => {
    try {
      return mmkv ? mmkv.getString(name) ?? null : memoryStore.get(name) ?? null;
    } catch {
      return memoryStore.get(name) ?? null;
    }
  },
  setItem: (name, value) => {
    try {
      if (mmkv) {
        mmkv.set(name, value);
      } else {
        memoryStore.set(name, value);
      }
    } catch {
      memoryStore.set(name, value);
    }
  },
  removeItem: name => {
    try {
      if (mmkv) {
        mmkv.remove(name);
      } else {
        memoryStore.delete(name);
      }
    } catch {
      memoryStore.delete(name);
    }
  },
};

export const useThemeStore = create<ThemeState>()(
  persist(
    set => ({
      themePreference: 'system',
      setThemePreference: preference => {
        applyThemePreference(preference);
        set({ themePreference: preference });
      },
    }),
    {
      name: 'ilm-theme-preference',
      storage: createJSONStorage(() => themeStorage),
      // Runs synchronously with MMKV, so the saved theme is applied to the
      // native Appearance before the first frame paints.
      onRehydrateStorage: () => state => {
        applyThemePreference(state?.themePreference ?? 'system');
      },
    },
  ),
);
