import { createNavigationContainerRef } from '@react-navigation/native';

import { ADMIN_ROUTES, ROUTES } from '@/constants/routes';
import type { PushIntent } from '@/services/push/payload';
import { useAuthStore } from '@/stores/authStore';

import type { RootStackParamList } from './types';

/**
 * A handle on the root navigator for the few things that navigate from
 * outside the tree — today, a tapped push notification.
 *
 * A tap can arrive before there is anything to navigate in: the app is
 * cold-starting, the splash is still up, or the reader is an admin looking
 * at the admin tool (whose stack has none of these routes). The intent is
 * therefore parked and replayed once the shell it belongs in reports itself
 * ready, which `RootNavigator` does from an effect. One intent at a time —
 * a second tap simply replaces the first.
 *
 * Two shells, two readiness flags. Reader intents wait for the consumer
 * shell; the admin tool's own push (a deletion request) waits for the admin
 * shell, and an admin who is using the app as a reader is switched back to
 * the tool first, so the tap lands where the work is.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Where a deep link or a notification wants to go. Push intents come from the
 * notification payload; the rest are the app's own (a password-recovery link
 * that has just signed the reader in and needs the new-password screen).
 */
export type NavIntent = PushIntent | { route: 'resetPassword' };

let pending: NavIntent | null = null;
let consumerShellReady = false;
let adminShellReady = false;

/** The one intent that lands in the admin tool rather than the reader app. */
function isAdminIntent(intent: NavIntent): boolean {
  return intent.route === 'adminDeletions';
}

function perform(intent: NavIntent): void {
  switch (intent.route) {
    case 'adminDeletions':
      // The tab navigator is the admin root, so the tab is the first hop.
      // `initial: false` keeps the People list under the segment even when
      // that tab has never been opened.
      (
        navigationRef as unknown as {
          navigate: (name: string, params?: object) => void;
        }
      ).navigate(ADMIN_ROUTES.PEOPLE, {
        screen: ADMIN_ROUTES.PEOPLE_HOME,
        params: { segment: 'deletions' },
        initial: false,
      });
      return;
    case 'resetPassword':
      navigationRef.navigate(ROUTES.RESET_PASSWORD, { viaLink: true });
      return;
    case 'book':
      navigationRef.navigate(ROUTES.BOOK_DETAIL, { bookId: intent.bookId });
      return;
    case 'collection':
      navigationRef.navigate(ROUTES.COLLECTION, {
        collectionId: intent.collectionId,
      });
      return;
    case 'home':
      navigationRef.navigate(ROUTES.MAIN_TABS, { screen: ROUTES.HOME });
      return;
    case 'library':
      navigationRef.navigate(ROUTES.MAIN_TABS, { screen: ROUTES.MY_LIBRARY });
      return;
    case 'membership':
      navigationRef.navigate(ROUTES.MAIN_TABS, {
        screen: ROUTES.PROFILE,
        params: { screen: 'Subscription' },
      });
      return;
    case 'privacy':
      navigationRef.navigate(ROUTES.MAIN_TABS, {
        screen: ROUTES.PROFILE,
        params: { screen: 'PrivacySecurity' },
      });
      return;
  }
}

function flush(): void {
  if (!pending || !navigationRef.isReady()) {
    return;
  }
  if (isAdminIntent(pending) ? !adminShellReady : !consumerShellReady) {
    return;
  }
  const intent = pending;
  pending = null;
  try {
    perform(intent);
  } catch (error) {
    if (__DEV__) {
      console.warn('[push] navigation failed', error);
    }
  }
}

/** Navigates to what a notification points at, now or when the app can. */
export function openPushIntent(intent: NavIntent | null): void {
  if (!intent) {
    return;
  }
  if (isAdminIntent(intent)) {
    const auth = useAuthStore.getState();
    // Not an admin any more: nothing to open, and nowhere to open it.
    if (!auth.isAdmin) {
      return;
    }
    // The flag flips the shell; the intent is replayed once it reports in.
    if (auth.viewingAsReader) {
      auth.setViewingAsReader(false);
    }
  }
  pending = intent;
  flush();
}

/**
 * Told by `RootNavigator` whenever the consumer shell mounts or unmounts.
 * The admin tool and first-run have nowhere for a push to land.
 */
export function setConsumerShellReady(ready: boolean): void {
  consumerShellReady = ready;
  flush();
}

/** Told by `RootNavigator` whenever the admin tool mounts or unmounts. */
export function setAdminShellReady(ready: boolean): void {
  adminShellReady = ready;
  flush();
}

/** `NavigationContainer`'s `onReady`. */
export function onNavigationReady(): void {
  flush();
}
