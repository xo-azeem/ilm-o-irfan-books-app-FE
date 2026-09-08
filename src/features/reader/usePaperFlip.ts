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

/** The shape both fold-up curves share: the finger's, and a control's. */
type WithTimingConfig = {
  duration: number;
  easing: ReturnType<typeof Easing.in>;
  reduceMotion: ReduceMotion;
};

/** Past this the reader is looking at part of a page, and a drag pans it. */
const ZOOM_EPS = 0.02;

/** The leaf folding the rest of the way up: accelerating, as a page does. */
const OUT = {
  duration: PAGE_FLIP.outMs,
  easing: Easing.in(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;

/** The same, from a standing start, for a turn no finger is driving. */
const AUTO_OUT = {
  duration: PAGE_FLIP.autoOutMs,
  easing: Easing.inOut(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;

/** The new leaf falling open, and settling rather than stopping. */
const IN = {
  duration: PAGE_FLIP.inMs,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

/** A fold let go of short of the commit, and the end-of-book give coming back. */
const SETTLE = {
  duration: PAGE_FLIP.settleMs,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

/**
 * Not a motion — a clock, run on the UI thread so the wait is frame-exact and
 * nothing on screen is driven by it. Reduce motion is deliberately not honoured
 * here: skipping the wait would not spare anyone a movement, it would only fall
 * the leaf open on the page it just left.
 */
const HOLD = {
  duration: PAGE_FLIP.graceMs,
  easing: Easing.linear,
  reduceMotion: ReduceMotion.Never,
} as const;

export type PaperFlip = ReturnType<typeof usePaperFlip>;

/**
 * The paper flip.
 *
 * A leaf of paper, folded about its spine. The page being read rotates in
 * perspective about the edge it is leaving by until it stands edge-on and has
 * no width at all; the document view changes page inside that instant; and the
 * page arrived at falls open about the opposite edge. Two real rotations with
 * one invisible seam between them, so the turn reads as paper rather than as
 * two pictures crossfading.
 *
 * ## Why this watches the touch instead of taking it
 *
 * The obvious way to drive a fold is an ordinary pan — `activeOffsetX`, then
 * `onUpdate`. It does not work here, and that is worth writing down because it
 * cost two rewrites to find. `onUpdate` only ever fires once a pan has
 * *activated*, and activating means winning the touch away from the native
 * document view underneath. Against that view the pan does not reliably win,
 * so `onUpdate` never ran: no fold, and — since this mode switches the pager
 * off and does every page change itself — no page turn either. The reader
 * could not move at all.
 *
 * So this does what `usePageTurn` does, for a different reason. The gesture is
 * declared with manual activation and never activates; the fold is driven from
 * `onTouches*`, which fire from the first finger down whether or not any
 * handler has claimed the touch. `usePageTurn` observes because it must not
 * disturb the pager it is riding on. This observes because observing is the
 * only thing that reliably works — and it costs nothing, since the pager is
 * switched off in this mode and there is no one left to compete with.
 *
 * ## The rest of it
 *
 * The wait at the top of the fold is the one other thing worth knowing rather
 * than guessing at. Asking a document view for a page is not the same as
 * having it, so the leaf holds itself edge-on — where it has no width and
 * cannot be seen waiting — until the page reports in through `settle`, and
 * falls open on whatever is there once `graceMs` has passed regardless.
 *
 * A tap is not this hook's, for the same reason it is not `usePageTurn`'s: the
 * document view counts taps itself, one for the chrome and two for zoom, and
 * anything that claims the first loses the second. Only a tap that lands on the
 * stage rather than on the page is ours, and the page's own bounds are the
 * whole test.
 *
 * Nothing in here draws the sheet the fold opens onto. That belongs to the
 * stage, which knows what colour the paper is.
 */
export function usePaperFlip({
  enabled,
  onSwap,
  onTap,
}: {
  /** Off in the other reading modes, and while the reader's zoom is up. */
  enabled: boolean;
  /** Changes page. Called at the top of the fold, with the leaf edge-on. */
  onSwap: (dir: TurnDirection) => void;
  /** A tap on the stage either side of the page. */
  onTap: () => void;
}) {
  /** The fold, in degrees. 0 is flat, ±90 is edge-on and invisible. */
  const angle = useSharedValue(0);
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

  const dir = useSharedValue<TurnDirection>(1);
  /** Set from the top of a fold until the leaf has fallen open again. */
  const turning = useSharedValue(0);
  /** Set while a finger is the thing driving the fold. */
  const folding = useSharedValue(0);
  /** Set while the leaf is edge-on, waiting for the page it asked for. */
  const awaiting = useSharedValue(0);
  /** The grace clock. Drives nothing on screen; only its callback matters. */
  const hold = useSharedValue(0);

  /** Whether this touch has travelled far enough to stop being a tap. */
  const moved = useSharedValue(0);
  const downAt = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const lastX = useSharedValue(0);
  const lastAt = useSharedValue(0);
  const velocity = useSharedValue(0);
  /** How far through the fold the drag has got, 0 to 1. */
  const progress = useSharedValue(0);

  // What the worklets need from JS is held at a fixed identity — that is what
  // keeps the gesture from being rebuilt on every render of the reader.
  const handlers = useRef({ onSwap, onTap });
  handlers.current = { onSwap, onTap };

  const swap = useCallback((value: TurnDirection) => handlers.current.onSwap(value), []);
  const tapped = useCallback(() => handlers.current.onTap(), []);

  const canTurn = useCallback(
    (value: TurnDirection) => {
      'worklet';
      if (total.value < 2) return false;
      return value === 1 ? page.value < total.value : page.value > 1;
    },
    [page, total],
  );

  /**
   * The leaf falls open — from the far edge, because the page it opens onto is
   * not the page that folded away.
   */
  const foldIn = useCallback(() => {
    'worklet';
    awaiting.value = 0;
    const value = dir.value;
    pivot.value = value === 1 ? -1 : 1;
    angle.value = 90 * value;
    angle.value = withTiming(0, IN, () => {
      turning.value = 0;
    });
  }, [angle, awaiting, dir, pivot, turning]);

  /** The rest of the fold, the page change, and the wait between them. */
  const carryOver = useCallback(
    (config: WithTimingConfig) => {
      'worklet';
      const value = dir.value;
      pivot.value = value;
      angle.value = withTiming(-90 * value, config, finished => {
        if (!finished) {
          turning.value = 0;
          return;
        }

        // Edge-on: no part of the leaf is on screen, so this is the only
        // moment in the turn where the page under it can be changed unseen.
        awaiting.value = 1;
        runOnJS(swap)(value);

        hold.value = 0;
        hold.value = withTiming(1, HOLD, done => {
          // The page never reported. Fall open on what is there rather than
          // hold the reader on a blank sheet waiting for a document view.
          if (done && awaiting.value) foldIn();
        });
      });
    },
    [angle, awaiting, dir, foldIn, hold, pivot, swap, turning],
  );

  const release = useCallback(() => {
    'worklet';
    if (edge.value !== 0) {
      edge.value = withTiming(0, SETTLE);
    }
    if (!folding.value) return;
    folding.value = 0;

    const covered = progress.value;
    const flicked =
      Math.abs(velocity.value) > PAGE_FLIP.flickVelocity && covered > PAGE_FLIP.flickMin;
    // A flick only counts while it is still going the way the fold is; a hand
    // that changed its mind mid-drag has said so.
    const agrees = (velocity.value < 0) === (dir.value === 1);

    if (covered >= PAGE_FLIP.commitRatio || (flicked && agrees)) {
      carryOver(OUT);
      return;
    }

    angle.value = withTiming(0, SETTLE, () => {
      turning.value = 0;
    });
  }, [angle, carryOver, dir, edge, folding, progress, turning, velocity]);

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
        // Manual activation, and it never activates — see the note on the hook.
        // Every `onTouches*` below fires from the first finger down regardless,
        // which is the whole reason the fold is driven from them.
        .manualActivation(true)
        .onTouchesDown(event => {
          const touch = event.allTouches[0];
          if (!touch) return;
          originX.value = touch.absoluteX;
          originY.value = touch.absoluteY;
          lastX.value = touch.absoluteX;
          lastAt.value = Date.now();
          downAt.value = Date.now();
          velocity.value = 0;
          progress.value = 0;
          moved.value = 0;
        })
        .onTouchesMove(event => {
          const touch = event.allTouches[0];
          if (!touch) return;

          const dx = touch.absoluteX - originX.value;
          const dy = touch.absoluteY - originY.value;
          if (Math.abs(dx) > PAGE_FLIP.slop || Math.abs(dy) > PAGE_FLIP.slop) {
            moved.value = 1;
          }

          // A page under a zoom is being moved around to be read, not turned,
          // and a leaf already mid-turn is not the reader's to catch.
          if (zoom.value > MIN_SCALE + ZOOM_EPS) return;
          if (turning.value && !folding.value) return;
          if (Math.abs(dx) < PAGE_FLIP.slop) return;

          const now = Date.now();
          velocity.value =
            ((touch.absoluteX - lastX.value) / Math.max(now - lastAt.value, 1)) * 1000;
          lastX.value = touch.absoluteX;
          lastAt.value = now;

          if (!folding.value) {
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
            // origin lays the leaf flat rather than turning the other way.
            folding.value = 1;
            turning.value = 1;
            dir.value = heading;
            pivot.value = heading;

            // Where on the page the finger took hold. A grab at the middle
            // turns the leaf square; high or low tips it like a corner grab.
            const middle = areaTop.value + areaHeight.value / 2;
            const span = Math.max(pageHeight.value / 2, 1);
            grab.value = Math.max(-1, Math.min(1, (touch.absoluteY - middle) / span));
          }

          const value = dir.value;
          const span = Math.max(frame.value * PAGE_FLIP.travel, 1);
          // Only travel the fold's own way counts; back past the origin the
          // leaf lies flat again rather than folding the other way.
          const along = Math.max(value === 1 ? -dx : dx, 0);
          const covered = Math.min(along / span, 1);

          progress.value = covered;
          // Eased so the leaf lifts the moment the finger moves and slows as it
          // comes up, which is how a sheet of paper leaves a stack — and held
          // short of edge-on, so the page being left is never quite gone while
          // the finger that is leaving it is still down.
          angle.value =
            -90 * value * PAGE_FLIP.dragLimit * Math.sin((covered * Math.PI) / 2);
        })
        .onTouchesUp(event => {
          const touch = event.changedTouches[0] ?? event.allTouches[0];
          if (touch && !turning.value) strayTap(touch.absoluteY, downAt.value);
          release();
        })
        .onTouchesCancelled(release)
        .onFinalize(release),
    [
      angle,
      areaHeight,
      areaTop,
      canTurn,
      dir,
      downAt,
      edge,
      enabled,
      folding,
      frame,
      grab,
      lastAt,
      lastX,
      moved,
      originX,
      originY,
      pageHeight,
      pivot,
      progress,
      release,
      strayTap,
      turning,
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
   * is outermost, so a corner-grabbed page is a tipped sheet turning on a
   * straight spine rather than a straight sheet on a leaning one.
   *
   * The perspective has to come first in the list, or the rotation is drawn
   * flat and the fold is only a squash.
   */
  const leafStyle = useAnimatedStyle(() => {
    const hinge = -half.value * pivot.value;
    const lifted = Math.sin((Math.abs(angle.value) * Math.PI) / 180);
    const tilt = grab.value * dir.value * PAGE_FLIP.tiltDeg * lifted;
    return {
      transform: [
        { perspective: PAGE_FLIP.perspective },
        { translateX: edge.value + hinge },
        { rotateY: `${angle.value}deg` },
        { translateX: -hinge },
        { rotateZ: `${tilt}deg` },
      ],
    };
  });

  /**
   * The crease, laid over the leaf: dark at the hinge, where a folded page is
   * in its own shadow, clearing towards the free edge that catches the light.
   * Mirrored so it stays on the hinge whichever way the reader is going.
   */
  const creaseStyle = useAnimatedStyle(() => {
    const fold = Math.min(Math.abs(angle.value) / 90, 1);
    return {
      opacity: fold * PAGE_FLIP.leafShade,
      transform: [{ scaleX: pivot.value }],
    };
  });

  /**
   * The shadow the raised leaf throws across the sheet under it.
   *
   * Deepest with the leaf half up and gone by the time it stands on its edge,
   * which is both what a raised page does to the paper under it and what keeps
   * the seam invisible: the hinge changes edges at the top of the fold, and a
   * shadow still burning at full strength would be seen to jump across.
   */
  const castStyle = useAnimatedStyle(() => {
    const fold = Math.min(Math.abs(angle.value) / 90, 1);
    return {
      opacity: Math.sin(fold * Math.PI) * PAGE_FLIP.castShade,
      transform: [{ scaleX: pivot.value }],
    };
  });

  const runAuto = useCallback(
    (value: TurnDirection) => {
      'worklet';
      if (turning.value) return;
      turning.value = 1;
      dir.value = value;
      grab.value = 0;
      angle.value = 0;
      carryOver(AUTO_OUT);
    },
    [angle, carryOver, dir, grab, turning],
  );

  /** A page arrived at by name rather than by drag: a control, or a jump. */
  const start = useCallback(
    (value: TurnDirection) => {
      runOnUI(runAuto)(value);
    },
    [runAuto],
  );

  const settleIn = useCallback(() => {
    'worklet';
    if (!awaiting.value) return;
    foldIn();
  }, [awaiting, foldIn]);

  /**
   * The document view has reported a new page. A leaf held edge-on falls open
   * from here, so the page is under it before the reader can see either.
   */
  const settle = useCallback(() => {
    runOnUI(settleIn)();
  }, [settleIn]);

  const clear = useCallback(() => {
    'worklet';
    angle.value = 0;
    edge.value = 0;
    turning.value = 0;
    folding.value = 0;
    awaiting.value = 0;
    grab.value = 0;
    progress.value = 0;
  }, [angle, awaiting, edge, folding, grab, progress, turning]);

  // Leaving the mode — or zooming in — mid-fold would otherwise leave the page
  // standing on its edge with nothing left to finish the turn.
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

  /** Where the reader is, so the leaf knows which way it can still fold. */
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
    creaseStyle,
    castStyle,
    start,
    settle,
    onAreaLayout,
    onPageLayout,
    setBounds,
    setZoom,
  };
}
