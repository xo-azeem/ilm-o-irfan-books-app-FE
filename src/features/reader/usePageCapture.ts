import { useCallback, useEffect, useRef } from 'react';
import { Platform, type View } from 'react-native';
import { captureRef, releaseCapture, type CaptureOptions } from 'react-native-view-shot';

/**
 * How many pages of the book are kept as pictures.
 *
 * Enough for the page in hand and a few either side of it, so a reader working
 * back and forth over a spread is never folding blank paper. Anything more is
 * a copy of the book held in memory.
 */
const KEEP = 6;

/** How long a page is left to finish drawing before its picture is taken. */
const AFTER_MS = 400;

/** How a page is photographed: a lossy picture of paper is indistinguishable. */
const SHOT: CaptureOptions = {
  format: 'jpg',
  quality: 0.92,
  result: 'tmpfile',
  handleGLSurfaceViewOnAndroid: true,
};

/**
 * The other way iOS can take the picture, tried when the first way will not.
 * Some view trees refuse a hierarchy snapshot and render to a context happily.
 */
const SHOT_AGAIN: CaptureOptions = { ...SHOT, useRenderInContext: true };

/**
 * Pictures of pages, for the paper flip to fold.
 *
 * A turn needs two pages on screen at once: the leaf, twice over — flat and
 * mirrored across its own crease — and the page it opens onto underneath. The
 * document view can only ever draw the one page it is on, and a second live
 * instance over the same file races the first inside Pdfium and takes the app
 * down with it, so the second page has to come from somewhere else.
 *
 * It comes from here. The page in hand is photographed the moment the reader
 * touches it — while they are still looking at it, before the fold has begun,
 * and off a page that has certainly been drawn — and again, more idly, once a
 * page has settled. A fold draws its leaf from that while the document view
 * itself, moved to the page the fold is opening onto under cover of the leaf,
 * is the page underneath. So a turn costs one snapshot and nothing per frame.
 *
 * The one page this cannot supply is one that has never been on screen: turning
 * *back* to a page arrived at by a jump rather than by reading. The fold takes
 * that as blank paper, and the page is under it a moment later regardless.
 */
export function usePageCapture(
  host: React.RefObject<View | null>,
  /** A picture has been taken. A fold already in flight may want it. */
  onShot?: (page: number, uri: string) => void,
) {
  const shots = useRef(new Map<number, string>());
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);
  const alive = useRef(true);

  const handlers = useRef({ onShot });
  handlers.current = { onShot };

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

  const snapshot = useCallback(
    async (view: View) => {
      try {
        return await captureRef(view, SHOT);
      } catch (error) {
        if (Platform.OS !== 'ios') throw error;
        return captureRef(view, SHOT_AGAIN);
      }
    },
    [],
  );

  /**
   * Takes the page's picture now.
   *
   * `fresh` takes it again even if one exists: a picture taken on a timer may
   * have caught the page before it finished drawing, and the one taken under
   * the reader's finger is always of what they can see.
   */
  const take = useCallback(
    async (page: number, fresh: boolean) => {
      if (busy.current || !alive.current) return;
      if (!fresh && shots.current.has(page)) return;
      const view = host.current;
      if (!view) return;

      busy.current = true;
      try {
        const raw = await snapshot(view);
        if (!alive.current) {
          releaseCapture(raw);
          return;
        }
        // Android hands back a bare path; an SVG image wants a URL.
        const uri = /^[a-z]+:/i.test(raw) ? raw : `file://${raw}`;

        const previous = shots.current.get(page);
        // Re-inserted, so the newest picture is also the last to be let go of.
        shots.current.delete(page);
        shots.current.set(page, uri);
        if (previous && previous !== uri) {
          try {
            releaseCapture(previous);
          } catch {
            // As above.
          }
        }

        // Oldest first, which a Map keeps for us.
        while (shots.current.size > KEEP) {
          const oldest = shots.current.keys().next();
          if (oldest.done) break;
          drop(oldest.value);
        }

        handlers.current.onShot?.(page, uri);
      } catch (error) {
        // A snapshot can fail while the view is being laid out or torn down.
        // The fold falls back to blank paper, which is a softer failure than
        // anything worth showing a reader — but not one worth hiding from
        // whoever is building this.
        if (__DEV__) console.warn('[reader] could not photograph the page', error);
      } finally {
        busy.current = false;
      }
    },
    [drop, host, snapshot],
  );

  /** The reader has touched the page. Its picture is taken of what they see. */
  const refresh = useCallback(
    (page: number) => {
      if (pending.current) {
        clearTimeout(pending.current);
        pending.current = null;
      }
      if (!Number.isFinite(page) || page < 1) return;
      void take(page, true);
    },
    [take],
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
        void take(page, false);
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

  return { shotOf, refresh, schedule, hold };
}
