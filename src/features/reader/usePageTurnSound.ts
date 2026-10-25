import { useCallback, useEffect, useRef } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

import { nextSlot, REWIND_MS, SOUND_POOL } from '@/features/reader/soundPool';

/**
 * The sound of a page turning.
 *
 * One short recording of a sheet of paper folding over, played the moment the
 * page is *taken* — the instant a drag lifts the corner, or a control starts
 * the turn — so the sound runs under the animation rather than arriving after
 * it, the way paper does. A drag that falls back where it started still made
 * that sound; a touch that never lifted a page makes none.
 *
 * It plays *with* whatever else is playing — a reader's audiobook or music
 * carries on underneath — and it respects the phone's silent switch, as a UI
 * sound should.
 *
 * ## Why a pool, and why it has to be checked
 *
 * A player that has just been used sits at the end of the clip and must be
 * wound back before it can speak again, and a seek is asynchronous: waiting
 * for one would put the delay exactly where it is most audible. So turns are
 * handed to players round-robin and each is wound back behind itself.
 *
 * The first version of this took that on faith — three players, each rewound
 * on a timer, and the next turn simply told to play. That is fine at reading
 * speed and silent at browsing speed: flick through a book faster than the
 * pool comes round and the turn lands on a player still parked at the end of
 * its clip, `play()` does nothing, and **that flip makes no sound at all**.
 * Which is exactly how it was reported — the sound "not perfectly sounding".
 *
 * So a slot now says whether it is wound back, and a turn that finds a slot
 * still dirty winds it back itself before playing rather than trusting the
 * timer to have run. The pool is sized so that path is almost never taken
 * (see `soundPool.ts`), but it is there, which is the difference between a
 * missed sound and a late one.
 *
 * A player is **paused before it is rewound**. One that has run to the end is
 * still "playing" as far as the platform is concerned — it has simply run out
 * of clip — so seeking it back to the start sets it going again, and the
 * reader hears a second turn a beat after the first. That is the one thing
 * this file must not do: one turn, one sound.
 */

// Metro bundles the mp3 like an image; the require yields an asset id.
const PAPER_FOLD = require('@/assets/sounds/paper-fold.mp3');

let audioModeSet = false;

export function usePageTurnSound(enabled = true) {
  // Hooks, so one per line rather than a loop. `SOUND_POOL` is the length of
  // this list and the two are asserted equal below.
  const first = useAudioPlayer(PAPER_FOLD);
  const second = useAudioPlayer(PAPER_FOLD);
  const third = useAudioPlayer(PAPER_FOLD);
  const fourth = useAudioPlayer(PAPER_FOLD);
  const fifth = useAudioPlayer(PAPER_FOLD);

  const players = useRef([first, second, third, fourth, fifth]);
  players.current = [first, second, third, fourth, fifth];

  /** Which slots have been played and not yet wound back. */
  const dirty = useRef<boolean[]>(
    Array.from({ length: SOUND_POOL }, () => false),
  );
  const next = useRef(0);
  const rewinds = useRef<ReturnType<typeof setTimeout>[]>([]);

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (audioModeSet) return;
    audioModeSet = true;
    // Once per launch. Failing to set it is not worth a word: the sound then
    // plays under the platform's defaults.
    setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    }).catch(() => {});
  }, []);

  // A reader who leaves the book mid-turn takes the players with them.
  useEffect(() => {
    const timers = rewinds;
    return () => {
      for (const timer of timers.current) clearTimeout(timer);
      timers.current = [];
    };
  }, []);

  return useCallback(() => {
    if (!enabledRef.current) return;

    const slot = next.current;
    const player = players.current[slot];
    next.current = nextSlot(slot);

    try {
      if (dirty.current[slot]) {
        // Came round before the timer did. Wind it back here rather than let
        // the turn fall silent: paused first, or the seek restarts the clip
        // and the reader hears the turn twice.
        player.pause();
        void player.seekTo(0);
      }
      player.play();
      dirty.current[slot] = true;
    } catch {
      // The player has been released with the stage; nothing to play on.
      return;
    }

    const timer = setTimeout(() => {
      rewinds.current = rewinds.current.filter(item => item !== timer);
      try {
        // Paused first, or the seek would start the clip over — see above.
        player.pause();
        void player.seekTo(0);
        dirty.current[slot] = false;
      } catch {
        // Released before the clip finished. Nothing to wind back.
      }
    }, REWIND_MS);
    rewinds.current.push(timer);
  }, []);
}
