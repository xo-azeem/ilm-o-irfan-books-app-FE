import { useCallback, useEffect, useRef } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

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
 * Three players rather than one. A player that has just been used sits at the
 * end of the clip and must be rewound before it can speak again, and a seek
 * is asynchronous: waiting for one would put the delay right where it is most
 * audible. So the turn is handed to a player that is already wound back, and
 * the one just used is rewound behind it. Three is enough for a reader
 * flicking through a book as fast as a hand can move.
 */

// Metro bundles the mp3 like an image; the require yields an asset id.
const PAPER_FOLD = require('@/assets/sounds/paper-fold.mp3');

/** Long enough for the clip (0.62s) to finish before the player is rewound. */
const REWIND_MS = 800;

let audioModeSet = false;

export function usePageTurnSound(enabled = true) {
  // Hooks, so one per line rather than a loop.
  const first = useAudioPlayer(PAPER_FOLD);
  const second = useAudioPlayer(PAPER_FOLD);
  const third = useAudioPlayer(PAPER_FOLD);

  const players = useRef([first, second, third]);
  players.current = [first, second, third];
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
    const player = players.current[next.current];
    next.current = (next.current + 1) % players.current.length;
    try {
      // Already at the start: nothing to wait for between the finger and the
      // sound.
      player.play();
    } catch {
      // The player has been released with the stage; nothing to play on.
      return;
    }
    const timer = setTimeout(() => {
      rewinds.current = rewinds.current.filter(item => item !== timer);
      try {
        void player.seekTo(0);
      } catch {
        // Released before the clip finished. Nothing to wind back.
      }
    }, REWIND_MS);
    rewinds.current.push(timer);
  }, []);
}
