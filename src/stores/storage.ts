import { createMMKV, type MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

/**
 * One synchronous native store shared by every persisted slice.
 *
 * MMKV reads on the JS thread without a promise, so persisted state is
 * available on the very first render — that is what removes the startup theme
 * flash and the hydration gate. Creation is guarded so a missing native binary
 * (before a rebuild after install, say) falls back to in-memory state instead
 * of crashing at launch.
 */
let mmkv: MMKV | null = null;
try {
  mmkv = createMMKV({ id: 'ilm-app-storage' });
} catch (error) {
  if (__DEV__) {
    console.warn('[storage] MMKV unavailable; using in-memory storage', error);
  }
}

const memoryStore = new Map<string, string>();

export const mmkvStorage: StateStorage = {
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
