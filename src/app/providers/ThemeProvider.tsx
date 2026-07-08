import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';

import { applyThemePreference, useThemeStore } from '@/stores/themeStore';

export function ThemeProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    // Persistence is synchronous (MMKV), so the saved preference is already
    // applied at store-creation time and the first frame paints correctly.
    // Re-assert once on mount as a safety net for the in-memory fallback path.
    applyThemePreference(useThemeStore.getState().themePreference);
  }, []);

  return <>{children}</>;
}
