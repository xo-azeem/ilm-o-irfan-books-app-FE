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
 * measurement) and is settled once, while the book is opening — under the
 * loader, so the page is never seen to change size.
 *
 * It is then **fixed for the whole session**. It used to be re-measured after
 * every turn so that a tighter page could pull it back in; what that actually
 * did was resize the page mid-read. The document view fits its page when it
 * loads, so a box that changes under it leaves the page drawn at the old
 * scale inside the new box — a band down one side, and a stutter as the fold
 * and the stage relaid out around it. A page that does not move is worth more
 * than a percent of width, and the measurement is remembered per book: a
 * tighter page found on one open governs the next (`rememberPageMargin` keeps
 * the smallest margin ever seen).
 *
 * `measure` reports whether it learnt anything. A picture taken the instant
 * the document view says it has drawn can come back blank — the frame is not
 * composited yet — and a measurement that finds no ink teaches nothing. The
 * caller retries while the loader is still up rather than leaving the book at
 * its default for the whole session, which is what a single failed attempt
 * used to do.
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
  const measuring = useRef<Promise<boolean> | null>(null);

  // Measured once per book, and only a measurement that found ink counts.
  const settled = useRef<string | undefined>(undefined);

  const measure = useCallback(
    /**
     * @param apply whether what is learnt may move the fill. True while the
     * book is opening; false afterwards, when the page must not be resized
     * under the reader — the margin is still remembered, for the next open.
     */
    (apply: boolean): Promise<boolean> => {
      if (measuring.current) return measuring.current;
      if (settled.current === shapeKey) return Promise.resolve(true);
      const run = (async () => {
        const view = shotRef.current;
        if (!view) return false;
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
          return false;
        }
        let margins: SideMargins | null;
        try {
          const image = decode(toByteArray(base64), { useTArray: true });
          margins = measureSideMargins(image.data, image.width, image.height);
        } catch {
          return false;
        }
        // No ink at all: a blank page, or a frame drawn before the document
        // reached it. Either way there is nothing to learn from, and the
        // book is not settled.
        if (!margins) return false;

        const margin = Math.min(margins.left, margins.right);
        const known = rememberPageMargin(shapeKey, margin);
        if (!apply) return true;

        settled.current = shapeKey;
        const next = fillLimitFor(marginsOf(known), defaultFill);
        if (Math.abs(next - fillRef.current) > 1e-6) {
          fillRef.current = next;
          setFillLimit(next);
        }
        return true;
      })().finally(() => {
        measuring.current = null;
      });
      measuring.current = run;
      return run;
    },
    [defaultFill, shapeKey, shotRef],
  );

  // A different book gets its own measurement, from its own remembered
  // margin, the next time one is asked for.
  useEffect(() => {
    settled.current = undefined;
    const next = fillLimitFor(marginsOf(readPageMargin(shapeKey)), defaultFill);
    fillRef.current = next;
    setFillLimit(next);
  }, [defaultFill, shapeKey]);

  /** Whether this book's fill is the measured one rather than the default. */
  const isSettled = useCallback(() => settled.current === shapeKey, [shapeKey]);

  return { fillLimit, measureNow: measure, isSettled };
}
