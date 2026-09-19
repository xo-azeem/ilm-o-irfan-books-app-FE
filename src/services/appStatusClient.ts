import { requestData, withEndpoint } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import {
  DEFAULT_APP_STATUS,
  parseAppStatus,
  type AppStatus,
  type AppStatusPayload,
} from '@/services/appStatus';

/**
 * Reads the product flags.
 *
 * Every read carries a changing query value, so no HTTP cache between the
 * phone and the function can answer it: when an admin turns maintenance off,
 * the very next poll or "Try again" sees it. It is one small row, read on
 * launch, on foreground and once a minute — nothing worth caching against.
 *
 * A project without `app-status` deployed answers with the defaults — the
 * app behaves exactly as it did before the flags existed — and a real
 * failure from a deployed endpoint still throws, so the query can retry it
 * and the readers fall back to the last answer they had.
 */
export function getAppStatus(signal?: AbortSignal): Promise<AppStatus> {
  return withEndpoint(
    ENDPOINTS.appStatus,
    async () =>
      parseAppStatus(
        await requestData<AppStatusPayload>(ENDPOINTS.appStatus, {
          signal,
          query: { t: Date.now() },
        }),
      ),
    async () => DEFAULT_APP_STATUS,
  );
}
