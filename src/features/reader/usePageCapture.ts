import { useCallback, useEffect, useRef } from 'react';
import type { View } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';

/**
 * How many pages of the book are kept as pictures.
 *
 * Enough for the page in hand and the two either side of it, plus one for the
 * page a reader oscillating over a spread keeps coming back to. Anything more
 * is a copy of a book held in memory.
 */
const KEEP = 4;

/** How long a page is left to finish drawing before its picture is taken. */
const AFTER_MS = 220;

/**
 * Pictures of pages, for the paper flip to fold.
 *
 * A turn needs two pages on screen at once: the leaf, twice over — flat and
 * mirrored across its own crease — and the page it opens onto underneath. The
 * document view can only ever draw the one page it is on, and a second live
 * instance over the same file races the first inside Pdfium and takes the app
 * down with it, so the second page has to come from somewhere else.
 *
 * It comes from here. Every page the reader lands on has its picture taken once
 * it has settled, and a fold draws its leaf from that while the document view
 * itself — moved to the page the fold is opening onto, under cover of the leaf —
 * is the page underneath. So a turn costs one snapshot per page visited and
 * nothing at all per frame.
 *
 * The one page this cannot supply is one that has never been on screen: turning
 * *back* to a page arrived at by a jump rather than by reading. The fold takes
 * that as blank paper, which is what the sheet under a lifted leaf looked like
 * before any of this, and the page is under it a moment later regardless.
 */
export function usePageCapture(host: React.RefObject<View | null>) {
  const shots = useRef(new Map<number, string>());
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);
  const alive = useRef(true);

  const drop = useCallback((page: number) => {
    const uri = shots.current.get(page);
    if (!uri) return;
    shots.current.delete(page);
    try {
      releaseCapture(uri);
    } catch {
      // A picture the platform has already cleaned up. Nothing to do.
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    const store = shots.current;
    const timer = pending;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
      store.forEach(uri => {
        try {
          releaseCapture(uri);
        } catch {
          // As above.
        }
      });
      store.clear();
    };
  }, []);

  /** The picture of a page, if one has been taken. */
  const shotOf = useCallback((page: number) => shots.current.get(page) ?? null, []);

  const take = useCallback(
    async (page: number) => {
      if (busy.current || !alive.current || shots.current.has(page)) return;
      const view = host.current;
      if (!view) return;

      busy.current = true;
      try {
        const uri = await captureRef(view, {
          format: 'jpg',
          quality: 0.92,
          result: 'tmpfile',
        });
        if (!alive.current) {
          releaseCapture(uri);
          return;
        }
        // Android hands back a bare path; an SVG image wants a URL.
        shots.current.set(page, /^[a-z]+:/i.test(uri) ? uri : `file://${uri}`);

        // Oldest first, which a Map keeps for us.
        while (shots.current.size > KEEP) {
          const oldest = shots.current.keys().next();
          if (oldest.done) break;
          drop(oldest.value);
        }
      } catch {
        // A snapshot can fail while the view is being laid out or torn down.
        // The fold falls back to blank paper, which is a softer failure than
        // anything worth reporting.
      } finally {
        busy.current = false;
      }
    },
    [drop, host],
  );

  /**
   * The reader has landed on a page. Its picture is taken once it has had a
   * moment to finish drawing — a snapshot of a page mid-render is a snapshot
   * of half a page.
   */
  const schedule = useCallback(
    (page: number) => {
      if (pending.current) clearTimeout(pending.current);
      if (!Number.isFinite(page) || page < 1) return;
      pending.current = setTimeout(() => {
        pending.current = null;
        void take(page);
      }, AFTER_MS);
    },
    [take],
  );

  /** Nothing is worth photographing mid-turn, and the timer would fire into it. */
  const hold = useCallback(() => {
    if (pending.current) {
      clearTimeout(pending.current);
      pending.current = null;
    }
  }, []);

  /** A new book. Everything remembered is of the old one. */
  const reset = useCallback(() => {
    hold();
    Array.from(shots.current.keys()).forEach(drop);
  }, [drop, hold]);

  return { shotOf, schedule, hold, reset };
}
