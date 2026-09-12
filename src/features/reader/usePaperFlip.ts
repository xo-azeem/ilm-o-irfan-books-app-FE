import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  ReduceMotion,
  runOnJS,
  runOnUI,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { MIN_SCALE, PAGE_FLIP } from '@/features/reader/constants';
import { progressOf, tether } from '@/features/reader/paperFold';
import type { TurnDirection } from '@/features/reader/usePageTurn';

/** Past this the reader is looking at part of a page, and a drag pans it. */
const ZOOM_EPS = 0.02;

/**
 * The leaf carrying the rest of the way over.
 *
 * Accelerating out of the hand and easing into the landing, which is what a
 * page let go of half-way does — the design's own curve, written out.
 */
function turnEase(t: number) {
  'worklet';
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2.4) / 2;
}

const TURN = {
  duration: PAGE_FLIP.turnMs,
  easing: turnEase,
  reduceMotion: ReduceMotion.System,
} as const;

/** A whole turn run by a control rather than a finger: the same curve, slower. */
const AUTO = {
  duration: PAGE_FLIP.autoMs,
  easing: turnEase,
  reduceMotion: ReduceMotion.System,
} as const;

/** A fold let go of short of the commit, dropping back flat. */
const SETTLE = {
  duration: PAGE_FLIP.settleMs,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

/** The give at either end of the book, coming back. */
const EDGE = {
  duration: PAGE_FLIP.edgeMs,
  easing: Easing.bezier(0.2, 0.7, 0.3, 1),
  reduceMotion: ReduceMotion.System,
} as const;

/**
 * Where the fold is, as the renderer needs to read it.
 *
 * All of it lives on the UI thread. `PaperFold` turns these five numbers into
 * clip paths, a reflection and two gradients, once per frame.
 */
export type FoldState = {
  /** The corner in the hand, in the page's own coordinates. */
  fx: SharedValue<number>;
  fy: SharedValue<number>;
  /** Which corner the sheet hinges from: 0 the top, `h` the bottom. */
  cy: SharedValue<number>;
  /** The page, in points. The spine is the left edge of it. */
  w: SharedValue<number>;
  h: SharedValue<number>;
  /** Set while there is a fold on screen at all. */
  live: SharedValue<number>;
};

export type PaperFlip = ReturnType<typeof usePaperFlip>;

/**
 * The paper flip.
 *
 * A sheet of paper creasing over on itself. The reader takes hold of the page
 * anywhere — corner, edge, middle — and the paper folds along the perpendicular
 * bisector of the corner they grabbed and the point they have carried it to,
 * which is what a folded sheet actually does. `paperFold.ts` has the geometry;
 * this has the hand.
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
 * So the gesture is declared with manual activation and never activates; the
 * fold is driven from `onTouches*`, which fire from the first finger down
 * whether or not any handler has claimed the touch. It costs nothing, because
 * the pager is switched off in this mode and there is no one left to compete
 * with.
 *
 * ## The weight
 *
 * The corner chases the finger rather than being pinned to it, a frame at a
 * time. A pointer stream is coarse and arrives in bursts; a leaf of paper has
 * weight, and `followTouch` / `followFrame` are where it comes from. The fold
 * answers in the same beat the finger's report arrives and keeps easing
 * between reports.
 *
 * ## What this does not own
 *
 * The page change. A turn ends with the leaf either gone from the page
 * entirely or lying flat across the whole of it, and the stage — which knows
 * where the document view is — uses the second of those as the moment to swap
 * the page underneath unseen. This hook only says when the leaf has landed.
 *
 * A tap is not this hook's either. The document view counts taps itself, one
 * for the chrome and two for zoom, and anything that claims the first loses
 * the second — and reports the first a second time, since the document view
 * still confirms its own single tap a beat later. So a tap on the page is
 * left to it, as the swipe mode leaves it, and only a tap that landed on the
 * stage beside the page is taken here.
 *
 * Nor is the zoom. The document view pinches and double-taps on its own, and
 * once it has, a drag pans the page rather than folding it; `setZoom` is how
 * the stage tells this hook so, whichever of the two took the zoom.
 */
export function usePaperFlip({
  enabled,
  onBegin,
  onEnd,
  onTap,
  onTouch,
}: {
  /** Off in the other reading modes, and while the reader's zoom is up. */
  enabled: boolean;
  /** A fold has started. The stage brings the leaf up and moves the document. */
  onBegin: (dir: TurnDirection) => void;
  /** The leaf has landed, turned or not. The stage settles the document view. */
  onEnd: (commit: boolean, dir: TurnDirection) => void;
  /** A tap on the stage beside the page. Taps on the page are the page's own. */
  onTap: () => void;
  /** A finger has landed on the page. Fires on every touch, fold or not. */
  onTouch?: () => void;
}) {
  /** The corner in the hand, eased, and the point it is chasing. */
  const fx = useSharedValue(0);
  const fy = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const cy = useSharedValue(0);
  const w = useSharedValue(0);
  const h = useSharedValue(0);
  const live = useSharedValue(0);

  /** The give at either end of the book, in points of sideways travel. */
  const edge = useSharedValue(0);

  /** The reader's own zoom. A zoomed page is dragged to be read, not turned. */
  const zoom = useSharedValue(MIN_SCALE);
  const page = useSharedValue(1);
  const total = useSharedValue(0);

  /** The page area inside the stage, and the page drawn in the middle of it. */
  const areaX = useSharedValue(0);
  const areaY = useSharedValue(0);
  const areaW = useSharedValue(0);
  const areaH = useSharedValue(0);

  const dir = useSharedValue<TurnDirection>(1);
  /** Set while a finger is the thing driving the fold. */
  const dragging = useSharedValue(0);
  /** Set from the start of a fold until the stage has taken the leaf down. */
  const turning = useSharedValue(0);

  /** Whether this touch has travelled far enough to stop being a tap. */
  const moved = useSharedValue(0);
  const downAt = useSharedValue(0);
  const downX = useSharedValue(0);
  const downY = useSharedValue(0);
  /** Where the finger was when the fold locked its direction. */
  const startX = useSharedValue(0);
  const lastX = useSharedValue(0);
  const lastAt = useSharedValue(0);
  const velocity = useSharedValue(0);

  // What the worklets need from JS is held at a fixed identity — that is what
  // keeps the gesture from being rebuilt on every render of the reader.
  const handlers = useRef({ onBegin, onEnd, onTap, onTouch });
  handlers.current = { onBegin, onEnd, onTap, onTouch };

  const began = useCallback((value: TurnDirection) => handlers.current.onBegin(value), []);
  const ended = useCallback(
    (commit: boolean, value: TurnDirection) => handlers.current.onEnd(commit, value),
    [],
  );
  const tapped = useCallback(() => handlers.current.onTap(), []);
  const touched = useCallback(() => handlers.current.onTouch?.(), []);

  const canTurn = useCallback(
    (value: TurnDirection) => {
      'worklet';
      if (total.value < 2) return false;
      return value === 1 ? page.value < total.value : page.value > 1;
    },
    [page, total],
  );

  /** Where the corner rests before a fold, and where it lands after one. */
  const restX = useCallback(
    (value: TurnDirection) => {
      'worklet';
      return value === 1 ? w.value : -w.value;
    },
    [w],
  );

  const turnedX = useCallback(
    (value: TurnDirection) => {
      'worklet';
      return value === 1 ? -w.value : w.value;
    },
    [w],
  );

  /** One step of the chase. `e` is how much of the gap it closes. */
  const follow = useCallback(
    (e: number) => {
      'worklet';
      fx.value += (tx.value - fx.value) * e;
      fy.value += (ty.value - fy.value) * e;
    },
    [fx, fy, tx, ty],
  );

  // The frame between pointer reports. A pointer stream is coarse, and this is
  // what keeps the leaf moving — and slowing — in the gaps.
  const frames = useFrameCallback(() => {
    'worklet';
    if (!dragging.value) return;
    follow(PAGE_FLIP.followFrame);
  }, false);

  const { setActive } = frames;
  useEffect(() => {
    setActive(enabled);
    return () => setActive(false);
  }, [enabled, setActive]);

  /** Carries the fold the rest of the way over, or drops it back flat. */
  const land = useCallback(
    (commit: boolean, config: typeof TURN | typeof AUTO | typeof SETTLE) => {
      'worklet';
      const value = dir.value;
      const to = commit ? turnedX(value) : restX(value);
      tx.value = to;
      ty.value = cy.value;
      fy.value = withTiming(cy.value, config);
      fx.value = withTiming(to, config, finished => {
        if (!finished) return;
        // The leaf has landed. Whether it is now gone from the page or lying
        // flat across the whole of it is the stage's business, not ours.
        runOnJS(ended)(commit, value);
      });
    },
    [cy, dir, ended, fx, fy, restX, turnedX, tx, ty],
  );

  const release = useCallback(() => {
    'worklet';
    if (edge.value !== 0) edge.value = withTiming(0, EDGE);
    if (!dragging.value) return;
    dragging.value = 0;

    // Measured off the point the corner is chasing rather than the eased one:
    // the reader's hand has already said where the page is going.
    const covered = progressOf(tx.value, dir.value, w.value);
    // The speed is the last move's, and a finger that has stopped sends no
    // moves: only a finger still moving as it lifts was flicking.
    const moving = Date.now() - lastAt.value <= PAGE_FLIP.flickWindowMs;
    const flicked =
      moving && Math.abs(velocity.value) > PAGE_FLIP.flickVelocity && covered > PAGE_FLIP.flickMin;
    // A flick only counts while it is still going the way the fold is; a hand
    // that changed its mind mid-drag has said so.
    const agrees = velocity.value < 0 === (dir.value === 1);
    const commit = covered >= PAGE_FLIP.commitRatio || (flicked && agrees);

    land(commit, commit ? TURN : SETTLE);
  }, [dir, dragging, edge, land, lastAt, tx, velocity, w]);

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

          // Page coordinates: the page is centred in the area, and the area is
          // inset into the frame the gesture is attached to.
          const left = areaX.value + (areaW.value - w.value) / 2;
          const top = areaY.value + (areaH.value - h.value) / 2;
          downX.value = touch.x - left;
          downY.value = touch.y - top;

          lastX.value = downX.value;
          lastAt.value = Date.now();
          downAt.value = Date.now();
          velocity.value = 0;
          moved.value = 0;

          // Which corner the sheet hinges from — the near one.
          if (!turning.value) cy.value = downY.value < h.value / 2 ? 0 : h.value;

          runOnJS(touched)();
        })
        .onTouchesMove(event => {
          const touch = event.allTouches[0];
          if (!touch) return;

          const left = areaX.value + (areaW.value - w.value) / 2;
          const top = areaY.value + (areaH.value - h.value) / 2;
          const px = touch.x - left;
          const py = touch.y - top;

          const dx = px - downX.value;
          const dy = py - downY.value;
          if (Math.abs(dx) > PAGE_FLIP.slop || Math.abs(dy) > PAGE_FLIP.slop) {
            moved.value = 1;
          }

          // A page under a zoom is being moved around to be read, not turned,
          // and a leaf already mid-turn is not the reader's to catch.
          if (zoom.value > MIN_SCALE + ZOOM_EPS) return;
          if (turning.value && !dragging.value) return;
          if (w.value <= 0 || h.value <= 0) return;

          const now = Date.now();
          velocity.value = (px - lastX.value) / Math.max(now - lastAt.value, 1);
          lastX.value = px;
          lastAt.value = now;

          if (!dragging.value) {
            if (Math.abs(dx) < PAGE_FLIP.slop) return;
            const heading: TurnDirection = dx < 0 ? 1 : -1;
            if (!canTurn(heading)) {
              // The book has ended on that side. The sheet gives a little, so
              // the reader is told rather than left wondering.
              edge.value = Math.max(
                -PAGE_FLIP.edgeGive,
                Math.min(PAGE_FLIP.edgeGive, dx * PAGE_FLIP.edgeFollow),
              );
              return;
            }

            // The fold locks its direction here. A drag walked back past its
            // origin lays the leaf flat again rather than turning the other way.
            dragging.value = 1;
            turning.value = 1;
            dir.value = heading;
            startX.value = px;

            // Forward, the corner starts where it rests: at the free edge.
            // Coming back, the leaf is the page already turned — it starts
            // folded flat against the spine and unrolls to the right off the
            // same hinge. Placed before the fold is called live, so that the
            // first frame drawn of it is this one and not the last turn's.
            fx.value = restX(heading);
            fy.value = cy.value;
            tx.value = fx.value;
            ty.value = fy.value;
            live.value = 1;
            runOnJS(began)(heading);
          }

          // The corner follows the finger, amplified — a sheet lifts further
          // than the hand travels — and is then tethered to the spine.
          const travel = PAGE_FLIP.amplify * (px - startX.value);
          const carried = tether(restX(dir.value) + travel, cy.value + dy, cy.value, w.value);
          tx.value = carried.x;
          ty.value = carried.y;
          // Applied now as well as on the next frame: the fold answers the
          // finger in the same beat its report arrives.
          follow(PAGE_FLIP.followTouch);
        })
        .onTouchesUp(() => {
          if (!dragging.value && !turning.value && !moved.value) {
            // A tap, but only ours if it missed the page: the document view
            // answers taps on the page itself, and it must see both of a
            // double-tap to zoom on them.
            const onPage =
              downX.value >= 0 &&
              downX.value <= w.value &&
              downY.value >= 0 &&
              downY.value <= h.value;
            if (!onPage && Date.now() - downAt.value < PAGE_FLIP.tapMs) runOnJS(tapped)();
          }
          release();
        })
        .onTouchesCancelled(release)
        .onFinalize(release),
    [
      areaH,
      areaW,
      areaX,
      areaY,
      began,
      canTurn,
      cy,
      dir,
      downAt,
      downX,
      downY,
      dragging,
      edge,
      enabled,
      follow,
      fx,
      fy,
      h,
      lastAt,
      lastX,
      live,
      moved,
      release,
      restX,
      startX,
      tapped,
      touched,
      turning,
      tx,
      ty,
      velocity,
      w,
      zoom,
    ],
  );

  /** The whole page stack, giving at either end of the book. */
  const groupStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: edge.value }],
  }));

  const runAuto = useCallback(
    (value: TurnDirection) => {
      'worklet';
      if (turning.value || w.value <= 0) return;
      turning.value = 1;
      dir.value = value;
      // Nobody grabbed it, so it turns the way a page turns when you nudge the
      // bottom corner of it.
      cy.value = h.value;
      fx.value = restX(value);
      fy.value = cy.value;
      tx.value = fx.value;
      ty.value = fy.value;
      live.value = 1;
      runOnJS(began)(value);
      land(true, AUTO);
    },
    [began, cy, dir, fx, fy, h, land, live, restX, turning, tx, ty, w],
  );

  /** A page arrived at by name rather than by drag: a control, or a jump. */
  const start = useCallback(
    (value: TurnDirection) => {
      runOnUI(runAuto)(value);
    },
    [runAuto],
  );

  const clearUI = useCallback(() => {
    'worklet';
    dragging.value = 0;
    turning.value = 0;
    live.value = 0;
    edge.value = 0;
    fx.value = 0;
    fy.value = 0;
    tx.value = 0;
    ty.value = 0;
  }, [dragging, edge, fx, fy, live, ty, turning, tx]);

  /** The stage has taken the leaf down; there is no fold any more. */
  const clear = useCallback(() => {
    runOnUI(clearUI)();
  }, [clearUI]);

  // Leaving the mode — or zooming in — mid-fold would otherwise leave the leaf
  // standing on the page with nothing left to finish the turn.
  useEffect(() => {
    if (!enabled) clear();
  }, [clear, enabled]);

  /** The area a page is drawn in: inside the stage, clear of the furniture. */
  const onAreaLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height, x, y } = event.nativeEvent.layout;
      areaX.value = x;
      areaY.value = y;
      areaW.value = width;
      areaH.value = height;
    },
    [areaH, areaW, areaX, areaY],
  );

  /**
   * The page itself, centred in that area. The whole fold is measured in its
   * coordinates — the crease is on the paper, never on the edge of the screen.
   */
  const onPageLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      w.value = width;
      h.value = height;
    },
    [h, w],
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

  const fold: FoldState = useMemo(() => ({ fx, fy, cy, w, h, live }), [cy, fx, fy, h, live, w]);

  return {
    gesture,
    fold,
    groupStyle,
    start,
    clear,
    onAreaLayout,
    onPageLayout,
    setBounds,
    setZoom,
  };
}
