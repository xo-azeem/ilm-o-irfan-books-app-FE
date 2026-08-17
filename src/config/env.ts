import Config from 'react-native-config';

function required(name: 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'): string {
  const value = Config[name]?.trim();
  if (!value) {
    throw new Error(`Missing required app configuration: ${name}`);
  }
  return value;
}

/**
 * Public client configuration. The anon key is safe to ship only because the
 * backend enforces RLS; service-role credentials must never be added here.
 *
 * `ALLOW_PDF_WITHOUT_ENTITLEMENT` is read once at startup (no per-render work):
 * - true  = dev: signed-in users can read without a subscription
 * - false = publishing: an active subscription is required
 * Keep this in sync with the same secret on `get-signed-pdf`.
 */
export const env = {
  supabaseUrl: required('SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  allowPdfWithoutEntitlement: Config.ALLOW_PDF_WITHOUT_ENTITLEMENT?.trim() === 'true',
} as const;
