import { createClient } from '@supabase/supabase-js';
import { createMMKV, type MMKV } from 'react-native-mmkv';

import { ENV } from '@/config/env';

let mmkv: MMKV | null = null;
try {
  mmkv = createMMKV({ id: 'ilm-supabase-auth' });
} catch {
  mmkv = null;
}

const memory = new Map<string, string>();

const storage = {
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

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
