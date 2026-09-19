import { requestData, withEndpoint } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import {
  DEFAULT_APP_STATUS,
  parseAppStatus,
  type AppStatus,
  type AppStatusPayload,
} from '@/services/appStatus';

/**
 * Reads the product flags. A project without `app-status` deployed answers
 * with the defaults — the app behaves exactly as it did before the flags
 * existed — and a real failure from a deployed endpoint still throws, so the
 * query can retry it.
 */
export function getAppStatus(signal?: AbortSignal): Promise<AppStatus> {
  return withEndpoint(
    ENDPOINTS.appStatus,
    async () =>
      parseAppStatus(
        await requestData<AppStatusPayload>(ENDPOINTS.appStatus, { signal }),
      ),
    async () => DEFAULT_APP_STATUS,
  );
}
