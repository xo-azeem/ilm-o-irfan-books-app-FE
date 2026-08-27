import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

import { env } from '@/config/env';
import { supabaseAuthStorage } from '@/lib/supabase/storage';

const REQUEST_TIMEOUT_MS = 12_000;

function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const parentSignal = init?.signal;
  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort();
    } else {
      parentSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
  });
}

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  global: {
    fetch: fetchWithTimeout,
  },
  auth: {
    storage: supabaseAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
