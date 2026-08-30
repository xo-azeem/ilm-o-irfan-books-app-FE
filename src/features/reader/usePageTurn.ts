import { useCallback, useMemo, useRef } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  ReduceMotion,
  runOnJS,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { MIN_SCALE, PAGE_TURN } from '@/features/reader/constants';

/** Forward is 1, back is -1: the reading direction, not a screen direction. */
export type TurnDirection = 1 | -1;

/** Past this the reader is looking at part of a page, and a drag pans it. */
const ZOOM_EPS = 0.02;

const SETTLE = {
  duration: PAGE_TURN.settleMs,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

const SHRINK = {
  duration: PAGE_TURN.shrinkMs,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;

const GROW = {
  duration: PAGE_TURN.growMs,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

const DIP = {
  duration: PAGE_TURN.dipMs,
  easing: Easing.in(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;

const RISE = {
  duration: PAGE_TURN.riseMs,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

export type PageTurn = ReturnType<typeof usePageTurn>;

/**
 * The depth under a page turn.
 *
 * The turn itself is not ours and must never be. The document view's own pager
 * carries both pages past each other under the finger, with real type on both,
 * and it is the thing a reader has in their hand for hours: it has to stay
 * exactly as smooth as it ships. So this takes no part in the touch — the
 * gesture is a pure observer, manual activation that never activates, reading
 * the finger and leaving it where it belongs. If everything in this file failed
 * silently, the swipe would still work.
 *
 * What it adds is depth, on one curve. One page of travel is one whole turn:
 * the page being read shrinks away as it leaves, smallest at the middle where
 * the two pages meet, and the same curve run out is the new page growing into
 * place. A drag that runs on through several pages breathes once per page.
 *
 * A flick outlives the finger — the pager is still moving after the touch is
 * gone — so the page holds itself drawn back and waits for the document view to
 * report the page it landed on, then grows in from there. That is the one thing
 * here worth knowing rather than guessing at.
 *
 * A page jumped to is different: nothing slides in from a jump, so the stage
 * dips out, changes page behind its own cover, and comes back.
 */
export function usePageTurn({
  enabled,
  onJump,
  onTap,
}: {
  /** Off in scrolling mode, and while the reader's zoom is up. */
  enabled: boolean;
  /** Changes page for a jump. Called under the cover of the dip. */
  onJump: (dir: TurnDirection) => void;
  /** A tap anywhere on the stage, margins included. */
  onTap: () => void;
}) {
  /** How deep into a turn the pages are, 0 at rest and 1 at the middle. */
  const lift = useSharedValue(0);
  /** The cover a page jump changes page behind. */
  const dip = useSharedValue(0);

  const frame = useSharedValue(0);
  /** The reader's own zoom. A zoomed page is dragged to be read, not turned. */
  const zoom = useSharedValue(MIN_SCALE);
  const page = useSharedValue(1);
  const total = useSharedValue(0);

  /** The page area inside the stage, and the page drawn in the middle of it. */
  const areaTop = useSharedValue(0);
  const areaHeight = useSharedValue(0);
  const pageHeight = useSharedValue(0);

  const tracking = useSharedValue(0);
  const jumping = useSharedValue(0);
  /** Whether this touch has travelled far enough to stop being a tap. */
  const moved = useSharedValue(0);
  const downAt = useSharedValue(0);
  /** Set while a turn is drawn back, waiting for the page it turned to. */
  const awaiting = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const lastX = useSharedValue(0);
  const lastAt = useSharedValue(0);
  const velocity = useSharedValue(0);
  /** Where in the current page the drag has got to, 0 to 1. */
  const phase = useSharedValue(0);
  /** Whether there is a page on the side the drag is heading. */
  const open = useSharedValue(0);

  // The page change is the one thing the worklets need from JS, so it is held
  // at a fixed identity — that is what keeps the gesture from being rebuilt on
  // every render of the reader.
  const jumpRef = useRef(onJump);
  jumpRef.current = onJump;
  const jump = useCallback((dir: TurnDirection) => jumpRef.current(dir), []);

  const tapRef = useRef(onTap);
  tapRef.current = onTap;
  const tapped = useCallback(() => tapRef.current(), []);

  const canTurn = useCallback(
    (dir: TurnDirection) => {
      'worklet';
      if (total.value < 2) return false;
      return dir === 1 ? page.value < total.value : page.value > 1;
    },
    [page, total],
  );

  const release = useCallback(() => {
    'worklet';
    if (!tracking.value) return;
    tracking.value = 0;

    // The pager finishes what the finger started — a flick, or a drag already
    // far enough to snap forward — long after the touch is over. The pages go
    // with it rather than stopping where the finger left them.
    const flicked = Math.abs(velocity.value) > PAGE_TURN.flickVelocity;
    const carried = open.value === 1 && (flicked || phase.value > PAGE_TURN.flickRatio);

    if (!carried) {
      lift.value = withTiming(0, SETTLE);
      return;
    }

    if (phase.value >= 0.5) {
      // Past the middle: the page leaving has drawn back as far as it is going
      // to, and what is left of the turn is the new page growing into place.
      awaiting.value = 0;
      lift.value = withTiming(0, GROW);
      return;
    }

    // Short of the middle. The page carries on drawing back and waits there for
    // the new one — `settle` grows it in the moment the pager reports it.
    awaiting.value = 1;
    lift.value = withTiming(1, SHRINK, finished => {
      if (!finished) return;
      // Nothing arrived: the pager thought better of it and snapped back. The
      // page comes forward again rather than sitting there small.
      lift.value = withDelay(
        PAGE_TURN.graceMs,
        withTiming(0, GROW, () => {
          awaiting.value = 0;
        }),
      );
    });
  }, [awaiting, lift, open, phase, tracking, velocity]);

  /**
   * A tap that landed on the stage rather than on the page.
   *
   * A page fitted to its own shape leaves bands of stage above and below it,
   * and those are where a thumb rests, so they have to answer a tap. But they
   * cannot answer it with a handler: anything that claims a tap claims the
   * touch, and the document view counts taps itself — one for the chrome, two
   * for zoom. Take the first and the second never arrives, which is exactly how
   * double-tap zoom was lost.
   *
   * So a tap on the page is left alone, and only a tap outside it is ours. The
   * page's own bounds are the whole test.
   */
  const strayTap = useCallback(
    (y: number, at: number) => {
      'worklet';
      if (moved.value || Date.now() - at > PAGE_TURN.tapMs) return;
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
        // Manual activation, and it never activates. Nothing here ever calls
        // `activate`, so the handler stays in its begun state for the life of
        // the touch and the document view keeps every event: the page turn goes
        // on exactly as it would with none of this here. Read `onTouches*`
        // below as watching a swipe, never as handling one.
        .manualActivation(true)
        .onTouchesDown(event => {
          const touch = event.allTouches[0];
          if (!touch || jumping.value) return;
          originX.value = touch.absoluteX;
          originY.value = touch.absoluteY;
          lastX.value = touch.absoluteX;
          lastAt.value = Date.now();
          downAt.value = Date.now();
          velocity.value = 0;
          phase.value = 0;
          moved.value = 0;
          // A finger back on the page owns the turn from here.
          awaiting.value = 0;
        })
        .onTouchesMove(event => {
          const touch = event.allTouches[0];
          if (!touch || jumping.value) return;

          const dx = touch.absoluteX - originX.value;
          const dy = touch.absoluteY - originY.value;
          if (Math.abs(dx) > PAGE_TURN.slop || Math.abs(dy) > PAGE_TURN.slop) {
            moved.value = 1;
          }

          // A page under a zoom is being dragged around to be read, not turned.
          if (zoom.value > MIN_SCALE + ZOOM_EPS) return;
          if (Math.abs(dx) < PAGE_TURN.slop) return;

          const now = Date.now();
          velocity.value =
            ((touch.absoluteX - lastX.value) / Math.max(now - lastAt.value, 1)) * 1000;
          lastX.value = touch.absoluteX;
          lastAt.value = now;

          const span = frame.value > 0 ? frame.value : 1;
          const dir: TurnDirection = dx < 0 ? 1 : -1;
          open.value = canTurn(dir) ? 1 : 0;

          // One page of travel is one full turn, so the pages are at their
          // smallest halfway between two pages and back to size on the next.
          const travel = Math.abs(dx) / span;
          phase.value = travel - Math.floor(travel);
          tracking.value = 1;
          lift.value =
            Math.sin(phase.value * Math.PI) * (open.value === 1 ? 1 : PAGE_TURN.edgeLift);
        })
        .onTouchesUp(event => {
          const touch = event.changedTouches[0] ?? event.allTouches[0];
          if (touch && !jumping.value) strayTap(touch.y, downAt.value);
          release();
        })
        .onTouchesCancelled(release)
        .onFinalize(release),
    [
      awaiting,
      canTurn,
      downAt,
      enabled,
      frame,
      jumping,
      lastAt,
      lastX,
      lift,
      moved,
      open,
      originX,
      originY,
      phase,
      release,
      strayTap,
      tracking,
      velocity,
      zoom,
    ],
  );

  const style = useAnimatedStyle(() => {
    const depth = Math.max(lift.value, dip.value);
    return {
      opacity: 1 - dip.value,
      transform: [{ scale: 1 - (1 - PAGE_TURN.liftScale) * depth }],
    };
  });

  const runJump = useCallback(
    (dir: TurnDirection) => {
      'worklet';
      if (jumping.value) return;
      jumping.value = 1;

      dip.value = withTiming(1, DIP, finished => {
        if (!finished) {
          dip.value = 0;
          jumping.value = 0;
          return;
        }

        runOnJS(jump)(dir);
        // The page changes while the stage is bare, and the stage comes back
        // over the page it changed to.
        dip.value = withDelay(
          PAGE_TURN.swapMs,
          withTiming(0, RISE, () => {
            jumping.value = 0;
          }),
        );
      });
    },
    [dip, jump, jumping],
  );

  /** A page arrived at by name rather than by swipe: a jump, or a control. */
  const start = useCallback(
    (dir: TurnDirection) => {
      runOnUI(runJump)(dir);
    },
    [runJump],
  );

  const settleIn = useCallback(() => {
    'worklet';
    if (!awaiting.value) return;
    awaiting.value = 0;
    lift.value = withTiming(0, GROW);
  }, [awaiting, lift]);

  /**
   * The document view has reported a new page. A turn still drawn back from a
   * flick grows it in from here, so the growth starts when the page does.
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

  /** The page itself, centred in that area. */
  const onPageLayout = useCallback(
    (event: LayoutChangeEvent) => {
      pageHeight.value = event.nativeEvent.layout.height;
    },
    [pageHeight],
  );

  /** Where the reader is, so the stage knows which way it can still turn. */
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

  return { gesture, style, start, settle, onAreaLayout, onPageLayout, setBounds, setZoom };
}
