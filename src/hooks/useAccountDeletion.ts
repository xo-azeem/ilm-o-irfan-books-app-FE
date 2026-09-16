import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cancelAccountDeletion,
  getDeletionStatus,
  isStaleDeletionState,
  requestAccountDeletion,
  type DeletionStatus,
} from '@/services/accountDeletion';
import { useAuthStore } from '@/stores/authStore';

const key = (userId: string | null) => ['account', 'deletion', userId] as const;

/**
 * The reader's deletion request, and the two moves they can make on it.
 *
 * Refetched on every focus of the screen that shows it: an admin's decision
 * arrives by push, but a reader who has notifications off should still see
 * "approved — deletes on the 23rd" the moment they look.
 *
 * Two refusals are not errors. `REQUEST_EXISTS` on a request and
 * `REQUEST_NOT_OPEN` on a withdrawal both mean the screen was behind the
 * server — a push landed, or another device acted — so the answer is to
 * re-read the status, not to show a dialog. The mutations still reject, so
 * a caller can tell; `isStaleDeletionState` names the case.
 */
export function useAccountDeletion() {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);
  const signOut = useAuthStore(state => state.signOut);

  const status = useQuery({
    queryKey: key(userId),
    queryFn: getDeletionStatus,
    enabled: Boolean(userId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // `completed` means the account is gone; the next token refresh would
  // fail anyway, but the reader should not be left looking at a profile
  // that no longer exists.
  const completed = status.data?.request?.status === 'completed';
  useEffect(() => {
    if (completed) {
      void signOut();
    }
  }, [completed, signOut]);

  const seed = (next: DeletionStatus) => {
    client.setQueryData(key(userId), next);
    // The RPC answers with the row it acted on; the status call is the one
    // that knows whether that row is still the current one.
    void client.invalidateQueries({ queryKey: key(userId) });
  };

  const request = useMutation({
    mutationFn: (reason: string) => requestAccountDeletion(reason),
    onSuccess: seed,
    // A refused request (a blocker appeared since the screen loaded, or a
    // request already exists) means the status we show is stale too.
    onError: () => void status.refetch(),
  });

  const cancel = useMutation({
    mutationFn: cancelAccountDeletion,
    onSuccess: (next: DeletionStatus) => {
      // Withdrawn = no current request. The RPC hands back the row it
      // closed; the screen wants "none" now, and the re-read confirms it.
      seed({ ...next, request: null, canRequest: true });
    },
    onError: () => void status.refetch(),
  });

  return { status, request, cancel, isStale: isStaleDeletionState };
}
