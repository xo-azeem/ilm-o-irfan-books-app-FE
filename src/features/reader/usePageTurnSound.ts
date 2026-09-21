import { useCallback, useEffect, useRef } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

/**
 * The sound of a page turning.
 *
 * One short recording of a sheet of paper folding over, played the moment a
 * flip commits — forward or back, by finger or by control. Decoded once when
 * the reader opens (the player is created with the stage and removed with
 * it), then rewound and replayed, so a turn costs nothing but a seek. A drag
 * that drops back where it started is not a turn and makes no sound.
 *
 * It plays *with* whatever else is playing — a reader's audiobook or music
 * carries on underneath — and it respects the phone's silent switch, as a
 * UI sound should.
 */

// Metro bundles the mp3 like an image; the require yields an asset id.
const PAPER_FOLD = require('@/assets/sounds/paper-fold.mp3');

let audioModeSet = false;

export function usePageTurnSound(enabled = true) {
  const player = useAudioPlayer(PAPER_FOLD);
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

  return useCallback(() => {
    if (!enabledRef.current) return;
    try {
      // Rewinding first lets two quick turns each be heard from the start.
      void player.seekTo(0).then(
        () => player.play(),
        () => player.play(),
      );
    } catch {
      // The player has been released with the stage; nothing to play on.
    }
  }, [player]);
}
