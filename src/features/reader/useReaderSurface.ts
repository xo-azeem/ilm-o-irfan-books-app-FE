import { useMemo } from 'react';

import { useThemeStore } from '@/stores/themeStore';
import { readerStages, readerToneWash } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

export type ReaderSurface = {
  /** Behind the page: the surround, the loading screen, the letterbox strips. */
  stage: string;
  /** Type that sits directly on the stage rather than in the chrome. */
  ink: string;
  muted: string;
  /** The tint laid over a rendered page, when the tone calls for one. */
  wash: string | null;
};

/**
 * Every colour the reader paints with.
 *
 * The two settings that reach the reader do different jobs, and this is where
 * that division is kept: Light / Dark decides the room — the stage, the loading
 * screen, the type on them — while the page tone decides the paper, and reaches
 * no further than the page itself. Dark mode therefore stays dark whatever
 * paper the reader has chosen.
 */
export function useReaderSurface(): ReaderSurface {
  const { colors, isDark } = useTheme();
  const pageTone = useThemeStore(state => state.pageTone);

  return useMemo(
    () => ({
      stage: isDark ? readerStages.dark : readerStages.light,
      ink: colors.ink,
      muted: colors.muted,
      wash: readerToneWash[pageTone] ?? null,
    }),
    [colors.ink, colors.muted, isDark, pageTone],
  );
}
