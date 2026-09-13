/**
 * The one place the app touches React Native Firebase.
 *
 * Both modules are loaded lazily and guarded, for two reasons that matter on
 * a real device rather than in theory:
 *
 *   · Firebase only initialises natively when the project file is in the
 *     build (`google-services.json` / `GoogleService-Info.plist`), and both
 *     are gitignored. A build without them must launch and behave exactly as
 *     before, with push simply off — so nothing here throws, and `messaging()`
 *     answers null.
 *   · The native module arrives with the next native build, not with
 *     `npm install`. A JS bundle that loaded against an older binary would
 *     otherwise fail at import time, taking the whole app with it; the storage
 *     layer makes the same choice for the same reason.
 *
 * Everything else in `services/push` goes through `messaging()` and treats
 * null as "no push on this device".
 */
import type {
  Messaging as FirebaseMessaging,
  RemoteMessage as FirebaseRemoteMessage,
} from '@react-native-firebase/messaging';

type MessagingModule = typeof import('@react-native-firebase/messaging');
type AppModule = typeof import('@react-native-firebase/app');

export type Messaging = FirebaseMessaging;
export type RemoteMessage = FirebaseRemoteMessage;

let appModule: AppModule | null | undefined;
let messagingModule: MessagingModule | null | undefined;
let instance: Messaging | null | undefined;

function loadApp(): AppModule | null {
  if (appModule !== undefined) {
    return appModule;
  }
  try {
    appModule = require('@react-native-firebase/app') as AppModule;
  } catch (error) {
    if (__DEV__) {
      console.warn('[push] @react-native-firebase/app unavailable', error);
    }
    appModule = null;
  }
  return appModule;
}

/** The messaging module's functions, or null when the native side is missing. */
export function firebaseMessaging(): MessagingModule | null {
  if (messagingModule !== undefined) {
    return messagingModule;
  }
  try {
    messagingModule =
      require('@react-native-firebase/messaging') as MessagingModule;
  } catch (error) {
    if (__DEV__) {
      console.warn(
        '[push] @react-native-firebase/messaging unavailable',
        error,
      );
    }
    messagingModule = null;
  }
  return messagingModule;
}

/**
 * Whether a Firebase app exists on this device — i.e. the project file was in
 * the build. Cheap and synchronous; safe to call on every launch.
 */
export function pushAvailable(): boolean {
  const app = loadApp();
  if (!app) {
    return false;
  }
  try {
    return app.getApps().length > 0;
  } catch {
    return false;
  }
}

/** The default messaging instance, or null when push is not available. */
export function messaging(): Messaging | null {
  if (instance !== undefined) {
    return instance;
  }
  const mod = firebaseMessaging();
  if (!mod || !pushAvailable()) {
    instance = null;
    return instance;
  }
  try {
    instance = mod.getMessaging();
  } catch (error) {
    if (__DEV__) {
      console.warn('[push] messaging() failed', error);
    }
    instance = null;
  }
  return instance;
}
