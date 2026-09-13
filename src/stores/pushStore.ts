import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { mmkvStorage } from '@/stores/storage';

/**
 * The reader's push preferences, and what the device has told the server.
 *
 * The three switches are the Notifications screen. Each maps to something
 * concrete on the wire — see `services/push/registry.ts`:
 *
 *   · `newReleases`       → the FCM topic `catalog` (subscribed on-device;
 *                            no account needed, so a guest gets these too)
 *   · `libraryUpdates`    → `notify_library` on this device's token row
 *   · `membershipUpdates` → `notify_membership` on the same row
 *
 * `registered` remembers the last registration the server accepted, so a
 * launch with nothing changed costs no round trip. `promptedAt` makes the OS
 * permission prompt a one-time thing; after that the screen points at the
 * device's settings instead of re-asking.
 */
export type PushRegistration = {
  token: string;
  userId: string;
  libraryUpdates: boolean;
  membershipUpdates: boolean;
  /** Epoch ms of the last accepted registration. */
  at: number;
};

type PushState = {
  newReleases: boolean;
  libraryUpdates: boolean;
  membershipUpdates: boolean;
  promptedAt: number | null;
  registered: PushRegistration | null;
  topicSubscribed: boolean;
  /**
   * Bumped whenever something outside the preferences changes what should be
   * registered — permission granted, token refreshed — so the provider's
   * sync effect runs again without the preferences having moved.
   */
  syncTick: number;
  setPreference: (
    key: 'newReleases' | 'libraryUpdates' | 'membershipUpdates',
    value: boolean,
  ) => void;
  markPrompted: () => void;
  setRegistered: (registration: PushRegistration | null) => void;
  setTopicSubscribed: (value: boolean) => void;
  requestSync: () => void;
};

export const usePushStore = create<PushState>()(
  persist(
    set => ({
      newReleases: true,
      libraryUpdates: true,
      membershipUpdates: true,
      promptedAt: null,
      registered: null,
      topicSubscribed: false,
      syncTick: 0,
      setPreference: (key, value) => set({ [key]: value }),
      markPrompted: () => set({ promptedAt: Date.now() }),
      setRegistered: registration => set({ registered: registration }),
      setTopicSubscribed: value => set({ topicSubscribed: value }),
      requestSync: () => set(state => ({ syncTick: state.syncTick + 1 })),
    }),
    {
      name: 'ilm-push',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: state => ({
        newReleases: state.newReleases,
        libraryUpdates: state.libraryUpdates,
        membershipUpdates: state.membershipUpdates,
        promptedAt: state.promptedAt,
        registered: state.registered,
        topicSubscribed: state.topicSubscribed,
      }),
    },
  ),
);
