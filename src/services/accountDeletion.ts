import { supabase } from '@/lib/supabase/client';

/**
 * Account deletion, as the reader sees it.
 *
 * Everything that decides — whether a request may be filed, what stops it,
 * how long the grace period is — lives in the database
 * (`20260921120000_account_deletion.sql`) and is read back here verbatim.
 * The app renders the answer; it never works it out on its own, because the
 * same rules gate the admin's approval and the executor's run, and three
 * copies of a billing rule are two too many.
 */

export type DeletionRequestStatus =
  | 'pending'
  | 'approved'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'rejected'
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
  snapshot: {
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

export type DeletionStatus = {
  /** The latest request of any status, or null when there has never been one. */
  request: DeletionRequest | null;
  /** True when no request is open and nothing blocks a new one. */
  canRequest: boolean;
  blockers: DeletionNotice<DeletionBlockerCode>[];
  warnings: DeletionNotice<DeletionWarningCode>[];
  graceDays: number;
};

/**
 * Open = the reader is somewhere in the flow and may still cancel. `failed`
 * counts: an approved run the executor could not complete (a membership
 * bought during the grace period) waits for an admin, and until then the
 * reader may still withdraw.
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

function defaultMessage(code: string): string {
  switch (code) {
    case 'REQUEST_EXISTS':
      return 'A deletion request is already open for this account.';
    case 'NO_OPEN_REQUEST':
      return 'There is no deletion request to cancel.';
    case 'REASON_TOO_LONG':
      return 'Keep the reason under 1000 characters.';
    default:
      return 'The request could not be completed.';
  }
}

export async function getDeletionStatus(): Promise<DeletionStatus> {
  const { data, error } = await supabase.rpc('account_deletion_status');
  if (error) {
    throw toError(error);
  }
  return data as DeletionStatus;
}

export async function requestAccountDeletion(
  reason: string,
): Promise<DeletionStatus> {
  const { data, error } = await supabase.rpc('request_account_deletion', {
    p_reason: reason.trim() || null,
  });
  if (error) {
    throw toError(error);
  }
  return data as DeletionStatus;
}

export async function cancelAccountDeletion(): Promise<DeletionStatus> {
  const { data, error } = await supabase.rpc('cancel_account_deletion_request');
  if (error) {
    throw toError(error);
  }
  return data as DeletionStatus;
}
