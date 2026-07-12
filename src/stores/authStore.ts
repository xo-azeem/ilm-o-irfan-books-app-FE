import { createMMKV, type MMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';

type AuthState = {
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => void;
};

let mmkv: MMKV | null = null;
try {
  mmkv = createMMKV({ id: 'ilm-app-storage' });
} catch {
  mmkv = null;
}

const memoryStore = new Map<string, string>();

const authStorage: StateStorage = {
  getItem: name => {
    try {
      return mmkv ? (mmkv.getString(name) ?? null) : (memoryStore.get(name) ?? null);
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

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      isAuthenticated: false,
      signIn: () => set({ isAuthenticated: true }),
      signOut: () => set({ isAuthenticated: false }),
    }),
    {
      name: 'ilm-auth-session',
      storage: createJSONStorage(() => authStorage),
    },
  ),
);
