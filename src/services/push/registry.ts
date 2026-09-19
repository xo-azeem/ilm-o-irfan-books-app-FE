import { Platform } from 'react-native';

import { APP_VERSION } from '@/config/appVersion';
import { deviceLabel } from '@/lib/device';
import { supabase } from '@/lib/supabase/client';
import { usePushStore, type PushRegistration } from '@/stores/pushStore';

import { firebaseMessaging, messaging, pushAvailable } from './firebase';
import { checkPushPermission } from './permissions';

/**
 * Keeps what the device is subscribed to in step with the reader's switches.
 *
 * Two independent channels, one sync:
 *
 *   · the FCM topic `catalog` — new books and collections, for everyone who
 *     has the app, signed in or not. Subscribed on the device; the server
 *     never needs to know this device exists.
 *   · the token row — `register_push_token` — for the pushes addressed to a
 *     person: a book they hold was removed or changed, their membership
 *     started or ended. Needs a session, so a guest has no row.
 *
 * `syncPush` is idempotent and cheap to call often: it runs at every launch,
 * on sign-in and sign-out, on a token refresh, on a preference change, and
 * when the OS permission is granted. A registration identical to the last
 * accepted one within a day is skipped, so most launches cost nothing.
 *
 * Calls are serialised. Two overlapping syncs (a launch racing a sign-in)
 * would otherwise both read "not registered" and both register.
 */

const CATALOG_TOPIC = 'catalog';

/** Re-register at least daily so `last_seen_at` stays honest for pruning. */
const REGISTRATION_TTL_MS = 24 * 60 * 60 * 1000;

let chain: Promise<void> = Promise.resolve();

function sameRegistration(
  a: PushRegistration | null,
  b: Omit<PushRegistration, 'at'>,
): boolean {
  return (
    !!a &&
    a.token === b.token &&
    a.userId === b.userId &&
    a.libraryUpdates === b.libraryUpdates &&
    a.membershipUpdates === b.membershipUpdates
  );
}

async function syncTopic(): Promise<void> {
  const mod = firebaseMessaging();
  const m = messaging();
  if (!mod || !m) {
    return;
  }
  const { newReleases, topicSubscribed, setTopicSubscribed } =
    usePushStore.getState();
  if (newReleases === topicSubscribed) {
    return;
  }
  try {
    if (newReleases) {
      await mod.subscribeToTopic(m, CATALOG_TOPIC);
    } else {
      await mod.unsubscribeFromTopic(m, CATALOG_TOPIC);
    }
    setTopicSubscribed(newReleases);
  } catch (error) {
    // Left as it was; the next sync tries again.
    if (__DEV__) {
      console.warn('[push] topic sync failed', error);
    }
  }
}

async function syncRegistration(
  userId: string | null,
  force: boolean,
): Promise<void> {
  const mod = firebaseMessaging();
  const m = messaging();
  if (!mod || !m) {
    return;
  }

  const state = usePushStore.getState();
  const wanted = !!userId && (state.libraryUpdates || state.membershipUpdates);

  if (!wanted) {
    // Only the reader who registered a row can drop it, so with no session
    // there is nothing to do here; sign-out handles its own (see
    // `forgetPushRegistration`). A signed-in reader who switched both
    // targeted kinds off has the row removed rather than left mute.
    if (userId && state.registered && state.registered.userId === userId) {
      try {
        await supabase.rpc('unregister_push_token', {
          p_token: state.registered.token,
        });
        state.setRegistered(null);
      } catch (error) {
        if (__DEV__) {
          console.warn('[push] unregister failed', error);
        }
      }
    }
    return;
  }

  let token: string;
  try {
    token = await mod.getToken(m);
  } catch (error) {
    // No token on an iOS simulator, or before APNs has answered. Nothing to
    // register yet; `onTokenRefresh` brings us back when there is.
    if (__DEV__) {
      console.warn('[push] getToken failed', error);
    }
    return;
  }
  if (!token) {
    return;
  }

  const next = {
    token,
    userId: userId as string,
    libraryUpdates: state.libraryUpdates,
    membershipUpdates: state.membershipUpdates,
  };

  if (
    !force &&
    sameRegistration(state.registered, next) &&
    Date.now() - (state.registered?.at ?? 0) < REGISTRATION_TTL_MS
  ) {
    return;
  }

  const { error: rpcError } = await supabase.rpc('register_push_token', {
    p_token: token,
    p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
    p_app_version: APP_VERSION,
    // The same name Signed-in devices shows, so an admin can match a token
    // row to a session row.
    p_device_name: deviceLabel(),
    p_notify_library: next.libraryUpdates,
    p_notify_membership: next.membershipUpdates,
  });

  if (rpcError) {
    if (__DEV__) {
      console.warn('[push] register failed', rpcError.message);
    }
    return;
  }

  state.setRegistered({ ...next, at: Date.now() });
}

/**
 * Brings the topic subscription and the token row in line with the switches.
 * Safe to call at any time; does nothing when push is unavailable or the OS
 * has not granted the permission (a token nobody can see is not worth a row).
 */
export function syncPush(
  userId: string | null,
  options: { force?: boolean } = {},
): Promise<void> {
  const run = async () => {
    if (!pushAvailable()) {
      return;
    }
    if ((await checkPushPermission()) !== 'granted') {
      return;
    }
    await syncTopic();
    await syncRegistration(userId, options.force ?? false);
  };

  chain = chain.then(run, run);
  return chain;
}

/**
 * Drops this device's row before the session goes away.
 *
 * Called from the auth store's sign-out, while the JWT is still valid —
 * `unregister_push_token` is scoped to `auth.uid()`, so after sign-out the
 * row could no longer be removed and the next reader on this device would
 * inherit the previous one's targeted pushes until they signed in
 * themselves. The topic subscription is left alone: announcements are for
 * everyone with the app.
 */
export function forgetPushRegistration(): Promise<void> {
  const run = async () => {
    const { registered, setRegistered } = usePushStore.getState();
    if (!registered) {
      return;
    }
    try {
      await supabase.rpc('unregister_push_token', {
        p_token: registered.token,
      });
    } catch (error) {
      if (__DEV__) {
        console.warn('[push] unregister on sign-out failed', error);
      }
    } finally {
      // Whatever the server said, this device no longer claims the row: a
      // failed unregister is re-tried by the next sign-in's re-registration,
      // which reassigns the token to whoever that is.
      setRegistered(null);
    }
  };

  chain = chain.then(run, run);
  return chain;
}
