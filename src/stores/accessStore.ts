import { create } from 'zustand';

import {
  correctedNow,
  deadlineMs,
  hasExpired,
  nextDelayMs,
  secondsRemaining,
} from '@/services/accessClock';
import {
  getEntitlementStatus,
  mergeSignedPdfAccess,
  parseAccessState,
  NO_ACCESS,
  type AccessPayload,
  type AccessState,
} from '@/services/entitlements';
import type { SignedPdfAccess } from '@/services/api/types';
import { keyValueStore } from '@/stores/storage';

/**
 * The membership lock.
 *
 * The websocket is not the lock. If it were, a reader who turned off wifi one
 * second before their membership expired would keep reading for ever. The lock
 * is this: a local countdown to `expiresAt`, which runs offline, needs no
 * socket, and fires to the second. The `access_events` feed only tells us when
 * that date *changes* — a renewal, a refund, an admin revoke.
 *
 * Two things make the countdown trustworthy on a device whose clock is not:
 *
 *   · a clock offset, taken from the server's own `serverTime` on every reply,
 *     so the deadline is measured against the backend's clock and not the
 *     phone's;
 *   · a high-water mark, because an offset alone does not survive a reader
 *     winding the device clock back a month — `Date.now()` moves back and the
 *     corrected time moves back with it. Time is therefore never allowed to run
 *     backwards: once we have observed a moment, that moment has happened.
 *
 * Both are persisted, so the guarantee holds across a cold start with no
 * network at all.
 */

const CLOCK_STORE_ID = 'ilm-access-clock';
const OFFSET_KEY = 'clockOffsetMs';
const HIGH_WATER_KEY = 'highWaterMs';

const clockStore = keyValueStore(CLOCK_STORE_ID);

function readNumber(key: string): number {
  const raw = clockStore.getString(key);
  const value = raw == null ? Number.NaN : Number(raw);
  return Number.isFinite(value) ? value : 0;
}

type AccessStore = {
  /** The last state the server told us about. */
  state: AccessState;
  /** True once the countdown has passed the deadline. */
  expired: boolean;
  /** Set after the first reply, so the UI can tell "no" from "not yet known". */
  resolved: boolean;
  /** `serverTime - Date.now()` at the last contact. Persisted. */
  clockOffsetMs: number;
  /** The latest moment ever observed. Time never runs backwards past this. */
  highWaterMs: number;

  /**
   * The one reducer. Fed by the poll, the change feed and a successful open.
   *
   * Takes either spelling: `entitlements-status` answers camelCase, an
   * `access_events` row arrives in the database's snake_case, and one reducer
   * reads both so the socket path cannot drift from the polled one.
   */
  applyAccessState: (payload: AccessPayload | null | undefined) => void;
  applySignedPdfAccess: (access: SignedPdfAccess | null | undefined) => void;
  /**
   * Re-reads `entitlements-status` and folds the answer in.
   *
   * The authoritative way to pick up a change: after a purchase or a restore,
   * on every foreground, and whenever the socket (re)connects and may have
   * missed a message. Reports whether a reply actually landed, because "the
   * request failed" and "the reader has no access" must not look the same —
   * being offline is not a reason to lock anyone out.
   */
  refresh: () => Promise<boolean>;
  /** Re-evaluates the deadline against the corrected clock. */
  recheck: () => void;
  /** Back to nothing, for sign-out. */
  reset: () => void;
};

let timer: ReturnType<typeof setTimeout> | null = null;

function clearTimer() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

export const useAccessStore = create<AccessStore>()((set, get) => {
  /**
   * Arms the countdown for the state currently held.
   *
   * A `null` deadline — lifetime, or an admin — schedules nothing at all, which
   * is the difference between "never expires" and "expires at the epoch".
   */
  function schedule() {
    clearTimer();

    const { state, clockOffsetMs, highWaterMs } = get();
    const delay = nextDelayMs(
      deadlineMs(state.expiresAt),
      correctedNow(clockOffsetMs, highWaterMs),
    );
    if (delay == null) {
      return;
    }

    // Chunked by `nextDelayMs`: a long wait re-arms rather than being handed to
    // `setTimeout` in one piece, both to dodge the 32-bit truncation and to
    // re-read the clock on the way.
    timer = setTimeout(() => {
      timer = null;
      get().recheck();
    }, delay);
  }

  /** Applies a freshly reduced state: clock, expiry verdict, and the timer. */
  function commit(state: AccessState) {
    const now = Date.now();

    // The server's clock is the reference. A reply with no `serverTime` — an
    // older deployment — leaves the offset where it was rather than resetting
    // it to zero and quietly trusting the device again.
    const serverMs = state.serverTime ? Date.parse(state.serverTime) : Number.NaN;
    const clockOffsetMs = Number.isFinite(serverMs) ? serverMs - now : get().clockOffsetMs;

    const highWaterMs = Math.max(get().highWaterMs, now + clockOffsetMs);

    clockStore.set(OFFSET_KEY, String(clockOffsetMs));
    clockStore.set(HIGH_WATER_KEY, String(highWaterMs));

    const expired = hasExpired(
      deadlineMs(state.expiresAt),
      correctedNow(clockOffsetMs, highWaterMs),
    );

    set({ state, clockOffsetMs, highWaterMs, expired, resolved: true });
    schedule();
  }

  return {
    state: NO_ACCESS,
    expired: false,
    resolved: false,
    clockOffsetMs: readNumber(OFFSET_KEY),
    highWaterMs: readNumber(HIGH_WATER_KEY),

    applyAccessState: payload => {
      // A renewal that lands seconds after a lock is an ordinary state change,
      // not a special case: the new `expiresAt` is in the future, so `expired`
      // comes out false and the app unlocks without a restart.
      commit(parseAccessState(payload, get().state));
    },

    applySignedPdfAccess: access => {
      commit(mergeSignedPdfAccess(get().state, access));
    },

    refresh: async () => {
      try {
        get().applyAccessState(await getEntitlementStatus());
        return true;
      } catch {
        // Offline is not a state change, and neither is a 500. The countdown
        // already on disk is what decides access until a reply lands.
        return false;
      }
    },

    recheck: () => {
      const { state, clockOffsetMs, highWaterMs } = get();
      const now = correctedNow(clockOffsetMs, highWaterMs);

      if (now > highWaterMs) {
        clockStore.set(HIGH_WATER_KEY, String(now));
        set({ highWaterMs: now });
      }

      const expired = hasExpired(deadlineMs(state.expiresAt), now);

      if (expired !== get().expired) {
        set({ expired });
      }
      schedule();
    },

    reset: () => {
      clearTimer();
      set({ state: NO_ACCESS, expired: false, resolved: false });
    },
  };
});

/**
 * Whether the reader may open a book, right now.
 *
 * The server's verdict, minus anything the local countdown has since
 * invalidated. An admin never trips it — `expiresAt` is null for staff, so the
 * timer is never armed in the first place.
 */
export function selectHasAccess(store: AccessStore): boolean {
  return store.state.canAccessPremium && !store.expired;
}

/** Seconds left, for a countdown label. `null` when nothing is scheduled. */
export function selectSecondsRemaining(store: AccessStore): number | null {
  return secondsRemaining(
    deadlineMs(store.state.expiresAt),
    correctedNow(store.clockOffsetMs, store.highWaterMs),
  );
}
