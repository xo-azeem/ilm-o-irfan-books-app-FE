import { useQuery } from '@tanstack/react-query';

import {
  getRecommendations,
  HOME_RECOMMENDATIONS,
  type RecommendationParams,
} from '@/services/recommendations';
import { useAuthStore } from '@/stores/authStore';

export { ALL_RECOMMENDATIONS, HOME_RECOMMENDATIONS } from '@/services/recommendations';

/**
 * The reader's "Because you read …" rails.
 *
 * Signed-in only: the endpoint answers 401 to an anonymous caller, so the
 * query stays disabled rather than firing and swallowing the error, and the
 * section is simply absent for a signed-out reader.
 *
 * The result is per-reader and never leaves memory — the query cache has no
 * persister, the key carries the user id, and `AuthSessionProvider` clears the
 * whole cache when the identity behind it changes.
 *
 * Nothing here triggers a rebuild. The backend refreshes a reader's
 * recommendations off the signals the app already sends — `reading-progress`
 * writes above all — at most every half hour and at least once a day, which is
 * what `staleTime` mirrors. There is deliberately no refresh action and no
 * polling: neither could produce a newer answer than that.
 */
export function useRecommendations(params: RecommendationParams = HOME_RECOMMENDATIONS) {
  const userId = useAuthStore(state => state.userId);
  const { limit = null, sections = null, perSection = null } = params;

  return useQuery({
    queryKey: ['recommendations', userId, { limit, sections, perSection }],
    queryFn: ({ signal }) => getRecommendations({ ...params, signal }),
    enabled: Boolean(userId),
    staleTime: 30 * 60_000,
    gcTime: 30 * 60_000,
    // A reader with no recommendations is an ordinary state, not a fault worth
    // retrying; Home draws the rest of itself either way.
    retry: false,
  });
}
