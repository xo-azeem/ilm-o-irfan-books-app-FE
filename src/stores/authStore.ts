import type { Session, User } from '@supabase/supabase-js';
import { createMMKV, type MMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';

import { signOut as supabaseSignOut } from '@/lib/supabase/auth';

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

let mmkv: MMKV | null = null;
try {
  mmkv = createMMKV({ id: 'ilm-app-storage' });
} catch {
  mmkv = null;
}

const memoryStore = new Map<string, string>();

const authStorage: StateStorage = {
  getItem: name => {
    try {
      return mmkv ? (mmkv.getString(name) ?? null) : (memoryStore.get(name) ?? null);
    } catch {
      return memoryStore.get(name) ?? null;
    }
  },
  setItem: (name, value) => {
    try {
      if (mmkv) {
        mmkv.set(name, value);
      } else {
        memoryStore.set(name, value);
      }
    } catch {
      memoryStore.set(name, value);
    }
  },
  removeItem: name => {
    try {
      if (mmkv) {
        mmkv.remove(name);
      } else {
        memoryStore.delete(name);
      }
    } catch {
      memoryStore.delete(name);
    }
  },
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
      storage: createJSONStorage(() => authStorage),
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
