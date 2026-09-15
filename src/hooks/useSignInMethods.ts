import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getAuthUser,
  linkGoogleIdentity,
  resendSignUpConfirmation,
  unlinkGoogleIdentity,
} from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

const key = (userId: string | null) =>
  ['account', 'identities', userId] as const;

export type SignInMethods = {
  email: string | null;
  /** Proven by a confirmation code / link, or by Google having verified it. */
  emailVerified: boolean;
  hasPassword: boolean;
  google: { linked: boolean; email: string | null };
  /** How many identities the account has — Supabase refuses to unlink the last. */
  identityCount: number;
};

/**
 * Which ways into this account exist, fresh from the server.
 *
 * Linking Google needs the account's own email verified first: an unverified
 * address is a claim, not a fact, and letting a Google account attach to it
 * would let whoever typed that address in first inherit the Google user's
 * membership and library. The backend applies the same rule to its automatic
 * same-email linking; this hook applies it to the explicit one.
 */
export function useSignInMethods() {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);

  const methods = useQuery({
    queryKey: key(userId),
    enabled: Boolean(userId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<SignInMethods> => {
      const user = await getAuthUser();
      const identities = user.identities ?? [];
      const google = identities.find(
        identity => identity.provider === 'google',
      );
      const emailIdentity = identities.find(
        identity => identity.provider === 'email',
      );
      return {
        email: user.email ?? null,
        emailVerified: Boolean(user.email_confirmed_at),
        hasPassword: Boolean(emailIdentity),
        google: {
          linked: Boolean(google),
          email: (google?.identity_data?.email as string | undefined) ?? null,
        },
        identityCount: identities.length,
      };
    },
  });

  const invalidate = () =>
    void client.invalidateQueries({ queryKey: key(userId) });

  const link = useMutation({
    mutationFn: linkGoogleIdentity,
    onSuccess: invalidate,
  });

  const unlink = useMutation({
    mutationFn: unlinkGoogleIdentity,
    onSuccess: invalidate,
  });

  const resendVerification = useMutation({
    mutationFn: (email: string) => resendSignUpConfirmation(email),
  });

  return { methods, link, unlink, resendVerification };
}
