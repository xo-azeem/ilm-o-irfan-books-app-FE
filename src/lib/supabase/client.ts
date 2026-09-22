import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

import { env } from '@/config/env';
import { deviceUserAgent } from '@/lib/device';
import { headerSafe } from '@/lib/headerValue';
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
      parentSignal.addEventListener('abort', () => controller.abort(), {
        once: true,
      });
    }
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
  });
}

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  global: {
    fetch: fetchWithTimeout,
    // Stored on the auth session row, which is how Profile → Signed-in
    // devices can name this phone. See lib/device.ts.
    //
    // Sent only when it is a value the HTTP stack will accept: a header
    // outside printable US-ASCII makes it reject every request, and no
    // device name is worth an app that cannot reach the server. Naming the
    // phone is a nicety; the default agent does no harm.
    headers: headerSafe(deviceUserAgent())
      ? { 'User-Agent': deviceUserAgent() }
      : {},
  },
  auth: {
    storage: supabaseAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
