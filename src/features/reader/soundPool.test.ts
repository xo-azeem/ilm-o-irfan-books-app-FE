import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CLIP_MS,
  REWIND_MS,
  SOUND_POOL,
  nextSlot,
  poolCapacityPerSecond,
  simulatePool,
  steadyFlips,
} from './soundPool';

/**
 * One turn, one sound — at any speed a hand can turn pages.
 *
 * The bug these cover is a silent flip, not a wrong one, which is why it
 * survived so long: nothing throws, nothing logs, the animation is perfect
 * and the sound simply is not there.
 */
describe('page-turn sound pool', () => {
  it('rotates through every slot before reusing one', () => {
    const seen = new Set<number>();
    let slot = 0;
    for (let i = 0; i < SOUND_POOL; i += 1) {
      seen.add(slot);
      slot = nextSlot(slot);
    }
    assert.equal(seen.size, SOUND_POOL, 'a slot was skipped');
    assert.equal(slot, 0, 'did not come back round to the start');
  });

  it('leaves a player alone until its clip has finished', () => {
    // A rewind that landed inside the clip would cut the sound off, which is
    // the opposite failure and just as audible.
    assert.ok(
      REWIND_MS > CLIP_MS,
      `rewind ${REWIND_MS}ms must outlast the ${CLIP_MS}ms clip`,
    );
  });

  it('never drops a sound at reading speed', () => {
    // A page every two seconds, then every second: ordinary reading.
    for (const gap of [2000, 1000, 600]) {
      const run = simulatePool(steadyFlips(40, gap));
      assert.deepEqual(run.silent, [], `silent flips at one per ${gap}ms`);
      assert.deepEqual(run.forced, [], `forced rewinds at one per ${gap}ms`);
    }
  });

  it('never drops a sound while a reader riffles through the book', () => {
    // Five turns a second — faster than a thumb actually manages, and the
    // speed at which the old three-player pool fell silent.
    const run = simulatePool(steadyFlips(60, 200));
    assert.deepEqual(run.silent, [], 'a riffled flip made no sound');
  });

  it('still sounds every turn when flicked faster than the pool rotates', () => {
    // Ten a second. Past the pool's ceiling, so players have to be wound back
    // on the spot — but every turn is still heard, which is the whole point.
    const run = simulatePool(steadyFlips(60, 100));
    assert.deepEqual(run.silent, [], 'a flicked turn made no sound');
    assert.ok(run.forced.length > 0, 'expected the backstop to be exercised');
  });

  it('reproduces the bug it was written to fix', () => {
    // The shipped design: three players, 800ms rewind, no check — told to
    // play and trusted to. At five turns a second it goes quiet.
    const old = simulatePool(steadyFlips(30, 200), {
      pool: 3,
      rewindMs: 800,
      forceRewind: false,
    });
    assert.ok(
      old.silent.length > 0,
      'the old pool should drop sounds at 5 turns/sec — if it does not, ' +
        'this test no longer proves anything',
    );

    // Same run, current design: nothing lost.
    const fixed = simulatePool(steadyFlips(30, 200));
    assert.deepEqual(fixed.silent, []);
  });

  it('serves faster than a hand can turn pages before forcing anything', () => {
    const capacity = poolCapacityPerSecond();
    // A fast riffle is around five pages a second; the pool should clear that
    // without the backstop so the forced path stays rare.
    assert.ok(
      capacity > 5,
      `pool serves only ${capacity.toFixed(1)} turns/sec`,
    );
  });

  it('counts a flip as sounded exactly once', () => {
    // Every turn is accounted for, and no turn is in both lists: a forced
    // rewind is a turn that sounded, not a second sound.
    const times = steadyFlips(25, 120);
    const run = simulatePool(times);
    const both = run.forced.filter(index => run.silent.includes(index));
    assert.deepEqual(both, [], 'a turn counted as both silent and forced');
    assert.ok(run.silent.length + run.forced.length <= times.length);
  });
});
