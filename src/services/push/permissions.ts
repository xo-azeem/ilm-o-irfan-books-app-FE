import { PermissionsAndroid, Platform } from 'react-native';

import { firebaseMessaging, messaging, pushAvailable } from './firebase';

/**
 * Whether the OS will draw this app's notifications.
 *
 *   · `granted`      — yes
 *   · `denied`       — the reader said no, or turned them off in settings;
 *                      the only way back is the device's settings screen
 *   · `undetermined` — never asked (iOS, and Android 13+), or push is not
 *                      available in this build at all
 */
export type PushPermission = 'granted' | 'denied' | 'undetermined';

// `AuthorizationStatus` from @react-native-firebase/messaging. Spelled out
// here so the module can stay lazily loaded (see ./firebase.ts).
const NOT_DETERMINED = -1;
const AUTHORIZED = 1;
const PROVISIONAL = 2;
const EPHEMERAL = 3;

const POST_NOTIFICATIONS = 'android.permission.POST_NOTIFICATIONS' as const;

function androidNeedsRuntimePermission(): boolean {
  return Platform.OS === 'android' && Number(Platform.Version) >= 33;
}

/**
 * Reads the current state without prompting.
 *
 * On Android this is `areNotificationsEnabled()`, which covers both the
 * Android 13 runtime permission and the older per-app switch in settings.
 * On iOS it is the notification centre's authorisation status.
 */
export async function checkPushPermission(): Promise<PushPermission> {
  const mod = firebaseMessaging();
  const m = messaging();
  if (!mod || !m || !pushAvailable()) {
    return 'undetermined';
  }

  try {
    const status = await mod.hasPermission(m);
    if (
      status === AUTHORIZED ||
      status === PROVISIONAL ||
      status === EPHEMERAL
    ) {
      return 'granted';
    }
    if (status === NOT_DETERMINED) {
      return 'undetermined';
    }
    // Android below 13 has no prompt: "not enabled" means the reader turned
    // the app off in settings. On 13+ a fresh install also reads as denied
    // here, so the runtime permission decides whether asking still helps.
    if (androidNeedsRuntimePermission()) {
      const asked = await PermissionsAndroid.check(POST_NOTIFICATIONS);
      return asked ? 'denied' : 'undetermined';
    }
    return 'denied';
  } catch {
    return 'undetermined';
  }
}

/**
 * Shows the OS prompt (once per install, by the platform's own rules) and
 * reports where that left things. Never throws.
 */
export async function requestPushPermission(): Promise<PushPermission> {
  const mod = firebaseMessaging();
  const m = messaging();
  if (!mod || !m || !pushAvailable()) {
    return 'undetermined';
  }

  try {
    if (Platform.OS === 'android') {
      if (androidNeedsRuntimePermission()) {
        const result = await PermissionsAndroid.request(POST_NOTIFICATIONS);
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          return 'denied';
        }
      }
      // Below 13 there is nothing to ask; the settings switch is the answer.
      return checkPushPermission();
    }

    const status = await mod.requestPermission(m, {
      alert: true,
      badge: true,
      sound: true,
    });
    return status === AUTHORIZED ||
      status === PROVISIONAL ||
      status === EPHEMERAL
      ? 'granted'
      : 'denied';
  } catch (error) {
    if (__DEV__) {
      console.warn('[push] permission request failed', error);
    }
    return 'undetermined';
  }
}
