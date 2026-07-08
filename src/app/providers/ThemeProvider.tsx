import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';

import { applyThemePreference, useThemeStore } from '@/stores/themeStore';

export function ThemeProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    // Apply the current value once on mount (covers the case where hydration
    // has already completed before this effect runs).
    applyThemePreference(useThemeStore.getState().themePreference);

    // Re-apply once async hydration finishes with the persisted value. Live
    // switches are handled directly in the store action, so we intentionally
    // do NOT subscribe to every change here (avoids a root-level re-render).
    return useThemeStore.persist.onFinishHydration(state => {
      applyThemePreference(state.themePreference);
    });
  }, []);

  return <>{children}</>;
}
