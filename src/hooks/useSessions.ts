import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  listSessions,
  revokeSession,
  signOutOtherDevices,
  type AuthSession,
} from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

const key = (userId: string | null) => ['account', 'sessions', userId] as const;

/**
 * The devices signed in to this account, straight from Supabase's session
 * table, and the two ways to sign one out. The current device is never
 * revoked here — that is Sign out, which also clears the app's own state.
 */
export function useSessions() {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);

  const sessions = useQuery({
    queryKey: key(userId),
    queryFn: listSessions,
    enabled: Boolean(userId),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const revoke = useMutation({
    mutationFn: (sessionId: string) => revokeSession(sessionId),
    onSuccess: (next: AuthSession[]) => client.setQueryData(key(userId), next),
    onError: () => void sessions.refetch(),
  });

  const signOutOthers = useMutation({
    mutationFn: signOutOtherDevices,
    onSettled: () => void sessions.refetch(),
  });

  return { sessions, revoke, signOutOthers };
}
