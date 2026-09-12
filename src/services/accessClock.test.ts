import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  correctedNow,
  deadlineMs,
  hasExpired,
  MAX_TIMEOUT_MS,
  nextDelayMs,
  secondsRemaining,
} from './accessClock';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

describe('membership clock', () => {
  it('measures against the server clock, not the device', () => {
    // Device is an hour slow; the server said so, so the offset carries it.
    const offset = 60 * MINUTE;
    assert.equal(correctedNow(offset, 0, 1_000), 1_000 + 60 * MINUTE);
  });

  it('refuses to let time run backwards', () => {
    // A reader winds the device clock back a month. The offset alone would
    // follow it down — the high-water mark is what does not.
    const seen = Date.parse('2026-09-11T12:00:00Z');
    const wound_back = Date.parse('2026-08-11T12:00:00Z');

    assert.equal(correctedNow(0, seen, wound_back), seen);
  });

  it('locks a lapsed membership even with the clock wound back', () => {
    const expiresAt = '2026-09-01T00:00:00Z';
    const deadline = deadlineMs(expiresAt);
    // Last seen well after expiry; device now claims it is July.
    const highWater = Date.parse('2026-09-11T12:00:00Z');
    const deviceNow = Date.parse('2026-07-01T00:00:00Z');

    assert.equal(
      hasExpired(deadline, correctedNow(0, highWater, deviceNow)),
      true,
    );
  });

  it('treats a null expiry as never expiring, not as expired', () => {
    // An admin and a lifetime comp both arrive with `expiresAt: null`. Reading
    // that as epoch zero would lock exactly the people who must never be.
    assert.equal(deadlineMs(null), null);
    assert.equal(hasExpired(null, Date.now()), false);
    assert.equal(nextDelayMs(null, Date.now()), null);
    assert.equal(secondsRemaining(null, Date.now()), null);
  });

  it('never hands setTimeout a delay it would truncate', () => {
    // 30 days exceeds the signed 32-bit millisecond range, where setTimeout
    // fires immediately instead of waiting — which would lock a reader the
    // moment their month-long membership was granted.
    const now = Date.parse('2026-09-11T12:00:00Z');
    const delay = nextDelayMs(now + 30 * DAY, now);

    assert.ok(delay != null);
    assert.ok(delay <= MAX_TIMEOUT_MS);
    assert.ok(delay <= 2 ** 31 - 1);
    assert.equal(delay, MAX_TIMEOUT_MS);
  });

  it('waits exactly as long as is left when that is short', () => {
    const now = Date.parse('2026-09-11T12:00:00Z');
    assert.equal(nextDelayMs(now + 40_000, now), 40_000);
  });

  it('schedules nothing once the deadline has passed', () => {
    const now = Date.parse('2026-09-11T12:00:00Z');
    assert.equal(nextDelayMs(now - 1, now), null);
    assert.equal(hasExpired(now - 1, now), true);
    // The boundary itself is expiry, not a last second of grace.
    assert.equal(hasExpired(now, now), true);
  });

  it('unlocks again when a renewal moves the deadline forward', () => {
    const now = Date.parse('2026-09-11T12:00:00Z');
    const lapsed = deadlineMs('2026-09-11T11:59:00Z');
    const renewed = deadlineMs('2026-10-11T12:00:00Z');

    assert.equal(hasExpired(lapsed, now), true);
    assert.equal(hasExpired(renewed, now), false);
    assert.ok((nextDelayMs(renewed, now) ?? 0) > 0);
  });

  it('counts down in whole seconds and stops at zero', () => {
    const now = Date.parse('2026-09-11T12:00:00Z');
    assert.equal(secondsRemaining(now + 59_999, now), 59);
    assert.equal(secondsRemaining(now - 5_000, now), 0);
  });

  it('ignores an unparseable expiry rather than locking on it', () => {
    assert.equal(deadlineMs('not a date'), null);
    assert.equal(deadlineMs(''), null);
  });
});
