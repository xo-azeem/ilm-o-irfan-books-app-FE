import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import {
  identifyPurchasesUser,
  resetPurchasesUser,
} from '@/billing/purchases';
import { supabase } from '@/lib/supabase';

type AuthState = {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
};

let authListenerAttached = false;

async function syncPurchasesIdentity(userId: string | null | undefined) {
  try {
    if (userId) {
      await identifyPurchasesUser(userId);
    } else {
      await resetPurchasesUser();
    }
  } catch {
    // Billing must not block auth — keys/products may be missing in early builds.
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isAuthenticated: false,
  isHydrated: false,

  hydrate: async () => {
    if (!authListenerAttached) {
      authListenerAttached = true;
      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          session,
          user: session?.user ?? null,
          isAuthenticated: Boolean(session?.user),
        });
        void syncPurchasesIdentity(session?.user?.id);
      });
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      set({ session: null, user: null, isAuthenticated: false, isHydrated: true });
      return;
    }

    set({
      session: data.session,
      user: data.session?.user ?? null,
      isAuthenticated: Boolean(data.session?.user),
      isHydrated: true,
    });
    void syncPurchasesIdentity(data.session?.user?.id);
  },

  signInWithPassword: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      throw error;
    }
    set({
      session: data.session,
      user: data.user,
      isAuthenticated: Boolean(data.session?.user),
    });
    void syncPurchasesIdentity(data.user?.id);
  },

  signUp: async ({ email, password, fullName, phone }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone?.trim() || undefined,
        },
      },
    });
    if (error) {
      throw error;
    }
    // Email confirm may leave session null — treat as signed in only when session exists.
    if (data.session) {
      set({
        session: data.session,
        user: data.user,
        isAuthenticated: true,
      });
      void syncPurchasesIdentity(data.user?.id);
    } else {
      // Auto-confirm is often on for staging; if not, try immediate password sign-in.
      await get().signInWithPassword(email, password);
    }
  },

  signOut: async () => {
    await syncPurchasesIdentity(null);
    await supabase.auth.signOut();
    set({ session: null, user: null, isAuthenticated: false });
  },
}));
