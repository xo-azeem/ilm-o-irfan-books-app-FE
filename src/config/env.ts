import { Platform } from 'react-native';
import {
  REVENUECAT_API_KEY_ANDROID as ENV_RC_ANDROID,
  REVENUECAT_API_KEY_IOS as ENV_RC_IOS,
  SUPABASE_ANON_KEY as ENV_ANON,
  SUPABASE_URL as ENV_URL,
} from '@env';

/** Staging defaults — anon key is public (safe in the client). Override via `.env`. */
const STAGING_URL = 'https://rwnmckrepvycydmtgvcq.supabase.co';
const STAGING_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3bm1ja3JlcHZ5Y3lkbXRndmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NjI1MjgsImV4cCI6MjEwMTIzODUyOH0.NI0_4BQVXAriEk3YHyMMsfqYundJbMTbfoxBu7pl8lU';

const rcKey =
  Platform.OS === 'ios'
    ? (ENV_RC_IOS ?? '').trim()
    : (ENV_RC_ANDROID ?? '').trim();

export const ENV = {
  SUPABASE_URL: (ENV_URL || STAGING_URL).replace(/\/+$/, ''),
  SUPABASE_ANON_KEY: ENV_ANON || STAGING_ANON,
  /** Public RevenueCat SDK key for this platform — empty until ops fills `.env`. */
  REVENUECAT_API_KEY: rcKey,
} as const;
