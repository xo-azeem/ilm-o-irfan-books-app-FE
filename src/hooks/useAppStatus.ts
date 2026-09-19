import {
  queryOptions,
  useQuery,
  type QueryClient,
} from '@tanstack/react-query';

import { isBelowMinimum } from '@/config/appVersion';
import { DEFAULT_APP_STATUS, type AppStatus } from '@/services/appStatus';
import { getAppStatus } from '@/services/appStatusClient';
import { useAuthStore } from '@/stores/authStore';

/**
 * The product flags, warmed under the splash and refreshed on every return
 * to the foreground. Defined once so the prefetch and the readers agree on
 * the key and the stale window.
 */
export const appStatusQuery = queryOptions({
  queryKey: ['app', 'status'],
  queryFn: ({ signal }) => getAppStatus(signal),
  staleTime: 60_000,
  retry: 1,
  retryDelay: 1_000,
  // The flags are read before Home draws; a stale answer is a better first
  // frame than a maintenance screen that flickers in a beat later.
  placeholderData: DEFAULT_APP_STATUS,
});

export function useAppStatus(): AppStatus {
  return useQuery(appStatusQuery).data ?? DEFAULT_APP_STATUS;
}

/** Starts the read without a screen to draw it. Never throws. */
export function prefetchAppStatus(client: QueryClient): Promise<void> {
  return client.prefetchQuery(appStatusQuery);
}

/** Forces a fresh read — the "Try again" on the maintenance screen. */
export function refetchAppStatus(client: QueryClient): Promise<unknown> {
  return client.refetchQueries({ queryKey: appStatusQuery.queryKey });
}

export type AppGate = 'maintenance' | 'update' | null;

/**
 * Which full-screen notice, if any, stands between this install and the app.
 *
 * Admins are never gated: the switches live in the admin tool, and an admin
 * who set the version floor above their own build, or turned maintenance on
 * to check it, must always be able to get back in and turn it off. The
 * update notice wins over maintenance — a build too old to be supported may
 * not even draw the maintenance copy correctly.
 */
export function useAppGate(): AppGate {
  const status = useAppStatus();
  const isAdmin = useAuthStore(state => state.isAdmin);

  if (isAdmin) {
    return null;
  }
  if (isBelowMinimum(status.minSupportedVersion)) {
    return 'update';
  }
  if (status.maintenanceMode) {
    return 'maintenance';
  }
  return null;
}

/** Whether the sign-up form is offered. Admins see it regardless. */
export function useSignupOpen(): boolean {
  const status = useAppStatus();
  return status.signupEnabled;
}
