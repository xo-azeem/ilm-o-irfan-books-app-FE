import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  NO_ACCESS,
  mergeSignedPdfAccess,
  parseAccessState,
  reasonCopy,
} from './accessState';

const SERVER_TIME = '2026-09-09T12:00:00Z';
const FUTURE = '2026-10-09T12:00:00Z';

/** `entitlements-status`, as the endpoint answers it: camelCase. */
function statusBody(overrides: Record<string, unknown> = {}) {
  return {
    isActive: true,
    isAdmin: false,
    canAccessPremium: true,
    status: 'active',
    startsAt: SERVER_TIME,
    expiresAt: FUTURE,
    secondsRemaining: 2592000,
    reason: 'active',
    serverTime: SERVER_TIME,
    realtime: {
      mode: 'postgres_changes' as const,
      channel: 'access:abc',
      schema: 'public',
      table: 'access_events',
      event: 'INSERT',
      filter: 'user_id=eq.abc',
    },
    ...overrides,
  };
}

/** An `access_events` row, as Realtime delivers it: snake_case columns. */
function eventRow(overrides: Record<string, unknown> = {}) {
  return {
    user_id: 'abc',
    can_access_premium: true,
    is_admin: false,
    is_active: true,
    status: 'active',
    expires_at: FUTURE,
    seconds_remaining: 2592000,
    reason: 'active',
    server_time: SERVER_TIME,
    ...overrides,
  };
}

describe('access state from entitlements-status', () => {
  it('reads the camelCase response body', () => {
    const state = parseAccessState(statusBody());

    assert.equal(state.canAccessPremium, true);
    assert.equal(state.expiresAt, FUTURE);
    assert.equal(state.serverTime, SERVER_TIME);
    assert.equal(state.reason, 'active');
    assert.equal(state.realtime?.channel, 'access:abc');
  });

  it('falls back to isActive || isAdmin on a payload with no verdict', () => {
    // An older deployment omits `canAccessPremium` entirely.
    const subscriber = parseAccessState({ isActive: true });
    const admin = parseAccessState({ isActive: false, isAdmin: true });
    const neither = parseAccessState({ isActive: false });

    assert.equal(subscriber.canAccessPremium, true);
    assert.equal(admin.canAccessPremium, true);
    assert.equal(neither.canAccessPremium, false);
  });

  it('keeps a null expiry as "never expires", not as expired', () => {
    // Lifetime comps and admins: there is no deadline to schedule.
    const state = parseAccessState(statusBody({ expiresAt: null, secondsRemaining: null }));

    assert.equal(state.expiresAt, null);
    assert.equal(state.canAccessPremium, true);
  });
});

describe('access state from an access_events row', () => {
  it('reads the snake_case row the change feed delivers', () => {
    const state = parseAccessState(eventRow());

    assert.equal(state.canAccessPremium, true);
    assert.equal(state.expiresAt, FUTURE);
    assert.equal(state.serverTime, SERVER_TIME);
    assert.equal(state.reason, 'active');
  });

  it('produces the same state as the equivalent response body', () => {
    // One reducer, two spellings: if these ever diverge, the socket path and the
    // polled path disagree about who may read — and only one of them is tested
    // by hand.
    const fromBody = parseAccessState(statusBody({ realtime: undefined }));
    const fromRow = parseAccessState(eventRow());

    assert.deepEqual(fromRow, fromBody);
  });

  it('carries the channel forward — a delivered row does not restate it', () => {
    const previous = parseAccessState(statusBody());
    const next = parseAccessState(eventRow({ can_access_premium: false }), previous);

    assert.equal(next.canAccessPremium, false);
    assert.equal(next.realtime?.channel, 'access:abc');
  });

  it('locks on the exact revoke row production sends', () => {
    // Verified against production: subscribe, flip the entitlement, and this is
    // what arrives. Note `expires_at: null` next to `can_access_premium: false`
    // — a null expiry means "no deadline to schedule", *not* "never expires and
    // therefore allowed", so the verdict has to come from the flag alone.
    const previous = parseAccessState(statusBody());
    const next = parseAccessState(
      {
        user_id: 'abc',
        can_access_premium: false,
        is_active: false,
        is_admin: false,
        status: 'expired',
        expires_at: null,
        reason: 'expired',
        seconds_remaining: 0,
        server_time: SERVER_TIME,
        created_at: SERVER_TIME,
      },
      previous,
    );

    assert.equal(next.canAccessPremium, false);
    assert.equal(next.expiresAt, null);
    assert.equal(next.reason, 'expired');
    assert.equal(next.serverTime, SERVER_TIME);
  });

  it('does not let a false verdict fall through to the isActive fallback', () => {
    // `false` is an answer, not a missing field. Reading it as absent would hand
    // the decision to `isActive || isAdmin` and could unlock a revoked reader.
    const state = parseAccessState({ can_access_premium: false, is_admin: true });

    assert.equal(state.canAccessPremium, false);
  });

  it('locks on a revoke arriving over the feed', () => {
    const previous = parseAccessState(statusBody());
    const next = parseAccessState(
      eventRow({ can_access_premium: false, is_active: false, reason: 'expired' }),
      previous,
    );

    assert.equal(next.canAccessPremium, false);
    assert.equal(next.reason, 'expired');
  });
});

describe('status is never the decision', () => {
  // The bug the backend just removed, and the one the client must not
  // reintroduce: every one of these is paid through to a future date.
  for (const status of ['trial', 'cancelled', 'grace', 'billing_issue']) {
    it(`grants access with status "${status}" when the server says so`, () => {
      const state = parseAccessState(statusBody({ status, isActive: true }));

      assert.equal(state.canAccessPremium, true);
      assert.equal(state.status, status);
    });
  }

  it('refuses access with status "active" if the server says it is gone', () => {
    // The inverse, and just as important: the flag decides, not the word.
    const state = parseAccessState(
      statusBody({ status: 'active', isActive: false, canAccessPremium: false }),
    );

    assert.equal(state.canAccessPremium, false);
  });
});

describe('re-anchoring from a signed PDF', () => {
  it('takes the new deadline and clock, keeping everything else', () => {
    const previous = parseAccessState(statusBody());
    const next = mergeSignedPdfAccess(previous, {
      expiresAt: '2026-11-09T12:00:00Z',
      secondsRemaining: 100,
      serverTime: '2026-10-09T12:00:00Z',
      reason: 'active',
    });

    assert.equal(next.expiresAt, '2026-11-09T12:00:00Z');
    assert.equal(next.serverTime, '2026-10-09T12:00:00Z');
    // A successful open says nothing about the plan or the channel.
    assert.equal(next.status, 'active');
    assert.equal(next.realtime?.channel, 'access:abc');
  });

  it('is proof of access — an open that succeeded cannot be unentitled', () => {
    const next = mergeSignedPdfAccess(NO_ACCESS, { expiresAt: FUTURE });

    assert.equal(next.canAccessPremium, true);
  });

  it('leaves the state untouched on a deployment that sends no access block', () => {
    const previous = parseAccessState(statusBody());

    assert.deepEqual(mergeSignedPdfAccess(previous, null), previous);
  });
});

describe('paywall copy', () => {
  it('treats the paid-through reasons as soft notices, not walls', () => {
    for (const reason of [
      'trial',
      'grace',
      'billing_issue_paid_through',
      'cancelled_paid_through',
    ] as const) {
      assert.equal(reasonCopy(reason).soft, true, reason);
    }
  });

  it('treats a genuinely ended membership as a wall', () => {
    assert.equal(reasonCopy('lapsed').soft, false);
    assert.equal(reasonCopy('expired').soft, false);
    assert.equal(reasonCopy('none').soft, false);
  });

  it('answers for an unknown reason rather than returning undefined', () => {
    assert.equal(reasonCopy(null).title, reasonCopy('none').title);
  });
});
