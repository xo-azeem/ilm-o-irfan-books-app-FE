import { createMMKV, type MMKV } from 'react-native-mmkv';
import type { SupportedStorage } from '@supabase/supabase-js';

let mmkv: MMKV | null = null;

try {
  mmkv = createMMKV({ id: 'ilm-supabase-auth' });
} catch {
  mmkv = null;
}

const memory = new Map<string, string>();

/**
 * MMKV-backed storage adapter for Supabase Auth sessions.
 *
 * Parameters are annotated explicitly because `SupportedStorage` is derived from
 * the DOM `Storage` interface, which a React Native project does not include —
 * without these the arguments silently infer as `any`.
 */
export const supabaseAuthStorage: SupportedStorage = {
  getItem: (key: string) => {
    try {
      if (mmkv) {
        return mmkv.getString(key) ?? null;
      }
      return memory.get(key) ?? null;
    } catch {
      return memory.get(key) ?? null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      if (mmkv) {
        mmkv.set(key, value);
      } else {
        memory.set(key, value);
      }
    } catch {
      memory.set(key, value);
    }
  },
  removeItem: (key: string) => {
    try {
      if (mmkv) {
        mmkv.remove(key);
      } else {
        memory.delete(key);
      }
    } catch {
      memory.delete(key);
    }
  },
};
