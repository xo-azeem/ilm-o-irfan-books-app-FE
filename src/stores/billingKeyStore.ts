import { create } from 'zustand';

/**
 * The RevenueCat public SDK key the backend handed this install.
 *
 * `app-status` carries the keys an admin has set (see `appStatus.ts`), so a
 * build made before RevenueCat existed can start selling the day the key is
 * pasted into the admin tool, on its next launch, with no rebuild. Kept in a
 * store rather than a module variable so the hooks that decide whether
 * checkout is available re-render when it arrives.
 *
 * Never persisted: the status is re-read under the splash on every launch
 * anyway, and a key that has been rotated in the admin tool should not be
 * remembered from before.
 */
type BillingKeyState = {
  /** The key for this platform, or `''` until the backend sends one. */
  runtimeKey: string;
  setRuntimeKey: (key: string | null | undefined) => void;
};

export const useBillingKeyStore = create<BillingKeyState>()(set => ({
  runtimeKey: '',
  setRuntimeKey: key => set({ runtimeKey: key?.trim() ?? '' }),
}));
