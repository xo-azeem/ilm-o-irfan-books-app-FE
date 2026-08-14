import { useEffect, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

/** Keeps Zustand auth flag in sync with the Supabase session (MMKV-persisted). */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const setSession = useAuthStore(state => state.setSession);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setSession]);

  return children;
}
