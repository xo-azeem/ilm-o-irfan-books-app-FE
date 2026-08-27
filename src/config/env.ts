import Config from 'react-native-config';

/** Hosted project — used when the native binary still has a stale local URL. */
const HOSTED_SUPABASE_URL = 'https://rwnmckrepvycydmtgvcq.supabase.co';
const HOSTED_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3bm1ja3JlcHZ5Y3lkbXRndmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NjI1MjgsImV4cCI6MjEwMTIzODUyOH0.NI0_4BQVXAriEk3YHyMMsfqYundJbMTbfoxBu7pl8lU';

function required(name: 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'): string {
  const value = Config[name]?.trim();
  if (!value) {
    throw new Error(`Missing required app configuration: ${name}`);
  }
  return value;
}

function isLocalSupabaseUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '10.0.2.2' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.')
    );
  } catch {
    return false;
  }
}

/**
 * react-native-config bakes values into the native binary. Metro reload does
 * not update them. If the baked URL is a LAN address and local Supabase is not
 * opted in, use the hosted project so Home can load.
 */
function resolveSupabase(): { url: string; anonKey: string } {
  const configuredUrl = required('SUPABASE_URL');
  const configuredKey = required('SUPABASE_ANON_KEY');
  const useLocal = Config.USE_LOCAL_SUPABASE?.trim() === 'true';

  if (!useLocal && isLocalSupabaseUrl(configuredUrl)) {
    if (__DEV__) {
      console.warn(
        `[env] Native SUPABASE_URL is still local (${configuredUrl}). Using hosted Supabase. Rebuild the app after changing .env.`,
      );
    }
    return { url: HOSTED_SUPABASE_URL, anonKey: HOSTED_SUPABASE_ANON_KEY };
  }

  return { url: configuredUrl, anonKey: configuredKey };
}

const supabase = resolveSupabase();

/**
 * Public client configuration. The anon key is safe to ship only because the
 * backend enforces RLS; service-role credentials must never be added here.
 *
 * `ALLOW_PDF_WITHOUT_ENTITLEMENT` is a client fallback only. The real gate is
 * server-side (`app_settings` + Edge Function env). This native flag is used
 * while the server policy is still loading, or if the settings row is missing.
 */
export const env = {
  supabaseUrl: supabase.url,
  supabaseAnonKey: supabase.anonKey,
  // Native builds bake this flag; Metro reload cannot change it. In __DEV__,
  // always treat PDFs as unlocked so a stale binary cannot block reading.
  allowPdfWithoutEntitlement:
    Config.ALLOW_PDF_WITHOUT_ENTITLEMENT?.trim() === 'true' || Boolean(__DEV__),
} as const;
