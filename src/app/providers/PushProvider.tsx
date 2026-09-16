import { useEffect, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { openPushIntent } from '@/app/navigation/navigationRef';
import { showPushBanner } from '@/components/ui/PushBanner';
import {
  applyPushSideEffects,
  DEFAULT_PUSH_INTENT,
  firebaseMessaging,
  messaging,
  parsePush,
  pushIsForCurrentUser,
  syncPush,
  type RemoteMessage,
} from '@/services/push';
import { useAuthStore } from '@/stores/authStore';
import { usePushStore } from '@/stores/pushStore';

/**
 * Push notifications, end to end on the device.
 *
 * Two jobs, both idle when Firebase is not in the build:
 *
 *   1. Keep the device registered for what the reader wants — the `catalog`
 *      topic and the token row — by running `syncPush` whenever an input
 *      changes: the session, a switch on the Notifications screen, the OS
 *      permission, a refreshed token, and every return to the foreground
 *      (which is also when a reader comes back from turning notifications on
 *      in the device's settings).
 *
 *   2. Act on deliveries. In the foreground the OS draws nothing, so the
 *      message becomes an in-app banner; the caches it names are refreshed
 *      either way. A tap — on a background notification, or on the one that
 *      launched the app — is routed through the navigation ref, which parks
 *      the intent until the consumer shell is up.
 *
 * The permission prompt is not here: `RootNavigator` asks once, after the
 * splash and only over the reader app, so the first thing a new reader sees
 * is Home rather than a system dialog.
 */
export function PushProvider({ children }: { children: ReactNode }) {
  const userId = useAuthStore(state => state.userId);
  const newReleases = usePushStore(state => state.newReleases);
  const libraryUpdates = usePushStore(state => state.libraryUpdates);
  const membershipUpdates = usePushStore(state => state.membershipUpdates);
  const syncTick = usePushStore(state => state.syncTick);

  // ── Registration ─────────────────────────────────────────────────────────
  useEffect(() => {
    void syncPush(userId);
  }, [userId, newReleases, libraryUpdates, membershipUpdates, syncTick]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') {
        void syncPush(useAuthStore.getState().userId);
      }
    });
    return () => subscription.remove();
  }, []);

  // ── Deliveries ───────────────────────────────────────────────────────────
  useEffect(() => {
    const mod = firebaseMessaging();
    const m = messaging();
    if (!mod || !m) {
      return;
    }

    const onForeground = (message: RemoteMessage) => {
      const payload = parsePush(message);
      // A targeted push for an account that is no longer signed in here is
      // dropped without a trace.
      if (!pushIsForCurrentUser(payload, useAuthStore.getState().userId)) {
        return;
      }
      applyPushSideEffects(payload);
      if (payload.title) {
        showPushBanner({
          title: payload.title,
          body: payload.body,
          kind: payload.kind,
          intent: payload.intent,
          onOpen: openPushIntent,
        });
      }
    };

    const onOpened = (message: RemoteMessage | null) => {
      if (!message) {
        return;
      }
      const payload = parsePush(message);
      if (!pushIsForCurrentUser(payload, useAuthStore.getState().userId)) {
        return;
      }
      applyPushSideEffects(payload);
      // `book` and `collection` go to their pages; anything else is Home.
      openPushIntent(payload.intent ?? DEFAULT_PUSH_INTENT);
    };

    const unsubscribers: Array<() => void> = [];
    try {
      unsubscribers.push(mod.onMessage(m, onForeground));
      unsubscribers.push(mod.onNotificationOpenedApp(m, onOpened));
      unsubscribers.push(
        mod.onTokenRefresh(m, () => {
          // The old token is dead on FCM's side; the row must carry the new
          // one before the next targeted push, whatever the last sync said.
          void syncPush(useAuthStore.getState().userId, { force: true });
        }),
      );
      // The notification that launched the app, if one did.
      void mod.getInitialNotification(m).then(onOpened, () => undefined);
    } catch (error) {
      if (__DEV__) {
        console.warn('[push] listener registration failed', error);
      }
    }

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }, []);

  return children;
}
