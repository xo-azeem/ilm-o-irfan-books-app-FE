import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  ReduceMotion,
  runOnJS,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { MIN_SCALE, PAGE_FLIP } from '@/features/reader/constants';
import type { TurnDirection } from '@/features/reader/usePageTurn';

/** Past this the reader is looking at part of a page, and a drag pans it. */
const ZOOM_EPS = 0.02;

/** A fold let go of short of the commit, lying back down on the book. */
const SETTLE = {
  duration: PAGE_FLIP.settleMs,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

/** The rubber band at either end of the book, coming back to rest. */
const EDGE_SETTLE = {
  duration: PAGE_FLIP.settleMs,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

/** A whole turn run by a control rather than a finger. */
const AUTO = {
  duration: PAGE_FLIP.autoMs,
  easing: Easing.inOut(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

export type PaperFlip = ReturnType<typeof usePaperFlip>;

/**
 * The paper flip: one leaf, turned the whole way over its spine.
 *
 * `theta` is the entire model — the leaf's rotation about the hinge edge, zero
 * lying on the book, ±90 standing on its edge, ±180 turned over and off. The
 * finger drives it directly while it is down, and every release path is only a
 * question of where theta goes from here: on over the top, or back down flat.
 * Past ninety degrees the viewer is looking at the back of the sheet, which the
 * renderer gives us for free — a plane seen from behind draws its content
 * mirrored — and the stage lays a near-opaque paper backing over the leaf at
 * that moment, so what shows through is a mirrored ghost of the ink: the back
 * of a printed page.
 *
 * What this hook deliberately does not know is what the leaf is made of. The
 * stage photographs the page and mounts the picture; the document view under it
 * is already on the destination page before the fold has lifted a degree. So
 * there is no seam, no wait and no cover anywhere in here: the turn reveals the
 * next page continuously because the next page is genuinely there, and an
 * aborted turn lies back down over it while the stage quietly walks the
 * document view home. The JS side hears four things — `onPrepare` when a finger
 * lands and a photograph is worth taking, `onFoldStart` when a fold truly
 * begins, and `onCommit` / `onAbort` when theta finishes at one end or the
 * other — and owns everything about pages and pictures itself.
 *
 * A tap is not this hook's, for the same reason it is not `usePageTurn`'s: the
 * document view counts taps itself, one for the chrome and two for zoom, and
 * anything that claims the first loses the second. Only a tap that lands on the
 * stage rather than on the page is ours, and the page's own bounds are the
 * whole test. The drag stays clear of it too — nothing folds until the finger
 * has travelled sideways past the slop, by which time no tap is possible.
 */
export function usePaperFlip({
  enabled,
  onPrepare,
  onFoldStart,
  onCommit,
  onAbort,
  onTap,
}: {
  /** Off in the other reading modes, and while the reader's zoom is up. */
  enabled: boolean;
  /** A finger has landed on the page: photograph it, a fold may follow. */
  onPrepare: () => void;
  /** A fold has truly begun: mount the picture, move the page beneath it. */
  onFoldStart: (dir: TurnDirection) => void;
  /** The leaf finished the turn. The page beneath is already the new one. */
  onCommit: (dir: TurnDirection) => void;
  /** The leaf lay back down. Walk the document view back where it was. */
  onAbort: (dir: TurnDirection) => void;
  /** A tap on the stage either side of the page. */
  onTap: () => void;
}) {
  /** The turn, in degrees. 0 flat, ±90 edge-on, ±180 turned over and off. */
  const theta = useSharedValue(0);
  /** Which edge the leaf is hinged on: +1 the left, -1 the right. */
  const pivot = useSharedValue<1 | -1>(1);
  /** Half the leaf's width, which is how far its hinge is off its centre. */
  const half = useSharedValue(0);
  /** Where the finger took hold, top of the page -1 to bottom +1. */
  const grab = useSharedValue(0);
  /** The give at either end of the book, in points of sideways travel. */
  const edge = useSharedValue(0);

  const frame = useSharedValue(0);
  /** The reader's own zoom. A zoomed page is dragged to be read, not turned. */
  const zoom = useSharedValue(MIN_SCALE);
  const page = useSharedValue(1);
  const total = useSharedValue(0);

  /** The page area inside the stage, and the page drawn in the middle of it. */
  const areaTop = useSharedValue(0);
  const areaHeight = useSharedValue(0);
  const pageHeight = useSharedValue(0);

  /** The direction this turn locked to at its first sideways move. */
  const dir = useSharedValue<TurnDirection>(1);
  /** Set from fold start until the stage says the turn is fully cleaned up. */
  const busy = useSharedValue(0);
  /** Set while the finger is the thing driving theta. */
  const foldActive = useSharedValue(0);

  /** Set while this touch is the one the fold would belong to. */
  const owned = useSharedValue(0);
  /** Whether this touch has travelled far enough to stop being a tap. */
  const moved = useSharedValue(0);
  const downAt = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const velocity = useSharedValue(0);
  /** How far through the whole turn the drag has got, 0 to 1. */
  const progress = useSharedValue(0);

  // What the worklets need from JS is held at a fixed identity — that is what
  // keeps the gesture from being rebuilt on every render of the reader.
  const handlers = useRef({ onPrepare, onFoldStart, onCommit, onAbort, onTap });
  handlers.current = { onPrepare, onFoldStart, onCommit, onAbort, onTap };

  const prepare = useCallback(() => handlers.current.onPrepare(), []);
  const foldStart = useCallback(
    (value: TurnDirection) => handlers.current.onFoldStart(value),
    [],
  );
  const commitDone = useCallback(
    (value: TurnDirection) => handlers.current.onCommit(value),
    [],
  );
  const abortDone = useCallback((value: TurnDirection) => handlers.current.onAbort(value), []);
  const tapped = useCallback(() => handlers.current.onTap(), []);

  const canTurn = useCallback(
    (value: TurnDirection) => {
      'worklet';
      if (total.value < 2) return false;
      return value === 1 ? page.value < total.value : page.value > 1;
    },
    [page, total],
  );

  /** The rest of the way over, from wherever the finger let go. */
  const carryOver = useCallback(
    (value: TurnDirection) => {
      'worklet';
      const remaining = Math.max(1 - Math.abs(theta.value) / 180, 0);
      theta.value = withTiming(
        -180 * value,
        {
          duration: Math.max(PAGE_FLIP.commitMinMs, PAGE_FLIP.commitMs * remaining),
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        },
        finished => {
          if (finished) runOnJS(commitDone)(value);
        },
      );
    },
    [commitDone, theta],
  );

  /** Back down flat, over the page the fold had already uncovered. */
  const layBack = useCallback(
    (value: TurnDirection) => {
      'worklet';
      theta.value = withTiming(0, SETTLE, finished => {
        if (finished) runOnJS(abortDone)(value);
      });
    },
    [abortDone, theta],
  );

  const release = useCallback(() => {
    'worklet';
    if (!owned.value) return;
    owned.value = 0;

    if (edge.value !== 0) {
      edge.value = withTiming(0, EDGE_SETTLE);
    }
    if (!foldActive.value) return;
    foldActive.value = 0;

    const value = dir.value;
    const covered = progress.value;
    const flicked =
      Math.abs(velocity.value) > PAGE_FLIP.flickVelocity && covered > PAGE_FLIP.flickMin;
    // A flick only counts while it is still going the way the fold is; a hand
    // that changed its mind mid-drag has said so.
    const agrees = (velocity.value < 0) === (value === 1);

    if (covered >= PAGE_FLIP.commitRatio || (flicked && agrees)) {
      carryOver(value);
    } else {
      layBack(value);
    }
  }, [carryOver, dir, edge, foldActive, layBack, owned, progress, velocity]);

  /**
   * A tap that landed on the stage rather than on the page.
   *
   * The bands of stage above and below a fitted page are where a thumb rests,
   * so they have to answer a tap — but a tap on the page itself belongs to the
   * document view, which is counting to two for its own zoom. Only what falls
   * outside the page is taken here.
   */
  const strayTap = useCallback(
    (y: number, at: number) => {
      'worklet';
      if (moved.value || Date.now() - at > PAGE_FLIP.tapMs) return;
      if (pageHeight.value <= 0) return;

      const withinPage = Math.abs(y - areaTop.value - areaHeight.value / 2) <= pageHeight.value / 2;
      if (!withinPage) runOnJS(tapped)();
    },
    [areaHeight, areaTop, moved, pageHeight, tapped],
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        // A second finger is a pinch, and a pinch is not a turn.
        .maxPointers(1)
        // The leaf is hinged sideways, so only a sideways drag folds it — and
        // nothing is claimed off the document view until one has begun, which
        // is what leaves its single and double taps alone.
        .activeOffsetX([-PAGE_FLIP.slop, PAGE_FLIP.slop])
        .onBegin(() => {
          velocity.value = 0;
          progress.value = 0;
          // A page under a zoom is being moved around to be read, and a leaf
          // already mid-turn is not the reader's to catch.
          if (busy.value || zoom.value > MIN_SCALE + ZOOM_EPS) {
            owned.value = 0;
            return;
          }
          owned.value = 1;
          // The photograph starts now, while the finger is still deciding: by
          // the time a fold has crossed the slop it is usually already taken.
          runOnJS(prepare)();
        })
        .onTouchesDown(event => {
          const touch = event.allTouches[0];
          if (!touch) return;
          originX.value = touch.absoluteX;
          originY.value = touch.absoluteY;
          downAt.value = Date.now();
          moved.value = 0;
        })
        .onTouchesMove(event => {
          // Travel on either axis, and before the fold has begun: this is what
          // tells a tap from everything else, so it cannot wait on a drag the
          // reader may never have meant to start.
          const touch = event.allTouches[0];
          if (!touch) return;
          if (
            Math.abs(touch.absoluteX - originX.value) > PAGE_FLIP.slop ||
            Math.abs(touch.absoluteY - originY.value) > PAGE_FLIP.slop
          ) {
            moved.value = 1;
          }
        })
        .onUpdate(event => {
          if (!owned.value) return;
          const dx = event.translationX;

          if (!foldActive.value) {
            const heading: TurnDirection = dx < 0 ? 1 : -1;
            if (!canTurn(heading)) {
              // The book has ended on that side. The page still gives a
              // little, so the reader is told rather than left wondering.
              edge.value = Math.max(
                -PAGE_FLIP.edgeGive,
                Math.min(PAGE_FLIP.edgeGive, dx * 0.12),
              );
              return;
            }

            // The fold locks its direction here. A drag walked back past its
            // origin lays the leaf flat rather than turning the other way —
            // the page under it has already been changed for this direction.
            foldActive.value = 1;
            busy.value = 1;
            dir.value = heading;
            pivot.value = heading;
            edge.value = withTiming(0, EDGE_SETTLE);

            // Where on the page the finger took hold. A grab at the middle
            // turns the leaf square; high or low tips it like a corner grab.
            const middle = areaTop.value + areaHeight.value / 2;
            const span = Math.max(pageHeight.value / 2, 1);
            grab.value = Math.max(-1, Math.min(1, (event.y - middle) / span));

            runOnJS(foldStart)(heading);
          }

          const value = dir.value;
          const span = Math.max(frame.value * PAGE_FLIP.travel, 1);
          // Only travel the fold's own way counts; past the origin it is flat.
          const along = Math.max(value === 1 ? -dx : dx, 0);
          const covered = Math.min(along / span, 1);

          progress.value = covered;
          velocity.value = event.velocityX;
          // Eased so the leaf lifts the moment the finger moves and slows as
          // it comes over the top, which is how a sheet leaves a stack. The
          // whole drag is the whole turn: the far end of it is the leaf lying
          // face down, not standing on its edge.
          theta.value = -180 * value * Math.sin((covered * Math.PI) / 2);
        })
        .onTouchesUp(event => {
          const touch = event.changedTouches[0] ?? event.allTouches[0];
          if (touch && !busy.value) strayTap(touch.y, downAt.value);
        })
        .onFinalize(release),
    [
      busy,
      canTurn,
      dir,
      downAt,
      edge,
      enabled,
      foldActive,
      foldStart,
      frame,
      grab,
      areaHeight,
      areaTop,
      moved,
      originX,
      originY,
      owned,
      pageHeight,
      pivot,
      prepare,
      progress,
      release,
      strayTap,
      theta,
      velocity,
      zoom,
    ],
  );

  /**
   * The leaf.
   *
   * Rotated about one of its own edges rather than its centre, which a plain
   * `rotateY` cannot do: the leaf is walked so the hinge lands on the middle,
   * the fold happens there, and it is walked back. The offset is negative for
   * the left edge because it is where the hinge is, measured out from the
   * centre — the same identity a `transformOrigin` is shorthand for. The tilt
   * is innermost, so a corner-grabbed page is a tipped sheet turning on a
   * straight spine rather than a straight sheet on a leaning one.
   *
   * The perspective has to come first in the list, or the rotation is drawn
   * flat and the fold is only a squash.
   */
  const leafStyle = useAnimatedStyle(() => {
    const hinge = -half.value * pivot.value;
    const lifted = Math.sin((Math.abs(theta.value) * Math.PI) / 180);
    const tilt = grab.value * dir.value * PAGE_FLIP.tiltDeg * lifted;
    return {
      transform: [
        { perspective: PAGE_FLIP.perspective },
        { translateX: hinge },
        { rotateY: `${theta.value}deg` },
        { translateX: -hinge },
        { rotateZ: `${tilt}deg` },
      ],
    };
  });

  /**
   * The paper backing, laid over the leaf the moment it turns past edge-on.
   *
   * From there the renderer is drawing the leaf from behind — mirrored, which
   * is exactly right — and this sheet of paper over it is what makes that read
   * as the back of a page: near-opaque white, with the mirrored ink showing
   * through as the ghost it shows through as on any printed sheet.
   */
  const backingStyle = useAnimatedStyle(() => ({
    opacity: Math.abs(theta.value) > 90 ? PAGE_FLIP.backOpacity : 0,
  }));

  /**
   * The crease, laid over the leaf: dark at the hinge, where a turning page is
   * in its own shadow, clearing towards the free edge that catches the light.
   * Deepest with the leaf on edge, gone when it lies flat on either side.
   * Mirrored so it stays on the hinge whichever way the reader is going.
   */
  const creaseStyle = useAnimatedStyle(() => {
    const steep = Math.sin((Math.abs(theta.value) * Math.PI) / 180);
    return {
      opacity: steep * PAGE_FLIP.leafShade,
      transform: [{ scaleX: pivot.value }],
    };
  });

  /**
   * The shadow the raised leaf throws across the page beneath it — the page
   * the fold is in the act of revealing. Deepest mid-turn, gone at both ends.
   */
  const castStyle = useAnimatedStyle(() => {
    const through = Math.abs(theta.value) / 180;
    return {
      opacity: Math.sin(through * Math.PI) * PAGE_FLIP.castShade,
      transform: [{ scaleX: pivot.value }],
    };
  });

  /** The end-of-book give: the page itself, nudged and let back. */
  const edgeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: edge.value }],
  }));

  const runAuto = useCallback(
    (value: TurnDirection) => {
      'worklet';
      if (foldActive.value || Math.abs(theta.value) > 1) return;
      busy.value = 1;
      dir.value = value;
      pivot.value = value;
      grab.value = 0;
      theta.value = withTiming(-180 * value, AUTO, finished => {
        if (finished) runOnJS(commitDone)(value);
      });
    },
    [busy, commitDone, dir, foldActive, grab, pivot, theta],
  );

  /**
   * A turn run by a control rather than a finger. The stage calls this once
   * the leaf's picture is mounted, so the whole turn is over real paper.
   */
  const animateTurn = useCallback(
    (value: TurnDirection) => {
      runOnUI(runAuto)(value);
    },
    [runAuto],
  );

  const clear = useCallback(() => {
    'worklet';
    theta.value = 0;
    edge.value = 0;
    busy.value = 0;
    foldActive.value = 0;
    owned.value = 0;
    grab.value = 0;
    progress.value = 0;
  }, [busy, edge, foldActive, grab, owned, progress, theta]);

  /**
   * The stage has taken the leaf down; the turn is over. Called only once the
   * picture is off screen — resetting theta any sooner would lay a flat copy
   * of the old page over the new one for a frame.
   */
  const reset = useCallback(() => {
    runOnUI(clear)();
  }, [clear]);

  // Leaving the mode — or zooming in — mid-turn would otherwise leave the
  // leaf standing in the air with nothing left to finish the turn.
  useEffect(() => {
    if (!enabled) runOnUI(clear)();
  }, [clear, enabled]);

  /** The area a page is drawn in: inside the stage, clear of the furniture. */
  const onAreaLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height, y } = event.nativeEvent.layout;
      frame.value = width;
      areaHeight.value = height;
      areaTop.value = y;
    },
    [areaHeight, areaTop, frame],
  );

  /**
   * The page itself, centred in that area. Its width is where the hinge is —
   * the fold is on the edge of the paper, never on the edge of the screen.
   */
  const onPageLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      pageHeight.value = height;
      half.value = width > 0 ? width / 2 : 0;
    },
    [half, pageHeight],
  );

  /** Where the reader is, so the leaf knows which way it can still turn. */
  const setBounds = useCallback(
    (current: number, count: number) => {
      page.value = current;
      total.value = count;
    },
    [page, total],
  );

  /** The reader's chosen zoom, read on the UI thread. */
  const setZoom = useCallback(
    (value: number) => {
      zoom.value = Number.isFinite(value) ? value : MIN_SCALE;
    },
    [zoom],
  );

  return {
    gesture,
    leafStyle,
    backingStyle,
    creaseStyle,
    castStyle,
    edgeStyle,
    animateTurn,
    reset,
    onAreaLayout,
    onPageLayout,
    setBounds,
    setZoom,
  };
}
