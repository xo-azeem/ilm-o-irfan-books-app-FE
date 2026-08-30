import { createMMKV, type MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

/**
 * The app's key-value layer.
 *
 * MMKV reads on the JS thread without a promise, so persisted state is
 * available on the very first render — that is what removes the startup theme
 * flash and the hydration gate. Nothing here is async, and nothing should be
 * made async: the whole point is that the reader's theme and text size are
 * already correct in frame one.
 *
 * Every instance is created through `sharedMMKV` so that a given store id is
 * opened exactly once per launch. Opening the same id twice costs a second
 * native handle and a second mmap of the same file for no benefit, which is
 * what used to happen between this module and the auth store.
 *
 * Creation is guarded: a missing native binary (before a rebuild after an
 * install, say) falls back to in-memory state rather than crashing at launch.
 */
const instances = new Map<string, MMKV | null>();

export function sharedMMKV(id: string): MMKV | null {
  const existing = instances.get(id);
  if (existing !== undefined) {
    return existing;
  }

  let instance: MMKV | null = null;
  try {
    instance = createMMKV({ id });
  } catch (error) {
    if (__DEV__) {
      console.warn(`[storage] MMKV "${id}" unavailable; using in-memory storage`, error);
    }
  }

  instances.set(id, instance);
  return instance;
}

/**
 * A synchronous `StateStorage` for one MMKV id, with a per-id in-memory
 * fallback so a store still functions (for the session) when MMKV is missing.
 */
export function createStateStorage(id: string): StateStorage {
  const fallback = new Map<string, string>();

  return {
    getItem: name => {
      try {
        const mmkv = sharedMMKV(id);
        return mmkv ? mmkv.getString(name) ?? null : fallback.get(name) ?? null;
      } catch {
        return fallback.get(name) ?? null;
      }
    },
    setItem: (name, value) => {
      try {
        const mmkv = sharedMMKV(id);
        if (mmkv) {
          mmkv.set(name, value);
        } else {
          fallback.set(name, value);
        }
      } catch {
        fallback.set(name, value);
      }
    },
    removeItem: name => {
      try {
        const mmkv = sharedMMKV(id);
        if (mmkv) {
          mmkv.remove(name);
        } else {
          fallback.delete(name);
        }
      } catch {
        fallback.delete(name);
      }
    },
  };
}

export type KeyValue = {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
};

/**
 * The plain key-value shape, for callers that are not zustand stores. Always
 * returns something usable: if MMKV could not be created this is an in-memory
 * map, so an import-time `createMMKV` throw can never take the app down with
 * it. Reads and writes stay synchronous either way.
 */
export function keyValueStore(id: string): KeyValue {
  const fallback = new Map<string, string>();

  return {
    getString: key => {
      try {
        const mmkv = sharedMMKV(id);
        return mmkv ? mmkv.getString(key) : fallback.get(key);
      } catch {
        return fallback.get(key);
      }
    },
    set: (key, value) => {
      try {
        const mmkv = sharedMMKV(id);
        if (mmkv) {
          mmkv.set(key, value);
        } else {
          fallback.set(key, value);
        }
      } catch {
        fallback.set(key, value);
      }
    },
    remove: key => {
      try {
        const mmkv = sharedMMKV(id);
        if (mmkv) {
          mmkv.remove(key);
        } else {
          fallback.delete(key);
        }
      } catch {
        fallback.delete(key);
      }
    },
  };
}

/** The id every persisted app preference shares — theme, text size, onboarding. */
export const APP_STORAGE_ID = 'ilm-app-storage';

export const mmkvStorage = createStateStorage(APP_STORAGE_ID);
