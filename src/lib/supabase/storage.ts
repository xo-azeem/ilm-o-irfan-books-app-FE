import type { SupportedStorage } from '@supabase/supabase-js';

import { keyValueStore } from '@/stores/storage';

/**
 * Session tokens keep their own MMKV id, deliberately apart from preferences:
 * signing out clears this store without touching the reader's theme or text
 * size, and a preferences reset never invalidates a live session.
 */
const store = keyValueStore('ilm-supabase-auth');

/**
 * MMKV-backed storage adapter for Supabase Auth sessions.
 *
 * Parameters are annotated explicitly because `SupportedStorage` is derived from
 * the DOM `Storage` interface, which a React Native project does not include —
 * without these the arguments silently infer as `any`.
 */
export const supabaseAuthStorage: SupportedStorage = {
  getItem: (key: string) => store.getString(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.remove(key),
};
