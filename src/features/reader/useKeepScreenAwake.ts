import { useEffect } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import { useThemeStore } from '@/stores/themeStore';

const READER_TAG = 'ilm-o-irfan-reader';

/**
 * Holds the screen awake for as long as the reader is mounted and the
 * "Keep screen awake" preference is on. The lock follows the preference live,
 * so flipping it from the Appearance screen takes effect on the next open and
 * flipping it mid-read releases the screen at once.
 */
export function useKeepScreenAwake() {
  const keepScreenAwake = useThemeStore(state => state.keepScreenAwake);

  useEffect(() => {
    if (!keepScreenAwake) {
      return;
    }
    // The lock is a nicety; the reader must never fail over it.
    activateKeepAwakeAsync(READER_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(READER_TAG).catch(() => {});
    };
  }, [keepScreenAwake]);
}
