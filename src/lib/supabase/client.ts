import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

import { env } from '@/config/env';
import { supabaseAuthStorage } from '@/lib/supabase/storage';

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: supabaseAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
