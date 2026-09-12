/**
 * The arithmetic behind the membership lock.
 *
 * Deliberately dependency-free — no React, no storage, no network — because
 * this is the part that has to be right and the part worth testing directly.
 * Everything stateful lives in `stores/accessStore`.
 */

/**
 * The longest single `setTimeout` the countdown will schedule.
 *
 * `setTimeout` coerces its delay to a signed 32-bit integer, so any wait longer
 * than about 24.8 days overflows and fires *immediately*. A monthly membership
 * is 30 days, so this is not a theoretical edge: scheduled in one piece, a
 * renewal would lock the reader out the moment it was granted. Long waits are
 * therefore served in chunks, which also gives the countdown a regular chance
 * to re-read the clock instead of trusting one subtraction made a month ago.
 */
export const MAX_TIMEOUT_MS = 6 * 60 * 60_000;

/**
 * The current moment, corrected and monotonic.
 *
 * Two separate defences, because they answer different attacks:
 *
 *   · `offsetMs` is `serverTime - Date.now()` from the last reply, so the
 *     deadline is measured against the backend's clock rather than the phone's.
 *     It handles a device that is simply wrong.
 *   · `highWaterMs` is the latest moment ever observed. An offset alone does
 *     not survive a reader winding the clock back a month — `Date.now()` falls
 *     and the corrected time falls with it — so time is never allowed to run
 *     backwards. Once a moment has been seen, it has happened.
 */
export function correctedNow(
  offsetMs: number,
  highWaterMs: number,
  now = Date.now(),
): number {
  return Math.max(now + offsetMs, highWaterMs);
}

/** `expiresAt` as epoch ms. `null` is "never expires", not "expired". */
export function deadlineMs(
  expiresAt: string | null | undefined,
): number | null {
  if (!expiresAt) {
    return null;
  }
  const parsed = Date.parse(expiresAt);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Whether the membership has run out, as of the corrected clock. */
export function hasExpired(
  deadline: number | null,
  correctedNowMs: number,
): boolean {
  return deadline != null && correctedNowMs >= deadline;
}

/**
 * How long to wait before looking again.
 *
 * `null` means "schedule nothing": either there is no deadline — a lifetime
 * comp or an admin — or it has already passed, and re-arming a timer for a
 * moment in the past is just a spin.
 */
export function nextDelayMs(
  deadline: number | null,
  correctedNowMs: number,
  cap = MAX_TIMEOUT_MS,
): number | null {
  if (deadline == null) {
    return null;
  }
  const remaining = deadline - correctedNowMs;
  if (remaining <= 0) {
    return null;
  }
  return Math.min(remaining, cap);
}

/** Whole seconds left, for a countdown label. Never negative. */
export function secondsRemaining(
  deadline: number | null,
  correctedNowMs: number,
): number | null {
  if (deadline == null) {
    return null;
  }
  return Math.max(0, Math.floor((deadline - correctedNowMs) / 1000));
}
