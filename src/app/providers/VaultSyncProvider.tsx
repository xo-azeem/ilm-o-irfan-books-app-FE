import { useEffect, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { queryClient } from '@/lib/queryClient';
import { reconcileVault, subscribeRevocations } from '@/services/bookVault';
import { forgetPosition } from '@/services/readingPosition';
import { useAuthStore } from '@/stores/authStore';

/**
 * Keeps the books on this device in step with the books the server has.
 *
 * A download is a sealed copy of one particular file, opened with no round
 * trip — so when the admin deletes a book or replaces its PDF, nothing about
 * the copy on the device changes by itself. This asks the server about every
 * book in the vault at the moments a device is likeliest to have a
 * connection again: sign-in (and launch with a session), and every return to
 * the foreground. The vault asks about a single book behind every offline
 * open as well, so a revoked book is closed mid-read the moment it can be.
 *
 * Whatever the vault drops, from any of those, this tidies after: the reading
 * position of a deleted book (the server's row went with the book), and the
 * library and book queries that still describe the shelf as it was. A
 * replaced book keeps its position — the reader is nearer the right page
 * than page one — and is back on the shelf the moment they download it.
 */
export function VaultSyncProvider({ children }: { children: ReactNode }) {
  const userId = useAuthStore(state => state.userId);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const unsubscribe = subscribeRevocations(({ bookId, reason }) => {
      if (reason === 'removed') {
        forgetPosition(userId, bookId);
      }
      void queryClient.invalidateQueries({
        queryKey: ['catalog', 'book', bookId],
      });
      // Home stays mounted under everything, so its shelves refetch at once;
      // the Downloads and Library screens refetch on their next mount.
      void queryClient.invalidateQueries({ queryKey: ['library', userId] });
    });

    const sync = () => void reconcileVault();
    sync();

    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') {
        sync();
      }
    });

    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, [userId]);

  return <>{children}</>;
}
