import {
  queryOptions,
  useQuery,
  type QueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { create } from 'zustand';

import { isBelowMinimum } from '@/config/appVersion';
import { DEFAULT_APP_STATUS, type AppStatus } from '@/services/appStatus';
import { getAppStatus } from '@/services/appStatusClient';
import { useAuthStore } from '@/stores/authStore';

/**
 * How often the flags are re-read while the app is open, so maintenance
 * turned on reaches a reader mid-session within a minute rather than on
 * their next launch.
 */
const OPEN_POLL_MS = 60_000;

/** How often the notice itself re-asks, so it lifts within this. */
const GATE_POLL_MS = 20_000;

/**
 * The last status the server actually answered with.
 *
 * Held outside the query cache on purpose: the cache is cleared whenever the
 * signed-in account changes, and for the beat until the next answer lands a
 * query reports its placeholder — "everything open" — which is exactly the
 * wrong thing to assume in the middle of a maintenance window. The store
 * survives the clear, so the gate never blinks off on sign-in or sign-out.
 * A failed read (offline) also falls back to it rather than to the defaults.
 */
const useLastKnownStatus = create<{ status: AppStatus | null }>(() => ({
  status: null,
}));

/**
 * The product flags, warmed under the splash and refreshed on every return
 * to the foreground. Defined once so the prefetch and the readers agree on
 * the key and the stale window.
 */
export const appStatusQuery = queryOptions({
  queryKey: ['app', 'status'],
  queryFn: ({ signal }) => getAppStatus(signal),
  staleTime: 15_000,
  retry: 1,
  retryDelay: 1_000,
  // A reader who has been held at the door and comes back to the app should
  // find out at once that it has reopened, not after the stale window.
  refetchOnWindowFocus: 'always',
  refetchInterval: OPEN_POLL_MS,
  refetchIntervalInBackground: false,
  // The flags are read before Home draws; a stale answer is a better first
  // frame than a maintenance screen that flickers in a beat later.
  placeholderData: DEFAULT_APP_STATUS,
});

export function useAppStatus(): AppStatus {
  const query = useQuery(appStatusQuery);
  const lastKnown = useLastKnownStatus(state => state.status);

  const answered = query.isPlaceholderData ? null : (query.data ?? null);
  useEffect(() => {
    if (answered) {
      useLastKnownStatus.setState({ status: answered });
    }
  }, [answered]);

  return answered ?? lastKnown ?? DEFAULT_APP_STATUS;
}

/**
 * The same status, re-asked every few seconds — for the notice itself, so
 * the moment an admin turns maintenance off every reader stuck on it walks
 * back in without touching anything. A second observer on the same query:
 * the shortest interval among observers wins, and it goes away with the
 * screen.
 */
export function useAppStatusPolling(): { fetching: boolean } {
  const query = useQuery({
    ...appStatusQuery,
    refetchInterval: GATE_POLL_MS,
  });
  return { fetching: query.isFetching };
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
