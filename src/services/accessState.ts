import { strings } from '@/i18n/strings';
import type {
  AccessEventRow,
  AccessReason,
  EntitlementRealtime,
  EntitlementStatus,
  SignedPdfAccess,
} from '@/services/api/types';

/**
 * The reader's access, reduced to what the app actually decides on.
 *
 * Deliberately free of the API client and of React Native, so the reducer can be
 * unit tested directly. It decides who may open a book, and the rules it encodes
 * — that `status` is never consulted, and that a snake_case row and a camelCase
 * body mean the same thing — are exactly the ones worth a test rather than a
 * comment.
 *
 * One shape, one reducer, three sources: the `entitlements-status` response, an
 * `access_events` row off the Realtime change feed, and the `access` block on a
 * successful `get-signed-pdf`. Writing a second reducer for the socket is how
 * the two paths drift apart — and they must not, because one of them is the only
 * thing that takes access away.
 */
export type AccessState = {
  /**
   * The decision, and the whole of it.
   *
   * Never derived from `status` here or anywhere above: `trial`, `cancelled`,
   * `grace` and `billing_issue` all grant access, and re-deriving the flag
   * from the status string is precisely the bug the backend just removed.
   */
  canAccessPremium: boolean;
  isAdmin: boolean;
  /** Raw subscription state, for display. Not an input to the decision. */
  status: string | null;
  /** `null` never expires — a lifetime comp, or an admin. */
  expiresAt: string | null;
  /** The server's clock at the moment this state was issued. */
  serverTime: string | null;
  /** Paywall copy only. */
  reason: AccessReason | null;
  /** Where to listen for changes. Given by the server, never assembled here. */
  realtime: EntitlementRealtime | null;
};

export const NO_ACCESS: AccessState = {
  canAccessPremium: false,
  isAdmin: false,
  status: null,
  expiresAt: null,
  serverTime: null,
  reason: 'none',
  realtime: null,
};

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Anything the reducer accepts.
 *
 * `entitlements-status` is a hand-written response body and is camelCase;
 * an `access_events` row is table columns and is snake_case. Both describe the
 * same access, so both feed the same reducer rather than each getting its own.
 */
export type AccessPayload =
  (EntitlementStatus & AccessEventRow) | EntitlementStatus | AccessEventRow;

/**
 * Reads one fact under either spelling.
 *
 * The camelCase key wins where both are present, which only happens if a future
 * payload carries both — and in that case the response body's own field is the
 * one that was written deliberately.
 */
function pick<T>(
  payload: Record<string, unknown>,
  camel: string,
  snake: string,
): T | undefined {
  const value = payload[camel] ?? payload[snake];
  return value === undefined || value === null ? undefined : (value as T);
}

/**
 * Reads an access state out of any of the payload shapes.
 *
 * Tolerant by design. A deployment that predates the countdown sends no
 * `expiresAt` and no `serverTime`, and the right answer there is "no deadline
 * to schedule" rather than a broken timer — the gate still works, it just has
 * nothing local to enforce until the next poll.
 *
 * A change-feed row carries no `realtime` block — it arrived *on* the channel,
 * so there is nothing to re-state — and the channel already held is therefore
 * carried forward rather than being dropped to `null`.
 */
export function parseAccessState(
  payload: AccessPayload | null | undefined,
  previous?: AccessState,
): AccessState {
  if (!payload) {
    return previous ?? NO_ACCESS;
  }

  const row = payload as Record<string, unknown>;

  const isAdmin = Boolean(pick<boolean>(row, 'isAdmin', 'is_admin'));
  const isActive = Boolean(pick<boolean>(row, 'isActive', 'is_active'));
  const canAccessPremium = pick<boolean>(
    row,
    'canAccessPremium',
    'can_access_premium',
  );

  return {
    // The server's own verdict. Falling back to `isActive || isAdmin` covers a
    // deployment that predates the field, and matches how the backend composes
    // it. Never re-derived from `status`: trial, cancelled, grace and
    // billing_issue all grant access.
    canAccessPremium: canAccessPremium ?? Boolean(isActive || isAdmin),
    isAdmin,
    status: asString(row.status),
    expiresAt: asString(pick<string>(row, 'expiresAt', 'expires_at')),
    serverTime: asString(pick<string>(row, 'serverTime', 'server_time')),
    reason:
      (asString(row.reason) as AccessReason | null) ?? previous?.reason ?? null,
    // A delivered row need not repeat the channel it arrived on.
    realtime:
      (row.realtime as EntitlementRealtime | undefined) ??
      previous?.realtime ??
      null,
  };
}

/**
 * Folds the `access` block from `get-signed-pdf` into the state already held.
 *
 * A successful open is proof of access, so it re-anchors the deadline and the
 * clock without a second round trip — but it says nothing about the plan or
 * the channel, so everything else is carried forward.
 */
export function mergeSignedPdfAccess(
  previous: AccessState,
  access: SignedPdfAccess | null | undefined,
): AccessState {
  if (!access) {
    return previous;
  }

  return {
    ...previous,
    canAccessPremium: true,
    expiresAt: asString(access.expiresAt),
    serverTime: asString(access.serverTime) ?? previous.serverTime,
    reason: (access.reason as AccessReason | undefined) ?? previous.reason,
  };
}

/**
 * Which reasons are notices rather than walls. The reason never decides
 * anything — it only explains — and the wording is in the dictionary, so
 * the paywall reads in the interface language.
 */
export const REASON_SOFT: Record<AccessReason, boolean> = {
  active: true,
  admin: true,
  trial: true,
  grace: true,
  billing_issue_paid_through: true,
  cancelled_paid_through: true,
  lapsed: false,
  expired: false,
  none: false,
};

export function reasonCopy(reason: AccessReason | null): {
  title: string;
  message: string;
  soft: boolean;
} {
  const key: AccessReason = reason && reason in REASON_SOFT ? reason : 'none';
  return { ...strings().access.reasons[key], soft: REASON_SOFT[key] };
}
