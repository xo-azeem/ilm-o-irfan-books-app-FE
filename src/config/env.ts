import { SUPABASE_ANON_KEY as ENV_ANON, SUPABASE_URL as ENV_URL } from '@env';

/** Staging defaults — anon key is public (safe in the client). Override via `.env`. */
const STAGING_URL = 'https://rwnmckrepvycydmtgvcq.supabase.co';
const STAGING_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3bm1ja3JlcHZ5Y3lkbXRndmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NjI1MjgsImV4cCI6MjEwMTIzODUyOH0.NI0_4BQVXAriEk3YHyMMsfqYundJbMTbfoxBu7pl8lU';

export const ENV = {
  SUPABASE_URL: (ENV_URL || STAGING_URL).replace(/\/+$/, ''),
  SUPABASE_ANON_KEY: ENV_ANON || STAGING_ANON,
} as const;
