import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { signOut as supabaseSignOut } from '@/lib/supabase/auth';
import { forgetPushRegistration } from '@/services/push/registry';
// One shared MMKV handle backs every app preference — see stores/storage.ts.
import { mmkvStorage } from '@/stores/storage';

export type AppRole = 'user' | 'admin';

type AuthState = {
  isAuthenticated: boolean;
  isHydrated: boolean;
  isAdmin: boolean;
  roleResolved: boolean;
  accessCheckedFor: string | null;
  userId: string | null;
  email: string | null;
  /**
   * An admin who has stepped out of the admin tool to use the app as a
   * reader. Only meaningful while `isAdmin` is true — for anyone else the
   * app is the only view there is, so the flag is simply ignored.
   *
   * Persisted, so an admin who closed the app mid-read comes back to the
   * reader, not to Today. Cleared on sign-out and whenever a different
   * account signs in, so the choice never outlives the person who made it.
   */
  viewingAsReader: boolean;
  /** @deprecated Prefer setSession from auth listener */
  signIn: () => void;
  setSession: (session: Session | null) => void;
  setHydrated: (value: boolean) => void;
  setAccessRole: (input: {
    isAdmin: boolean;
    roleResolved: boolean;
    accessCheckedFor: string | null;
  }) => void;
  setViewingAsReader: (value: boolean) => void;
  signOut: () => Promise<void>;
};

function userFromSession(
  session: Session | null,
): Pick<User, 'id' | 'email'> | null {
  if (!session?.user) {
    return null;
  }
  return { id: session.user.id, email: session.user.email ?? undefined };
}

export function jwtIsAdmin(session: Session | null): boolean {
  return session?.user?.app_metadata?.app_role === 'admin';
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      isAuthenticated: false,
      isHydrated: false,
      isAdmin: false,
      roleResolved: false,
      accessCheckedFor: null,
      userId: null,
      email: null,
      viewingAsReader: false,
      signIn: () => set({ isAuthenticated: true }),
      setSession: session => {
        const user = userFromSession(session);
        set(state => ({
          isAuthenticated: Boolean(session),
          userId: user?.id ?? null,
          email: user?.email ?? null,
          // The same session arrives several times over a launch (see
          // AuthSessionProvider), and each of those must leave the choice
          // alone. Only a change of identity — another account, or none —
          // drops it.
          viewingAsReader:
            user?.id && user.id === state.userId
              ? state.viewingAsReader
              : false,
        }));
      },
      setHydrated: value => set({ isHydrated: value }),
      setAccessRole: ({ isAdmin, roleResolved, accessCheckedFor }) =>
        set({ isAdmin, roleResolved, accessCheckedFor }),
      setViewingAsReader: value => set({ viewingAsReader: value }),
      signOut: async () => {
        try {
          // While the JWT is still good: the push token row is scoped to
          // the reader who registered it, and the next reader on this
          // device must not inherit their notifications.
          await forgetPushRegistration();
          await supabaseSignOut();
        } finally {
          set({
            isAuthenticated: false,
            isAdmin: false,
            roleResolved: true,
            accessCheckedFor: null,
            userId: null,
            email: null,
            viewingAsReader: false,
          });
        }
      },
    }),
    {
      name: 'ilm-auth-session',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: state => ({
        isAuthenticated: state.isAuthenticated,
        userId: state.userId,
        email: state.email,
        viewingAsReader: state.viewingAsReader,
      }),
      onRehydrateStorage: () => state => {
        state?.setHydrated(true);
      },
    },
  ),
);
