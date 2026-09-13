import { firebaseMessaging, messaging } from './firebase';

/**
 * The background handler, registered from `index.js` before the app root.
 *
 * Every push this backend sends carries a `notification` payload, so the OS
 * has already drawn the tray entry by the time this runs (Android delivers
 * the data half to a headless JS task; iOS only wakes the app for
 * content-available messages, which these are not). There is nothing to
 * draw and nothing worth fetching from a headless context: the app refetches
 * its shelves and reconciles the vault on every return to the foreground,
 * and a tap is routed by `PushProvider`. Registering an empty handler still
 * matters — without one the library logs a warning for every background
 * delivery on Android.
 */
export function registerPushBackgroundHandler(): void {
  const mod = firebaseMessaging();
  const m = messaging();
  if (!mod || !m) {
    return;
  }
  try {
    mod.setBackgroundMessageHandler(m, async () => {});
  } catch (error) {
    if (__DEV__) {
      console.warn('[push] background handler registration failed', error);
    }
  }
}
