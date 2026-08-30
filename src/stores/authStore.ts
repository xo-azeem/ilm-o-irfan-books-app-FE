import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { signOut as supabaseSignOut } from '@/lib/supabase/auth';
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
  /** @deprecated Prefer setSession from auth listener */
  signIn: () => void;
  setSession: (session: Session | null) => void;
  setHydrated: (value: boolean) => void;
  setAccessRole: (input: {
    isAdmin: boolean;
    roleResolved: boolean;
    accessCheckedFor: string | null;
  }) => void;
  signOut: () => Promise<void>;
};

function userFromSession(session: Session | null): Pick<User, 'id' | 'email'> | null {
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
      signIn: () => set({ isAuthenticated: true }),
      setSession: session => {
        const user = userFromSession(session);
        set({
          isAuthenticated: Boolean(session),
          userId: user?.id ?? null,
          email: user?.email ?? null,
        });
      },
      setHydrated: value => set({ isHydrated: value }),
      setAccessRole: ({ isAdmin, roleResolved, accessCheckedFor }) =>
        set({ isAdmin, roleResolved, accessCheckedFor }),
      signOut: async () => {
        try {
          await supabaseSignOut();
        } finally {
          set({
            isAuthenticated: false,
            isAdmin: false,
            roleResolved: true,
            accessCheckedFor: null,
            userId: null,
            email: null,
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
      }),
      onRehydrateStorage: () => state => {
        state?.setHydrated(true);
      },
    },
  ),
);
