import { env } from '@/config/env';
import { supabase } from '@/lib/supabase/client';
import { ApiError, isEndpointMissing, readError } from '@/services/api/errors';

export { ApiError, isEndpointMissing };

/**
 * Client for the backend Edge Function API.
 *
 * The backend moved its read/write surface from raw PostgREST table access to
 * `/functions/v1/<name>` endpoints (see the backend's `_shared/endpoint-manifest.ts`).
 * Every endpoint answers with one of three envelopes:
 *
 *   - `{ data: T }`                     single-record and non-paginated reads
 *   - `{ data: T[], page, pageSize, … }` paginated list reads
 *   - `{ error: { code, message } }`     failures — some older handlers still
 *                                        answer `{ error: 'text', code }`
 *
 * `request` normalises all three so callers only ever see a value or an
 * `ApiError` carrying the backend's machine-readable `code`.
 */

const FUNCTIONS_BASE = `${env.supabaseUrl}/functions/v1`;
const REQUEST_TIMEOUT_MS = 15_000;

/** Matches the backend's `PaginatedResult<T>` from `_shared/pagination.ts`. */
export type Page<T> = {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number | null;
  totalPages: number | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PageParams = {
  page?: number;
  /** The backend caps this at 100. */
  pageSize?: number;
};

type QueryValue = string | number | boolean | null | undefined;

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, QueryValue>;
  body?: unknown;
  /**
   * `true` for endpoints the backend marks `verify_jwt = true`: the call fails
   * fast with a signed-out message instead of burning a round trip on a 401.
   */
  auth?: boolean;
  signal?: AbortSignal;
};

function buildUrl(name: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${FUNCTIONS_BASE}/${name}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value != null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function accessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Forces a new access token, for the one retry a 401 is allowed.
 *
 * `getSession` hands back whatever is cached — including the very token the
 * gateway has just rejected — so a refresh has to be asked for explicitly.
 * `null` means there was no refresh token left to spend, which makes the 401
 * final rather than the first turn of a loop.
 */
async function refreshedAccessToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    return error ? null : (data.session?.access_token ?? null);
  } catch {
    return null;
  }
}

/**
 * One HTTP round trip to an Edge Function, with nothing retried.
 *
 * Returns the status alongside the parsed body instead of throwing, because the
 * caller has to be able to tell a 401 — the one status worth a second attempt —
 * from every other failure before deciding to raise it.
 */
async function send(
  name: string,
  options: RequestOptions,
  token: string | null,
): Promise<{ status: number; payload: unknown; ok: boolean }> {
  const { method = 'GET', query, body, signal } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', () => controller.abort(), {
        once: true,
      });
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(name, query), {
      method,
      headers: {
        // The gateway needs the anon key even when a user token is present.
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${token ?? env.supabaseAnonKey}`,
        ...(body === undefined ? null : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (signal?.aborted || (error as Error)?.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(
      'Could not reach the server. Check your connection and try again.',
      0,
      'NETWORK_ERROR',
    );
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  return { status: response.status, payload, ok: response.ok };
}

/**
 * Calls one Edge Function and returns its parsed body.
 *
 * Errors always surface as `ApiError`, so callers can branch on `.code` rather
 * than string-matching a message.
 *
 * **Every 401 is treated as a stale session**, refreshed once and retried — and
 * deliberately without looking at the code that came back. An expired or
 * malformed JWT is rejected by the Supabase gateway *before* the function runs,
 * and that reply has no error envelope at all: it is a top-level
 * `{ code: 'UNAUTHORIZED_INVALID_JWT_FORMAT', message: 'Invalid JWT' }`, so
 * `json.error?.code` is `undefined` and any attempt to match `AUTH_REQUIRED`
 * misses it. The status is the only reliable signal. One retry, never two: if
 * the refreshed token is refused as well, the session is genuinely finished and
 * the 401 is raised for the auth layer to act on.
 */
export async function request<T>(
  name: string,
  options: RequestOptions = {},
): Promise<T> {
  const { auth = false } = options;

  const token = await accessToken();
  if (auth && !token) {
    throw new ApiError('You must be signed in.', 401, 'AUTH_REQUIRED');
  }

  let result = await send(name, options, token);

  // Only a call that carried a user token can be rescued by a refresh. A public
  // read authorised with the anon key has no session behind it, so a 401 there
  // is a project configuration problem and retrying it would only double it.
  if (result.status === 401 && token) {
    const refreshed = await refreshedAccessToken();
    if (refreshed) {
      result = await send(name, options, refreshed);
    }
  }

  if (!result.ok) {
    throw readError(result.payload, result.status);
  }

  // A 200 can still carry an error envelope on the handlers that answer 410.
  if (
    result.payload &&
    typeof result.payload === 'object' &&
    'error' in result.payload
  ) {
    throw readError(result.payload, result.status);
  }

  return result.payload as T;
}

/**
 * Endpoints the gateway has already reported as undeployed.
 *
 * Cleared on reload, which is the right lifetime: a deploy that lands while the
 * app is open is picked up on the next launch, and until then the app is not
 * paying a failed round trip on every single read.
 */
const undeployedEndpoints = new Set<string>();

/**
 * Runs an endpoint call, falling back to the direct PostgREST query when that
 * endpoint is not deployed on this project.
 *
 * The backend added its Edge Function layer to the repo ahead of deploying it,
 * so a given environment may be running either shape. Only a missing *function*
 * triggers the fallback — a real failure from a deployed endpoint still throws,
 * because silently rerunning it against the tables would hide the fault.
 */
export async function withEndpoint<T>(
  name: string,
  call: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  if (undeployedEndpoints.has(name)) {
    return fallback();
  }

  try {
    return await call();
  } catch (error) {
    if (!isEndpointMissing(error)) {
      throw error;
    }

    undeployedEndpoints.add(name);
    if (__DEV__) {
      console.warn(
        `[api] "${name}" is not deployed on this Supabase project — reading from the tables instead. Deploy the function to use the endpoint.`,
      );
    }
    return fallback();
  }
}

/** Unwraps the `{ data: T }` envelope used by single-record endpoints. */
export async function requestData<T>(
  name: string,
  options: RequestOptions = {},
): Promise<T> {
  const payload = await request<{ data: T }>(name, options);
  return payload?.data as T;
}

/** Unwraps a paginated endpoint, tolerating a bare array from older handlers. */
export async function requestPage<T>(
  name: string,
  options: RequestOptions & { page?: number; pageSize?: number } = {},
): Promise<Page<T>> {
  const { page, pageSize, query, ...rest } = options;
  const payload = await request<Page<T> | T[]>(name, {
    ...rest,
    query: { ...query, page, pageSize },
  });

  if (Array.isArray(payload)) {
    return {
      data: payload,
      page: page ?? 1,
      pageSize: pageSize ?? payload.length,
      totalCount: payload.length,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
  }

  return {
    data: payload?.data ?? [],
    page: payload?.page ?? page ?? 1,
    pageSize: payload?.pageSize ?? pageSize ?? 20,
    totalCount: payload?.totalCount ?? null,
    totalPages: payload?.totalPages ?? null,
    hasNextPage: payload?.hasNextPage ?? false,
    hasPreviousPage: payload?.hasPreviousPage ?? false,
  };
}

/** Convenience for list endpoints whose callers do not page. */
export async function requestList<T>(
  name: string,
  options: RequestOptions & { page?: number; pageSize?: number } = {},
): Promise<T[]> {
  return (await requestPage<T>(name, options)).data;
}
