/**
 * The page-turn sound's player pool, as numbers and a simulation.
 *
 * The audio itself needs a device, but the thing that was actually broken
 * about it does not: whether a turn finds a player ready to speak is a
 * question about a rotating pool, a clip length and a flip rate, and that can
 * be answered on a desk.
 *
 * It is here because the bug was invisible at reading speed. Three players,
 * each wound back 800 ms after use, serve 3.75 turns a second — comfortably
 * more than anyone reads at, and comfortably *less* than a thumb riffling
 * through a book. Past that the turn lands on a player still parked at the
 * end of its clip, `play()` does nothing, and the flip is silent. No error, no
 * warning, nothing to see in a log: just a page that turned without a sound.
 */

/** How long the recording runs. Measured from the asset, not guessed. */
export const CLIP_MS = 620;

/**
 * How long a player is left before it is wound back.
 *
 * Longer than the clip, so a turn is never cut off by its own rewind, and no
 * longer than it has to be, because every extra millisecond is a slot out of
 * circulation and so a lower ceiling on how fast the book can be flicked
 * through before `playTurn` has to wind a player back by hand.
 */
export const REWIND_MS = 700;

/**
 * How many players the reader holds open.
 *
 * Five, which serves about seven turns a second — past the rate a thumb can
 * riffle a page — so the forced-rewind path in `usePageTurnSound` is a
 * backstop rather than something the reader hits while browsing. Each player
 * is one `useAudioPlayer` hook, so this is not free; five is the smallest
 * number that puts the ceiling clear of a human hand.
 */
export const SOUND_POOL = 5;

/** The next slot in the rotation. */
export function nextSlot(slot: number, pool: number = SOUND_POOL): number {
  return (slot + 1) % pool;
}

/**
 * Turns a pool can serve per second before a player has to be wound back on
 * the spot. Not used at runtime; it is the number the tests reason about.
 */
export function poolCapacityPerSecond(
  pool: number = SOUND_POOL,
  rewindMs: number = REWIND_MS,
): number {
  return (pool * 1000) / rewindMs;
}

export type PoolRun = {
  /**
   * Turns that produced no sound at all, by index into `times`. The old
   * design's failure: a slot still at the end of its clip, told to play.
   */
  silent: number[];
  /**
   * Turns that had to wind their own player back before playing. These still
   * sound; they are the cost of flicking faster than the pool rotates.
   */
  forced: number[];
};

/**
 * Plays a run of turns through a pool and reports what each one got.
 *
 * `forceRewind` is the fix: with it off this models the original three-player
 * version, which simply called `play()` and hoped. The difference between the
 * two is the bug.
 */
export function simulatePool(
  times: number[],
  {
    pool = SOUND_POOL,
    rewindMs = REWIND_MS,
    forceRewind = true,
  }: { pool?: number; rewindMs?: number; forceRewind?: boolean } = {},
): PoolRun {
  // When each slot's pending rewind lands. -Infinity means "clean".
  const rewindAt = Array.from({ length: pool }, () => -Infinity);
  const silent: number[] = [];
  const forced: number[] = [];

  times.forEach((now, index) => {
    const slot = index % pool;

    // Any rewind scheduled at or before now has already run.
    const clean = rewindAt[slot] <= now;

    if (!clean) {
      if (forceRewind) {
        forced.push(index);
      } else {
        // The player is parked at the end of its clip. `play()` does nothing.
        silent.push(index);
        // The old code still scheduled another rewind for it.
        rewindAt[slot] = now + rewindMs;
        return;
      }
    }

    rewindAt[slot] = now + rewindMs;
  });

  return { silent, forced };
}

/** A run of `count` turns at a steady `everyMs` apart. */
export function steadyFlips(count: number, everyMs: number): number[] {
  return Array.from({ length: count }, (_, i) => i * everyMs);
}
