import { useCallback, useEffect, useRef, useState } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { decode } from 'jpeg-js';
import { toByteArray } from 'react-native-quick-base64';

import {
  fillLimitFor,
  measureSideMargins,
  type SideMargins,
} from '@/features/reader/pageInk';
import {
  readPageMargin,
  rememberPageMargin,
} from '@/features/reader/pageShape';

/** The picture the margins are read from. Small: a column is a column. */
const PROBE = { width: 48, height: 64 } as const;

function marginsOf(margin: number | null): SideMargins | null {
  return margin == null ? null : { left: margin, right: margin };
}

/**
 * How much wider than the screen this book's page may be drawn, learnt from
 * the page itself — see `pageInk.ts`.
 *
 * Starts from what was learnt on an earlier open (or the default before any
 * measurement), measures the page once it is on screen, and measures again
 * after each turn. The limit may grow only while the book is opening — under
 * the loader, so the page is never seen to jump — and may shrink at any time,
 * because a page with less margin than the rest must not have its type
 * clipped, even if that means a moment's relayout.
 */
export function usePageFit(
  shapeKey: string | undefined,
  defaultFill: number,
  shotRef: React.RefObject<View | null>,
) {
  const [fillLimit, setFillLimit] = useState(() =>
    fillLimitFor(marginsOf(readPageMargin(shapeKey)), defaultFill),
  );
  const fillRef = useRef(fillLimit);
  fillRef.current = fillLimit;
  const measuring = useRef<Promise<void> | null>(null);

  const measure = useCallback(
    (allowGrow: boolean): Promise<void> => {
      if (measuring.current) return measuring.current;
      const run = (async () => {
        const view = shotRef.current;
        if (!view) return;
        let base64: string;
        try {
          base64 = await captureRef(view, {
            format: 'jpg',
            quality: 0.7,
            result: 'base64',
            width: PROBE.width,
            height: PROBE.height,
          });
        } catch {
          // The view is gone, or cannot be drawn just now. Nothing learnt.
          return;
        }
        let margins: SideMargins | null;
        try {
          const image = decode(toByteArray(base64), { useTArray: true });
          margins = measureSideMargins(image.data, image.width, image.height);
        } catch {
          return;
        }
        if (!margins) return;

        const margin = Math.min(margins.left, margins.right);
        const known = rememberPageMargin(shapeKey, margin);
        const next = fillLimitFor(marginsOf(known), defaultFill);
        if (
          next < fillRef.current - 1e-6 ||
          (allowGrow && next > fillRef.current + 1e-6)
        ) {
          fillRef.current = next;
          setFillLimit(next);
        }
      })().finally(() => {
        measuring.current = null;
      });
      measuring.current = run;
      return run;
    },
    [defaultFill, shapeKey, shotRef],
  );

  // A turn has landed: check the new page's margins, a beat later so the
  // document view has drawn it. Shrink only.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const measureLater = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void measure(false);
    }, 450);
  }, [measure]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { fillLimit, measureNow: measure, measureLater };
}
