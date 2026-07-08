import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
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

// Guards against the persistence native module being unavailable (e.g. before
// a native rebuild after installing AsyncStorage). Any storage failure is
// swallowed so the app always renders with the default preference.
const safeStorage: StateStorage = {
  getItem: async name => {
    try {
      return await AsyncStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch {
      // ignore write failures
    }
  },
  removeItem: async name => {
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      // ignore remove failures
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
      storage: createJSONStorage(() => safeStorage),
      onRehydrateStorage: () => state => {
        if (state) {
          applyThemePreference(state.themePreference);
        }
      },
    },
  ),
);
