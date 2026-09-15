import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cancelAccountDeletion,
  getDeletionStatus,
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
 */
export function useAccountDeletion() {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);

  const status = useQuery({
    queryKey: key(userId),
    queryFn: getDeletionStatus,
    enabled: Boolean(userId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const seed = (next: DeletionStatus) => {
    client.setQueryData(key(userId), next);
  };

  const request = useMutation({
    mutationFn: (reason: string) => requestAccountDeletion(reason),
    onSuccess: seed,
    // A refused request (a blocker appeared since the screen loaded) means
    // the status we show is stale too.
    onError: () => void status.refetch(),
  });

  const cancel = useMutation({
    mutationFn: cancelAccountDeletion,
    onSuccess: seed,
    onError: () => void status.refetch(),
  });

  return { status, request, cancel };
}
