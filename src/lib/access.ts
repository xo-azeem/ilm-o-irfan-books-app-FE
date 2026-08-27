import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AuthReturnTo, RootStackParamList } from '@/app/navigation/types';
import { env } from '@/config/env';
import { ROUTES } from '@/constants/routes';
import { usePdfAccessPolicy, useSubscription } from '@/hooks/useAccount';
import { useAuthStore } from '@/stores/authStore';

export function useAccess() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isAdmin = useAuthStore(state => state.isAdmin);
  const userId = useAuthStore(state => state.userId);
  const subscription = useSubscription();
  const policy = usePdfAccessPolicy();

  const freePdfAccess =
    isAdmin ||
    env.allowPdfWithoutEntitlement ||
    policy.data?.allowPdfWithoutEntitlement === true;

  const canOpenBooks = Boolean(
    isAuthenticated && (freePdfAccess || subscription.data?.active),
  );

  const waitForGate =
    isAuthenticated &&
    !freePdfAccess &&
    (policy.isLoading || subscription.isLoading);

  return {
    isAuthenticated,
    userId,
    canOpenBooks,
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
    if (state.userId === userId && state.accessCheckedFor === userId && state.roleResolved) {
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
