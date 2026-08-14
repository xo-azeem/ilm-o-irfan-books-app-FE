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
 */
export const env = {
  supabaseUrl: required('SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
} as const;
