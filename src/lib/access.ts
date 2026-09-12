import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AuthReturnTo, RootStackParamList } from '@/app/navigation/types';
import { ROUTES } from '@/constants/routes';
import { useAccessStore } from '@/stores/accessStore';
import { useAuthStore } from '@/stores/authStore';

/**
 * The one gate every reader entry point asks.
 *
 * Two ways in and no third: the admin role, or a live membership. This mirrors
 * `get-signed-pdf` exactly — admins may open anything, including unpublished
 * drafts, and everyone else needs an active subscription. There is no build
 * flag, no `__DEV__` bypass and no server-side override, so the app can never
 * offer a book the backend would then refuse to sign.
 *
 * What it does **not** look at:
 *
 *   · `status`. `trial`, `cancelled`, `grace` and `billing_issue` all still
 *     grant access — a cancelled membership is paid through to its end date,
 *     and a failing card is inside a period already paid for. Branching on
 *     `status === 'active'` is the exact bug the backend just removed.
 *   · a book's `is_premium`. That is a catalogue label and a Discover filter,
 *     not an access signal — every book needs a membership.
 *   · whether a file is already downloaded. Bytes on disk are not permission.
 *
 * `expired` is the local countdown having passed `expiresAt`, which is what
 * locks a reader who has been offline since before their membership ended.
 */
export function useAccess() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isAdmin = useAuthStore(state => state.isAdmin);
  const userId = useAuthStore(state => state.userId);

  const canAccessPremium = useAccessStore(
    state => state.state.canAccessPremium,
  );
  const expired = useAccessStore(state => state.expired);
  const resolved = useAccessStore(state => state.resolved);
  const reason = useAccessStore(state => state.state.reason);
  const expiresAt = useAccessStore(state => state.state.expiresAt);

  const canOpenBooks = Boolean(
    isAuthenticated && !expired && (isAdmin || canAccessPremium),
  );

  // An admin is already through, so only a non-admin waits on the entitlement.
  const waitForGate = isAuthenticated && !isAdmin && !resolved;

  return {
    isAuthenticated,
    userId,
    canOpenBooks,
    /** Why, for the paywall's wording. Never for the decision. */
    reason,
    /** When access ends. `null` never expires — lifetime, or an admin. */
    expiresAt,
    subscriptionReady: !waitForGate,
    isSubscriptionLoading: Boolean(waitForGate),
  };
}

export function navigateToLogin(
  navigation: NativeStackNavigationProp<RootStackParamList>,
  returnTo?: AuthReturnTo,
) {
  navigation.navigate(ROUTES.LOGIN, returnTo ? { returnTo } : undefined);
}

export async function waitForAccessCheck(userId: string, timeoutMs = 8000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const state = useAuthStore.getState();
    if (
      state.userId === userId &&
      state.accessCheckedFor === userId &&
      state.roleResolved
    ) {
      return state;
    }
    await new Promise<void>(resolve => {
      setTimeout(resolve, 40);
    });
  }

  return useAuthStore.getState();
}

export function resumeAfterAuth(
  navigation: NativeStackNavigationProp<RootStackParamList>,
  returnTo?: AuthReturnTo,
) {
  if (useAuthStore.getState().isAdmin) {
    return;
  }

  if (returnTo?.bookId) {
    navigation.reset({
      index: 1,
      routes: [
        { name: ROUTES.MAIN_TABS },
        { name: ROUTES.BOOK_DETAIL, params: { bookId: returnTo.bookId } },
      ],
    });
    return;
  }

  navigation.reset({
    index: 0,
    routes: [{ name: ROUTES.MAIN_TABS }],
  });
}
