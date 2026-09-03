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

/** The leaf folding the rest of the way up: accelerating, as a page does. */
const OUT = {
  duration: PAGE_FLIP.outMs,
  easing: Easing.in(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;

/** The new leaf falling open, and settling rather than stopping. */
const IN = {
  duration: PAGE_FLIP.inMs,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

/** A fold let go of short of the commit. */
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
 * This one takes the drag, which is the whole difference between it and
 * `usePageTurn`. A pager slides and cannot be talked into folding, so in this
 * mode the document view's own scrolling is switched off and every page change
 * comes through `setPage` from here. It is also why `onSwap` fires at the top
 * of the fold rather than at the start of it: the reader must never see the
 * page change, only the leaf that hid it.
 *
 * The wait at the top of the fold is the one thing here worth knowing rather
 * than guessing at. Asking a document view for a page is not the same as
 * having it, so the leaf holds itself edge-on — where it has no width and
 * cannot be seen waiting — until the page reports in through `settle`, and
 * falls open on whatever is there once `graceMs` has passed regardless.
 *
 * A tap is not this hook's, for the same reason it is not `usePageTurn`'s: the
 * document view counts taps itself, one for the chrome and two for zoom, and
 * anything that claims the first loses the second. Only a tap that lands on the
 * stage rather than on the page is ours, and the page's own bounds are the
 * whole test. The drag stays clear of it too — nothing folds until the finger
 * has travelled sideways past the slop, by which time no tap is possible.
 *
 * Nothing in here draws the sheet the fold opens onto. That belongs to the
 * stage, which knows what colour the paper is; without it the leaf would fold
 * away onto the stage and the illusion would be over in one turn.
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
  /** Set while an animation owns the leaf and the finger does not. */
  const busy = useSharedValue(0);
  /** Set while the leaf is edge-on, waiting for the page it asked for. */
  const awaiting = useSharedValue(0);
  /** The grace clock. Drives nothing on screen; only its callback matters. */
  const hold = useSharedValue(0);

  /** Set while this touch is the one folding the leaf. */
  const owned = useSharedValue(0);
  /** Whether this touch has travelled far enough to stop being a tap. */
  const moved = useSharedValue(0);
  const downAt = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const velocity = useSharedValue(0);
  /** How far through the fold the drag has got, 0 to 1. */
  const progress = useSharedValue(0);
  /** Whether there is a page on the side the drag is heading. */
  const open = useSharedValue(0);

  // The page change is the one thing the worklets need from JS, so it is held
  // at a fixed identity — that is what keeps the gesture from being rebuilt on
  // every render of the reader.
  const swapRef = useRef(onSwap);
  swapRef.current = onSwap;
  const swap = useCallback((value: TurnDirection) => swapRef.current(value), []);

  const tapRef = useRef(onTap);
  tapRef.current = onTap;
  const tapped = useCallback(() => tapRef.current(), []);

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
      busy.value = 0;
    });
  }, [angle, awaiting, busy, dir, pivot]);

  /** The rest of the fold, the page change, and the wait between them. */
  const commit = useCallback(() => {
    'worklet';
    if (busy.value) return;
    busy.value = 1;

    const value = dir.value;
    pivot.value = value;
    angle.value = withTiming(-90 * value, OUT, finished => {
      if (!finished) {
        busy.value = 0;
        return;
      }

      // Edge-on: no part of the leaf is on screen, so this is the only moment
      // in the turn where the page under it can be changed unseen.
      awaiting.value = 1;
      runOnJS(swap)(value);

      hold.value = 0;
      hold.value = withTiming(1, HOLD, done => {
        // The page never reported. Fall open on what is there rather than hold
        // the reader on a blank sheet waiting for a document view.
        if (done && awaiting.value) foldIn();
      });
    });
  }, [angle, awaiting, busy, dir, foldIn, hold, pivot, swap]);

  const release = useCallback(() => {
    'worklet';
    if (!owned.value) return;
    owned.value = 0;

    const covered = progress.value;
    const flicked =
      Math.abs(velocity.value) > PAGE_FLIP.flickVelocity && covered > PAGE_FLIP.flickMin;
    // A flick only counts while it is still going the way the fold is; a hand
    // that changed its mind mid-drag has said so.
    const agrees = (velocity.value < 0) === (dir.value === 1);

    if (open.value === 1 && (covered >= PAGE_FLIP.commitRatio || (flicked && agrees))) {
      commit();
      return;
    }

    angle.value = withTiming(0, SETTLE);
  }, [angle, commit, dir, open, owned, progress, velocity]);

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
          // already turning is not the reader's to catch.
          owned.value = busy.value || zoom.value > MIN_SCALE + ZOOM_EPS ? 0 : 1;
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
          const span = Math.max(frame.value * PAGE_FLIP.travel, 1);
          const heading: TurnDirection = dx < 0 ? 1 : -1;
          dir.value = heading;
          open.value = canTurn(heading) ? 1 : 0;

          // A page at either end of the book still gives a little, so the
          // reader is told the book has ended rather than left wondering.
          const raw = Math.min(Math.abs(dx) / span, 1);
          const covered = open.value === 1 ? raw : raw * PAGE_FLIP.edgeGive;

          progress.value = covered;
          velocity.value = event.velocityX;
          pivot.value = heading;
          // Eased so the leaf lifts the moment the finger moves and slows as it
          // comes up, which is how a sheet of paper leaves a stack — and held
          // short of edge-on, so the page being left is never quite gone while
          // the finger that is leaving it is still down.
          angle.value =
            -90 * heading * PAGE_FLIP.dragLimit * Math.sin((covered * Math.PI) / 2);
        })
        .onTouchesUp(event => {
          const touch = event.changedTouches[0] ?? event.allTouches[0];
          if (touch && !busy.value) strayTap(touch.y, downAt.value);
        })
        .onFinalize(release),
    [
      angle,
      busy,
      canTurn,
      dir,
      downAt,
      enabled,
      frame,
      moved,
      open,
      originX,
      originY,
      owned,
      pivot,
      progress,
      release,
      strayTap,
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
   * centre — the same identity a `transformOrigin` is shorthand for.
   *
   * The perspective has to come first in the list, or the rotation is drawn
   * flat and the fold is only a squash.
   */
  const leafStyle = useAnimatedStyle(() => {
    const hinge = -half.value * pivot.value;
    return {
      transform: [
        { perspective: PAGE_FLIP.perspective },
        { translateX: hinge },
        { rotateY: `${angle.value}deg` },
        { translateX: -hinge },
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

  const beginTurn = useCallback(
    (value: TurnDirection) => {
      'worklet';
      if (busy.value) return;
      dir.value = value;
      open.value = 1;
      pivot.value = value;
      angle.value = 0;
      commit();
    },
    [angle, busy, commit, dir, open, pivot],
  );

  /** A page arrived at by name rather than by drag: a control, or a jump. */
  const start = useCallback(
    (value: TurnDirection) => {
      runOnUI(beginTurn)(value);
    },
    [beginTurn],
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

  const clear = useCallback(() => {
    'worklet';
    angle.value = 0;
    busy.value = 0;
    awaiting.value = 0;
    owned.value = 0;
  }, [angle, awaiting, busy, owned]);

  // Leaving the mode — or zooming in — mid-fold would otherwise leave the page
  // standing on its edge with nothing left to finish the turn.
  useEffect(() => {
    if (!enabled) runOnUI(clear)();
  }, [clear, enabled]);

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
