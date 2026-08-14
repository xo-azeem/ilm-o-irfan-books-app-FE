/**
 * Supabase public config for the React Native app.
 * Anon key is safe with RLS. Never add the service_role key here.
 *
 * Values mirror `.env` — update both when rotating keys.
 */
export const env = {
  supabaseUrl: 'https://rwnmckrepvycydmtgvcq.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3bm1ja3JlcHZ5Y3lkbXRndmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NjI1MjgsImV4cCI6MjEwMTIzODUyOH0.NI0_4BQVXAriEk3YHyMMsfqYundJbMTbfoxBu7pl8lU',
} as const;
