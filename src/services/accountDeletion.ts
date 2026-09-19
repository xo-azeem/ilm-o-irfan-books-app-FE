import { supabase } from '@/lib/supabase/client';
import { strings } from '@/i18n/strings';

/**
 * Account deletion, as the reader sees it.
 *
 * Everything that decides — whether a request may be filed, what stops it,
 * how long the grace period is — lives in the database
 * (`20260921120000_account_deletion.sql`) and is read back here verbatim.
 * The app renders the answer; it never works it out on its own, because the
 * same rules gate the admin's approval and the executor's run, and three
 * copies of a billing rule are two too many.
 *
 * Three RPCs, one shape:
 *
 *   account_deletion_status()                → the current request, or null
 *   request_account_deletion({ p_reason })   → the request
 *   cancel_account_deletion_request()        → the request it withdrew
 *
 * A refusal is a PostgREST error whose `message` is a stable token
 * (`SUBSCRIPTION_ACTIVE`, `REQUEST_EXISTS`, …) and whose `details` is the
 * sentence to show. The token is never shown; see `DeletionRequestError`.
 */

export type DeletionRequestStatus =
  | 'pending'
  | 'approved'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'rejected'
  /** Withdrawn by the reader. Older deployments report it; current ones answer null. */
  | 'cancelled';

export type DeletionRequest = {
  id: string;
  userId: string;
  email: string | null;
  fullName: string | null;
  reason: string | null;
  status: DeletionRequestStatus;
  requestedAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  decisionNote: string | null;
  /** When an approved request may run — the end of the grace period. */
  scheduledFor: string | null;
  completedAt: string | null;
  attempts: number;
  lastAttemptAt: string | null;
  lastError: string | null;
  snapshot?: {
    entitlementStatus?: string | null;
    expiresAt?: string | null;
    store?: string | null;
    planName?: string | null;
  };
};

/** Why a request is refused. The codes are the backend's contract. */
export type DeletionBlockerCode =
  'SUBSCRIPTION_ACTIVE' | 'BILLING_UNRESOLVED' | 'ADMIN_ACCOUNT';

/** What to say before the reader confirms. None of these stop the request. */
export type DeletionWarningCode =
  'PAID_TIME_FORFEITED' | 'COMP_ACCESS_LOST' | 'DOWNLOADS_REMOVED';

export type DeletionNotice<C extends string = string> = {
  code: C;
  message: string;
  expiresAt?: string | null;
  store?: string | null;
  count?: number;
};

/** The longest reason the backend accepts; the form stops at the same count. */
export const DELETION_REASON_MAX_LENGTH = 1000;

/** The grace period between approval and the run, unless an admin shortens it. */
export const DELETION_GRACE_DAYS = 7;

export type DeletionStatus = {
  /** The latest request of any status, or null when there is none. */
  request: DeletionRequest | null;
  /** True when no request is open. A blocker still surfaces on the request itself. */
  canRequest: boolean;
  /** Known ahead of time only on a deployment that pre-checks; otherwise empty. */
  blockers: DeletionNotice<DeletionBlockerCode>[];
  warnings: DeletionNotice<DeletionWarningCode>[];
  graceDays: number;
};

/**
 * Open = the reader is somewhere in the flow. `pending` and `approved` may
 * still be withdrawn; `processing` and `failed` are the executor's — the
 * reader only watches.
 */
export function isOpenDeletionRequest(
  request: DeletionRequest | null | undefined,
): boolean {
  return (
    request?.status === 'pending' ||
    request?.status === 'approved' ||
    request?.status === 'processing' ||
    request?.status === 'failed'
  );
}

/** The two states the reader may still back out of. */
export function isWithdrawableDeletionRequest(
  request: DeletionRequest | null | undefined,
): boolean {
  return request?.status === 'pending' || request?.status === 'approved';
}

/**
 * The backend raises its codes as the error *message* with the sentence in
 * *details*. PostgREST forwards both; this turns them into one Error whose
 * message is the sentence and whose `code` is the code.
 */
export class DeletionRequestError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'DeletionRequestError';
    this.code = code;
  }
}

/** True for the two refusals that mean "the screen is stale", not "it failed". */
export function isStaleDeletionState(error: unknown): boolean {
  return (
    error instanceof DeletionRequestError &&
    (error.code === 'REQUEST_EXISTS' ||
      error.code === 'REQUEST_NOT_OPEN' ||
      error.code === 'NO_OPEN_REQUEST')
  );
}

/** The refusals that point at the store rather than at this screen. */
export function isBillingBlocker(error: unknown): boolean {
  return (
    error instanceof DeletionRequestError &&
    (error.code === 'SUBSCRIPTION_ACTIVE' ||
      error.code === 'BILLING_UNRESOLVED')
  );
}

function toError(error: {
  message: string;
  details?: string | null;
  code?: string;
}): Error {
  const code = error.message.trim();
  if (/^[A-Z_]+$/.test(code)) {
    return new DeletionRequestError(
      code,
      error.details?.trim() || defaultMessage(code),
    );
  }
  return new Error(error.message);
}

/** Fallback sentences, for a refusal that arrives without `details`. Never the token. */
function defaultMessage(code: string): string {
  const s = strings().services.deletion;
  switch (code) {
    case 'REQUEST_EXISTS':
      return s.requestExists;
    case 'REQUEST_NOT_OPEN':
    case 'NO_OPEN_REQUEST':
      return s.nothingToWithdraw;
    case 'REASON_TOO_LONG':
      return s.reasonTooLong(DELETION_REASON_MAX_LENGTH);
    case 'SUBSCRIPTION_ACTIVE':
      return s.subscriptionActive;
    case 'BILLING_UNRESOLVED':
      return s.billingUnresolved;
    case 'ADMIN_ACCOUNT':
      return s.adminAccount;
    default:
      return s.fallback;
  }
}

/**
 * One status from either answer the RPCs have given.
 *
 * Current deployments answer with the request row itself (or null); the
 * previous ones wrapped it as `{ request, canRequest, blockers, warnings,
 * graceDays }`. Both are accepted so the screen reads one shape.
 */
function toStatus(data: unknown): DeletionStatus {
  const wrapped =
    data && typeof data === 'object' && 'request' in (data as object)
      ? (data as Partial<DeletionStatus>)
      : null;

  const request = wrapped
    ? (wrapped.request ?? null)
    : data && typeof data === 'object' && 'status' in (data as object)
      ? (data as DeletionRequest)
      : null;

  return {
    request,
    canRequest: wrapped?.canRequest ?? !isOpenDeletionRequest(request),
    blockers: wrapped?.blockers ?? [],
    warnings: wrapped?.warnings ?? [],
    graceDays: wrapped?.graceDays ?? DELETION_GRACE_DAYS,
  };
}

export async function getDeletionStatus(): Promise<DeletionStatus> {
  const { data, error } = await supabase.rpc('account_deletion_status');
  if (error) {
    throw toError(error);
  }
  return toStatus(data);
}

export async function requestAccountDeletion(
  reason: string,
): Promise<DeletionStatus> {
  const trimmed = reason.trim();
  if (trimmed.length > DELETION_REASON_MAX_LENGTH) {
    throw new DeletionRequestError(
      'REASON_TOO_LONG',
      defaultMessage('REASON_TOO_LONG'),
    );
  }
  const { data, error } = await supabase.rpc('request_account_deletion', {
    p_reason: trimmed || null,
  });
  if (error) {
    throw toError(error);
  }
  return toStatus(data);
}

export async function cancelAccountDeletion(): Promise<DeletionStatus> {
  const { data, error } = await supabase.rpc('cancel_account_deletion_request');
  if (error) {
    throw toError(error);
  }
  return toStatus(data);
}
