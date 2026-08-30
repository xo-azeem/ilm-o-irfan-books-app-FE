/**
 * Error shapes returned by the backend, and how to tell them apart.
 *
 * Kept free of React Native imports so the parsing rules can be unit tested
 * without a native runtime — they are subtle enough to be worth locking down.
 */

export class ApiError extends Error {
  /** Backend error code, e.g. `PREMIUM_REQUIRED`, `NOT_FOUND`. */
  readonly code?: string;
  readonly status: number;
  /**
   * True when the functions gateway answered, not a function handler.
   *
   * This is the only way to tell "this function is not deployed" from "this
   * function ran and reported NOT_FOUND": both are a 404 carrying the code
   * `NOT_FOUND`, and only the envelope differs. See `readError`.
   */
  readonly fromGateway: boolean;

  constructor(message: string, status: number, code?: string, fromGateway = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fromGateway = fromGateway;
  }
}

/**
 * Pulls a message and a code out of whichever error envelope was used.
 *
 * Three shapes are in play:
 *
 *   `{ error: { code, message } }`  the current handlers, via `_shared/http.ts`
 *   `{ error: 'text', code }`       older handlers, still deployed on some projects
 *   `{ code, message }`             the gateway itself — no `error` key at all
 */
export function readError(payload: unknown, status: number): ApiError {
  const body = (payload ?? {}) as {
    error?: unknown;
    code?: unknown;
    message?: unknown;
  };
  const raw = body.error;

  if (typeof raw === 'string') {
    return new ApiError(raw, status, typeof body.code === 'string' ? body.code : undefined);
  }

  if (raw && typeof raw === 'object') {
    const shaped = raw as { code?: unknown; message?: unknown };
    return new ApiError(
      typeof shaped.message === 'string' ? shaped.message : `Request failed (${status}).`,
      status,
      typeof shaped.code === 'string'
        ? shaped.code
        : typeof body.code === 'string'
          ? body.code
          : undefined,
    );
  }

  // No `error` key at all: this came from the functions gateway rather than a
  // handler, as a bare `{ code, message }`. That is how an undeployed function
  // reports itself — and it uses the same `NOT_FOUND` code a live handler uses
  // for a missing book, so the envelope is what distinguishes them.
  if (typeof body.message === 'string') {
    return new ApiError(
      body.message,
      status,
      typeof body.code === 'string' ? body.code : undefined,
      true,
    );
  }

  return new ApiError(`Request failed (${status}).`, status);
}

/**
 * True when the function itself is absent, not when a deployed one 404s.
 *
 * `fromGateway` is load-bearing: the handlers answer a missing book, profile or
 * highlight with `{ error: { code: 'NOT_FOUND' } }` and the same 404 status, so
 * matching on the code alone would retire a perfectly healthy endpoint the
 * first time a reader opened a book that had been unpublished.
 */
export function isEndpointMissing(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 404 &&
    error.code === 'NOT_FOUND' &&
    error.fromGateway
  );
}
