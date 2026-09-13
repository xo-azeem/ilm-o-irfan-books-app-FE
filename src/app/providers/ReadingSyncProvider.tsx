import { useEffect, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { queryClient } from '@/lib/queryClient';
import { flushPositions, hydratePositions } from '@/services/readingPosition';
import { useAuthStore } from '@/stores/authStore';

/**
 * Keeps the on-device reading positions and the server's in step.
 *
 * Two moments matter, and both run the same two steps in the same order:
 *
 *   1. push — anything recorded on this device that the server has not seen
 *      (a page turned just before the app was killed, a whole sitting offline);
 *   2. pull — every position the server holds, so each book on every shelf can
 *      open on its page with no round trip.
 *
 * Push before pull, so the server's list already includes what this device
 * knew. The moments are sign-in (and launch with a session) and every return
 * to the foreground, which is also the first chance after a network outage.
 *
 * Leaving the foreground is a third moment, push only: a reader who turns a
 * page and swipes the app away has the position on disk already, and the
 * seconds the OS allows on the way to the background are usually enough to
 * get it to the server too, rather than waiting for the next launch.
 *
 * The reader screen does its own, finer-grained push while a book is open;
 * this is the backstop that makes nothing depend on that screen unmounting
 * cleanly.
 */
export function ReadingSyncProvider({ children }: { children: ReactNode }) {
  const userId = useAuthStore(state => state.userId);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let cancelled = false;

    async function sync() {
      await flushPositions(userId as string);
      if (cancelled) {
        return;
      }
      await hydratePositions(userId as string);
      if (!cancelled) {
        // The shelves read their page captions from the rows this just merged.
        void queryClient.invalidateQueries({ queryKey: ['library', userId] });
      }
    }

    void sync();

    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') {
        void sync();
      } else if (next === 'background') {
        void flushPositions(userId as string);
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [userId]);

  return <>{children}</>;
}
