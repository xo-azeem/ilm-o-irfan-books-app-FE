import { env } from '@/config/env';
import type {
  DeletionBlockerCode,
  DeletionNotice,
  DeletionRequest,
  DeletionRequestStatus,
} from '@/services/accountDeletion';

import { supabase, toFriendlyError, unwrap } from './client';

/**
 * Account deletion requests, as the admin works them.
 *
 * The list, the decision and "run now" are all backend calls; nothing here
 * decides whether a reader may be deleted. `blockers` on each open row is the
 * backend's current answer, so an operator sees "still subscribed" before
 * pressing Approve rather than after.
 */

export type AdminDeletionRequest = DeletionRequest & {
  /** The membership as it stood when the request was filed. Always sent to admins. */
  snapshot: NonNullable<DeletionRequest['snapshot']>;
  /** Why approving would be refused right now. Empty on closed rows. */
  blockers: DeletionNotice<DeletionBlockerCode>[];
  /** False once the account is gone (completed) — or was never there. */
  profileExists: boolean;
  decidedByEmail: string | null;
};

export type AdminDeletionFilter = 'open' | DeletionRequestStatus | null;

export type AdminDeletionList = {
  rows: AdminDeletionRequest[];
  counts: Partial<Record<DeletionRequestStatus, number>>;
  graceDays: number;
};

export async function listDeletionRequests(
  filter: AdminDeletionFilter = 'open',
): Promise<AdminDeletionList> {
  const data = unwrap(
    await supabase.rpc('admin_deletion_requests', {
      p_status: filter,
      p_limit: 200,
    }),
  );
  return data as AdminDeletionList;
}

export type DeletionDecision = {
  requestId: string;
  approve: boolean;
  note?: string;
  /** Skip the grace period — the run happens on the next tick or "Run now". */
  immediate?: boolean;
};

export async function decideDeletionRequest({
  requestId,
  approve,
  note,
  immediate = false,
}: DeletionDecision): Promise<AdminDeletionRequest> {
  const { data, error } = await supabase.rpc('admin_decide_deletion_request', {
    p_request_id: requestId,
    p_approve: approve,
    p_note: note?.trim() || null,
    p_immediate: immediate,
  });
  if (error) {
    // The backend raises the blocker code as the message; its sentence is in
    // details and reads better to an operator than the code does.
    const details = (error as { details?: string | null }).details?.trim();
    throw new Error(
      details && /^[A-Z_]+$/.test(error.message.trim())
        ? details
        : toFriendlyError(error.message),
    );
  }
  return data as AdminDeletionRequest;
}

export type DeletionRunResult = {
  claimed: number;
  completed: number;
  failed: number;
  outcomes: Array<{
    id: string;
    outcome: 'completed' | 'failed';
    error: string | null;
  }>;
};

/**
 * Runs every approved request whose grace period has elapsed, now.
 *
 * The same Edge Function the database's cron tick calls, reached here with
 * the admin's JWT — so the flow works before the ops secret is configured,
 * and an operator never has to wait for the next tick.
 */
export async function runDueDeletions(): Promise<DeletionRunResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Your admin session has expired. Sign out and back in.');
  }

  const response = await fetch(
    `${env.supabaseUrl}/functions/v1/account-deletion-run`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: env.supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: '{}',
    },
  );

  const body = (await response.json().catch(() => null)) as {
    data?: DeletionRunResult;
    error?: { code?: string; message?: string };
  } | null;

  if (!response.ok || !body?.data) {
    throw new Error(
      body?.error?.message ??
        `The deletion run failed (${response.status}). Is account-deletion-run deployed?`,
    );
  }

  return body.data;
}
