import { AppState } from 'react-native';
import { create } from 'zustand';

import { api } from '@/api';
import { ApiError } from '@/api/edge';
import type { EntitlementsStatus } from '@/api/types';
import { supabase } from '@/lib/supabase';

type EntitlementState = {
  status: EntitlementsStatus | null;
  loading: boolean;
  error: string | null;
  canAccessPremium: boolean;
  refresh: () => Promise<void>;
  clear: () => void;
  startListening: () => () => void;
};

export const useEntitlementStore = create<EntitlementState>((set, get) => ({
  status: null,
  loading: false,
  error: null,
  canAccessPremium: false,

  clear: () => set({ status: null, error: null, canAccessPremium: false }),

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const status = await api.entitlementsStatus();
      set({
        status,
        canAccessPremium: Boolean(status.canAccessPremium),
        loading: false,
      });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Unable to load subscription status';
      set({ loading: false, error: message, canAccessPremium: false });
    }
  },

  startListening: () => {
    void get().refresh();

    const appSub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void get().refresh();
      }
    });

    let channel: ReturnType<typeof supabase.channel> | null = null;
    const current = get().status;
    const channelName = current?.realtime?.channel;
    const eventName = current?.realtime?.event ?? 'entitlement_changed';

    const attachRealtime = async () => {
      const status = get().status ?? (await api.entitlementsStatus().catch(() => null));
      if (!status?.realtime?.channel) {
        return;
      }
      set({
        status,
        canAccessPremium: Boolean(status.canAccessPremium),
      });

      channel = supabase
        .channel(status.realtime.channel, {
          config: { private: status.realtime.private ?? true },
        })
        .on('broadcast', { event: status.realtime.event || eventName }, () => {
          void get().refresh();
        })
        .subscribe();
    };

    if (channelName) {
      void attachRealtime();
    } else {
      void attachRealtime();
    }

    return () => {
      appSub.remove();
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  },
}));
