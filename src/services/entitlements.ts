import { requestData } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import type { EntitlementStatus } from '@/services/api/types';

/**
 * Reading the reader's access from the backend.
 *
 * The reducer itself lives in `services/accessState`, which imports nothing and
 * is unit tested; this module is only the round trip. Both are re-exported here
 * so every caller keeps one import.
 */
export {
  NO_ACCESS,
  REASON_COPY,
  mergeSignedPdfAccess,
  parseAccessState,
  reasonCopy,
  type AccessPayload,
  type AccessState,
} from '@/services/accessState';

/**
 * The reader's access, straight from the endpoint.
 *
 * Deliberately leaner than `getSubscription`: this is the lock's own read, so
 * it fetches the entitlement and nothing else — no plan lookup for a paywall
 * that may never be shown. It runs on sign-in, on every foreground and on every
 * (re)subscribe, so the cheapest correct call is the right one.
 *
 * There is no table fallback. `entitlements` has no `serverTime` to quote and
 * no channel to name, and a countdown anchored to the device's own clock would
 * be exactly the thing this is built to avoid.
 */
export async function getEntitlementStatus(): Promise<EntitlementStatus | null> {
  return (
    (await requestData<EntitlementStatus | null>(ENDPOINTS.entitlementsStatus, {
      auth: true,
    })) ?? null
  );
}
