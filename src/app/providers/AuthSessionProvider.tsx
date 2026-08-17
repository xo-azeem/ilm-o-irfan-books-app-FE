import { useEffect, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { jwtIsAdmin, useAuthStore } from '@/stores/authStore';

async function resolveAdminRole(session: Session): Promise<boolean> {
  const jwtAdmin = jwtIsAdmin(session);

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      return jwtAdmin;
    }

    const profileAdmin = data?.role === 'admin';
    if (profileAdmin && !jwtAdmin) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      return jwtIsAdmin(refreshed.session) || profileAdmin;
    }

    return profileAdmin;
  } catch {
    return jwtAdmin;
  }
}

/** Keeps Zustand auth flag in sync with the Supabase session (MMKV-persisted). */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const setSession = useAuthStore(state => state.setSession);
  const setAccessRole = useAuthStore(state => state.setAccessRole);

  useEffect(() => {
    let mounted = true;
    let seq = 0;

    async function applySession(session: Session | null) {
      const my = ++seq;
      setSession(session);

      if (!session) {
        queryClient.clear();
        if (mounted && my === seq) {
          setAccessRole({ isAdmin: false, roleResolved: true, accessCheckedFor: null });
        }
        return;
      }

      const isAdmin = await resolveAdminRole(session);
      if (mounted && my === seq) {
        setAccessRole({
          isAdmin,
          roleResolved: true,
          accessCheckedFor: session.user.id,
        });
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        void applySession(data.session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    const appState = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        return;
      }
      const userId = useAuthStore.getState().userId;
      if (!userId) {
        return;
      }
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          void applySession(data.session);
        }
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      appState.remove();
    };
  }, [setAccessRole, setSession]);

  return children;
}
