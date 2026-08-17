import {
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  forwardRef,
} from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { BookPdfSource } from '@/constants/books';
import { ReaderPdfPage } from '@/features/reader/components/ReaderPdfPage';
import {
  FLIP_ACTIVE_OFFSET,
  FLIP_COMMIT_RATIO,
  FLIP_COMMIT_VELOCITY,
  FLIP_DURATION_MS,
  FLIP_EDGE_RATIO,
  FLIP_FAIL_OFFSET_Y,
  FLIP_MAX_ROTATE_DEG,
  FLIP_PREPARE_MS,
  FLIP_RUBBER_RATIO,
  MAX_SCALE,
  MIN_SCALE,
  PAGE_INSET,
} from '@/features/reader/constants';

type Slot = 'a' | 'b';

export type BookPageFlipHandle = {
  turn: (dir: 1 | -1) => void;
};

type BookPageFlipProps = {
  source: BookPdfSource;
  scale: number;
  onLoadComplete: (totalPages: number) => void;
  onError: () => void;
  onPageChanged: (page: number, totalPages: number) => void;
  onScaleChanged: (scale: number) => void;
  onApplyScale: (scale: number) => void;
  onResetZoom: () => void;
};

const FLIP_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const SCALE_EPS = 0.01;

function otherSlot(slot: Slot): Slot {
  return slot === 'a' ? 'b' : 'a';
}

function clampPage(page: number, totalPages: number) {
  if (totalPages <= 0) return Math.max(1, page);
  return Math.min(Math.max(page, 1), totalPages);
}

function rubberband(distance: number, limit: number) {
  'worklet';
  if (limit <= 0) return 0;
  const sign = distance < 0 ? -1 : 1;
  return sign * (1 - 1 / (Math.abs(distance) / limit + 1)) * limit;
}

export const BookPageFlip = memo(
  forwardRef<BookPageFlipHandle, BookPageFlipProps>(function BookPageFlip(
    {
      source,
      scale,
      onLoadComplete,
      onError,
      onPageChanged,
      onScaleChanged,
      onApplyScale,
      onResetZoom,
    },
    ref,
  ) {
  const [slotPage, setSlotPage] = useState({ a: 1, b: 1 });
  const [frontSlot, setFrontSlot] = useState<Slot>('a');
  const [totalPages, setTotalPages] = useState(0);
  const [pinching, setPinching] = useState(false);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });

  const dragX = useSharedValue(0);
  const pageWidth = useSharedValue(1);
  const frontIsA = useSharedValue(1);
  const isAnimating = useSharedValue(0);
  const isDragging = useSharedValue(0);
  const expectedBack = useSharedValue(0);
  const pageASV = useSharedValue(1);
  const pageBSV = useSharedValue(1);
  const totalPagesSV = useSharedValue(0);
  const scaleSV = useSharedValue(scale);
  const pinchStart = useSharedValue(MIN_SCALE);

  const frontSlotRef = useRef<Slot>('a');
  const pageRef = useRef(1);
  const totalPagesRef = useRef(0);
  const slotPageRef = useRef(slotPage);
  const flippingRef = useRef(false);
  const pendingReset = useRef(false);
  const didReportInitial = useRef(false);
  const lastLayoutWidth = useRef(0);
  const prepareTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const zoomed = scale > MIN_SCALE + SCALE_EPS;
  const gestureLocked = zoomed && !pinching;
  const canFlip = !gestureLocked && totalPages > 1;

  frontSlotRef.current = frontSlot;
  slotPageRef.current = slotPage;

  useEffect(() => {
    scaleSV.value = scale;
  }, [scale, scaleSV]);

  useEffect(() => {
    pageASV.value = slotPage.a;
    pageBSV.value = slotPage.b;
  }, [pageASV, pageBSV, slotPage]);

  useEffect(() => {
    totalPagesSV.value = totalPages;
  }, [totalPages, totalPagesSV]);

  useEffect(() => {
    return () => {
      if (prepareTimer.current) {
        clearTimeout(prepareTimer.current);
      }
    };
  }, []);

  const handleLoadComplete = useCallback(
    (numberOfPages: number) => {
      setTotalPages(numberOfPages);
      totalPagesRef.current = numberOfPages;
      totalPagesSV.value = numberOfPages;
      onLoadComplete(numberOfPages);

      setSlotPage(prev => {
        const front = frontSlotRef.current;
        const back = otherSlot(front);
        const frontPage = clampPage(prev[front], numberOfPages);
        return {
          ...prev,
          [front]: frontPage,
          [back]: clampPage(frontPage + 1, numberOfPages),
        };
      });

      if (!didReportInitial.current) {
        didReportInitial.current = true;
        onPageChanged(pageRef.current, numberOfPages);
      }
    },
    [onLoadComplete, onPageChanged, totalPagesSV],
  );

  const prepareBackPage = useCallback(
    (dir: 1 | -1) => {
      const target = clampPage(pageRef.current + dir, totalPagesRef.current);
      if (target === pageRef.current) return;

      const back = otherSlot(frontSlotRef.current);
      expectedBack.value = target;

      if (slotPageRef.current[back] === target) return;

      setSlotPage(prev => {
        if (prev[back] === target) return prev;
        return { ...prev, [back]: target };
      });
    },
    [expectedBack],
  );

  const settleTurn = useCallback(
    (dir: 1 | -1) => {
      const newPage = clampPage(pageRef.current + dir, totalPagesRef.current);
      const total = totalPagesRef.current;
      const oldFront = frontSlotRef.current;
      const nextFront = otherSlot(oldFront);

      pageRef.current = newPage;
      frontSlotRef.current = nextFront;
      pendingReset.current = true;
      flippingRef.current = false;

      frontIsA.value = nextFront === 'a' ? 1 : 0;
      dragX.value = 0;
      isAnimating.value = 0;
      isDragging.value = 0;
      expectedBack.value = 0;

      setFrontSlot(nextFront);
      setSlotPage(prev => ({
        ...prev,
        [oldFront]: clampPage(newPage + 1, total),
      }));

      onPageChanged(newPage, total);
      onResetZoom();
    },
    [dragX, expectedBack, frontIsA, isAnimating, isDragging, onPageChanged, onResetZoom],
  );

  useLayoutEffect(() => {
    if (!pendingReset.current) return;
    pendingReset.current = false;
    dragX.value = 0;
    isAnimating.value = 0;
    isDragging.value = 0;
  }, [dragX, frontSlot, isAnimating, isDragging]);

  const unlock = useCallback(() => {
    flippingRef.current = false;
    isAnimating.value = 0;
    isDragging.value = 0;
    expectedBack.value = 0;
  }, [expectedBack, isAnimating, isDragging]);

  const animateTurn = useCallback(
    (dir: 1 | -1) => {
      isAnimating.value = 1;
      const width = pageWidth.value;
      dragX.value = withTiming(
        -dir * width,
        { duration: FLIP_DURATION_MS, easing: FLIP_EASE },
        finished => {
          if (finished) {
            runOnJS(settleTurn)(dir);
          } else {
            runOnJS(unlock)();
          }
        },
      );
    },
    [dragX, isAnimating, pageWidth, settleTurn, unlock],
  );

  const turnPage = useCallback(
    (dir: 1 | -1) => {
      if (flippingRef.current) return;

      const target = pageRef.current + dir;
      const total = totalPagesRef.current;
      if (target < 1 || (total > 0 && target > total)) return;

      flippingRef.current = true;
      isAnimating.value = 1;
      prepareBackPage(dir);

      if (prepareTimer.current) {
        clearTimeout(prepareTimer.current);
      }
      prepareTimer.current = setTimeout(() => {
        prepareTimer.current = null;
        animateTurn(dir);
      }, FLIP_PREPARE_MS);
    },
    [animateTurn, isAnimating, prepareBackPage],
  );

  useImperativeHandle(ref, () => ({ turn: turnPage }), [turnPage]);

  const startTurn = useCallback(
    (dir: 1 | -1) => {
      if (gestureLocked) return;
      turnPage(dir);
    },
    [gestureLocked, turnPage],
  );

  const handleEdgeTap = useCallback(
    (x: number) => {
      const width = pageWidth.value;
      const edge = width * FLIP_EDGE_RATIO;
      if (x <= edge) {
        startTurn(-1);
      } else if (x >= width - edge) {
        startTurn(1);
      }
    },
    [pageWidth, startTurn],
  );

  const handleDoubleTapZoom = useCallback(() => {
    onApplyScale(scale > MIN_SCALE + SCALE_EPS ? MIN_SCALE : 2);
  }, [onApplyScale, scale]);

  const applyPinchScale = useCallback(
    (next: number) => {
      onApplyScale(Number(Math.min(MAX_SCALE, Math.max(MIN_SCALE, next)).toFixed(2)));
    },
    [onApplyScale],
  );

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      pageWidth.value = Math.max(width, 1);
      setFrameSize(prev =>
        Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1
          ? prev
          : { width, height },
      );

      if (lastLayoutWidth.current === 0) {
        lastLayoutWidth.current = width;
        return;
      }

      if (Math.abs(width - lastLayoutWidth.current) > 1) {
        lastLayoutWidth.current = width;
        cancelAnimation(dragX);
        dragX.value = 0;
        isAnimating.value = 0;
        isDragging.value = 0;
        flippingRef.current = false;
        expectedBack.value = 0;
      }
    },
    [dragX, expectedBack, isAnimating, isDragging, pageWidth],
  );

  const pan = Gesture.Pan()
    .enabled(canFlip)
    .maxPointers(1)
    .activeOffsetX([-FLIP_ACTIVE_OFFSET, FLIP_ACTIVE_OFFSET])
    .failOffsetY([-FLIP_FAIL_OFFSET_Y, FLIP_FAIL_OFFSET_Y])
    .onStart(() => {
      'worklet';
      if (isAnimating.value === 1 && isDragging.value === 0) {
        return;
      }
      cancelAnimation(dragX);
      isDragging.value = 1;
      isAnimating.value = 1;
    })
    .onUpdate(event => {
      'worklet';
      if (isDragging.value !== 1) return;

      const width = pageWidth.value;
      const translation = event.translationX;
      const frontPage = frontIsA.value === 1 ? pageASV.value : pageBSV.value;
      const total = totalPagesSV.value;
      const atFirst = frontPage <= 1 && translation > 0;
      const atLast = total > 0 && frontPage >= total && translation < 0;
      const limit = width * FLIP_RUBBER_RATIO;

      if (atFirst || atLast) {
        dragX.value = rubberband(translation, limit);
        return;
      }

      dragX.value = Math.min(Math.max(translation, -width), width);

      const dir = translation < 0 ? 1 : -1;
      const target = frontPage + dir;
      if (expectedBack.value !== target && target >= 1 && (total <= 0 || target <= total)) {
        expectedBack.value = target;
        runOnJS(prepareBackPage)(dir);
      }
    })
    .onEnd(event => {
      'worklet';
      if (isDragging.value !== 1) return;
      isDragging.value = 0;

      const width = pageWidth.value;
      const frontPage = frontIsA.value === 1 ? pageASV.value : pageBSV.value;
      const total = totalPagesSV.value;
      const translation = event.translationX;
      const velocity = event.velocityX;
      const dir = (Math.abs(translation) > 8 ? translation < 0 : velocity < 0) ? 1 : -1;
      const atBound =
        (dir === -1 && frontPage <= 1) || (dir === 1 && total > 0 && frontPage >= total);
      const commit =
        !atBound &&
        (Math.abs(translation) > width * FLIP_COMMIT_RATIO ||
          Math.abs(velocity) > FLIP_COMMIT_VELOCITY);

      if (commit) {
        runOnJS(prepareBackPage)(dir);
        dragX.value = withTiming(
          -dir * width,
          { duration: FLIP_DURATION_MS, easing: FLIP_EASE },
          finished => {
            if (finished) {
              runOnJS(settleTurn)(dir);
            } else {
              runOnJS(unlock)();
            }
          },
        );
        return;
      }

      dragX.value = withTiming(
        0,
        { duration: FLIP_DURATION_MS, easing: FLIP_EASE },
        finished => {
          if (finished) {
            runOnJS(unlock)();
          }
        },
      );
    })
    .onFinalize(() => {
      'worklet';
      if (isDragging.value === 1) {
        isDragging.value = 0;
        dragX.value = withTiming(
          0,
          { duration: FLIP_DURATION_MS, easing: FLIP_EASE },
          finished => {
            if (finished) {
              runOnJS(unlock)();
            }
          },
        );
      }
    });

  const pinch = Gesture.Pinch()
    .enabled(!gestureLocked)
    .onStart(() => {
      'worklet';
      pinchStart.value = scaleSV.value;
      runOnJS(setPinching)(true);
    })
    .onUpdate(event => {
      'worklet';
      runOnJS(applyPinchScale)(pinchStart.value * event.scale);
    })
    .onEnd(event => {
      'worklet';
      runOnJS(applyPinchScale)(pinchStart.value * event.scale);
      runOnJS(setPinching)(false);
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(setPinching)(false);
    });

  const doubleTap = Gesture.Tap()
    .enabled(!gestureLocked)
    .numberOfTaps(2)
    .maxDelay(220)
    .onEnd(() => {
      'worklet';
      runOnJS(handleDoubleTapZoom)();
    });

  const edgeTap = Gesture.Tap()
    .enabled(canFlip)
    .maxDistance(12)
    .onEnd(event => {
      'worklet';
      runOnJS(handleEdgeTap)(event.x);
    });

  const composed = Gesture.Simultaneous(
    pan,
    pinch,
    Gesture.Exclusive(doubleTap, edgeTap),
  );

  const slotStyleA = useAnimatedStyle(() => {
    const isFront = frontIsA.value === 1;
    const width = Math.max(pageWidth.value, 1);
    const progress = Math.min(Math.max(dragX.value / width, -1), 1);
    const abs = Math.abs(progress);

    if (isFront) {
      if (abs < 0.001) {
        return { zIndex: 2, opacity: 1, transform: [{ translateX: 0 }] };
      }
      const originX = progress <= 0 ? width / 2 : -width / 2;
      return {
        zIndex: 2,
        opacity: interpolate(abs, [0, 1], [1, 0.42], Extrapolation.CLAMP),
        transform: [
          { perspective: 1200 },
          { translateX: originX },
          { rotateY: `${progress * FLIP_MAX_ROTATE_DEG}deg` },
          { translateX: -originX },
          { translateX: dragX.value * 0.12 },
        ],
      };
    }

    const ready = expectedBack.value === 0 || pageASV.value === expectedBack.value;
    const dir = progress <= 0 ? 1 : -1;

    return {
      zIndex: 1,
      opacity: ready ? 1 : 0,
      transform:
        abs < 0.001
          ? [{ translateX: 0 }]
          : [
              {
                translateX: interpolate(abs, [0, 1], [dir * width * 0.45, 0], Extrapolation.CLAMP),
              },
              { scale: interpolate(abs, [0, 1], [0.97, 1], Extrapolation.CLAMP) },
            ],
    };
  });

  const slotStyleB = useAnimatedStyle(() => {
    const isFront = frontIsA.value === 0;
    const width = Math.max(pageWidth.value, 1);
    const progress = Math.min(Math.max(dragX.value / width, -1), 1);
    const abs = Math.abs(progress);

    if (isFront) {
      if (abs < 0.001) {
        return { zIndex: 2, opacity: 1, transform: [{ translateX: 0 }] };
      }
      const originX = progress <= 0 ? width / 2 : -width / 2;
      return {
        zIndex: 2,
        opacity: interpolate(abs, [0, 1], [1, 0.42], Extrapolation.CLAMP),
        transform: [
          { perspective: 1200 },
          { translateX: originX },
          { rotateY: `${progress * FLIP_MAX_ROTATE_DEG}deg` },
          { translateX: -originX },
          { translateX: dragX.value * 0.12 },
        ],
      };
    }

    const ready = expectedBack.value === 0 || pageBSV.value === expectedBack.value;
    const dir = progress <= 0 ? 1 : -1;

    return {
      zIndex: 1,
      opacity: ready ? 1 : 0,
      transform:
        abs < 0.001
          ? [{ translateX: 0 }]
          : [
              {
                translateX: interpolate(abs, [0, 1], [dir * width * 0.45, 0], Extrapolation.CLAMP),
              },
              { scale: interpolate(abs, [0, 1], [0.97, 1], Extrapolation.CLAMP) },
            ],
    };
  });

  const shadeStyleA = useAnimatedStyle(() => {
    if (frontIsA.value !== 1) return { opacity: 0 };
    const width = Math.max(pageWidth.value, 1);
    return { opacity: Math.min(Math.abs(dragX.value) / width, 1) * 0.32 };
  });

  const shadeStyleB = useAnimatedStyle(() => {
    if (frontIsA.value !== 0) return { opacity: 0 };
    const width = Math.max(pageWidth.value, 1);
    return { opacity: Math.min(Math.abs(dragX.value) / width, 1) * 0.32 };
  });

  const aIsFront = frontSlot === 'a';
  const hasFrame = frameSize.width > 0 && frameSize.height > 0;

  return (
    <View style={styles.stage}>
      <GestureDetector gesture={composed}>
        <Animated.View
          collapsable={false}
          onLayout={onLayout}
          pointerEvents={gestureLocked ? 'box-none' : 'auto'}
          style={styles.pageFrame}>
          <Animated.View collapsable={false} style={[styles.slot, slotStyleB]}>
            {hasFrame ? (
              <ReaderPdfPage
                source={source}
                page={slotPage.b}
                width={frameSize.width}
                height={frameSize.height}
                scale={aIsFront ? MIN_SCALE : scale}
                scrollEnabled={!aIsFront && zoomed}
                pointerEvents={!aIsFront && zoomed ? 'auto' : 'none'}
                onLoadComplete={handleLoadComplete}
                onError={aIsFront ? undefined : onError}
                onScaleChanged={aIsFront ? undefined : onScaleChanged}
              />
            ) : null}
            <Animated.View pointerEvents="none" style={[styles.shade, shadeStyleB]} />
          </Animated.View>

          <Animated.View collapsable={false} style={[styles.slot, slotStyleA]}>
            {hasFrame ? (
              <ReaderPdfPage
                source={source}
                page={slotPage.a}
                width={frameSize.width}
                height={frameSize.height}
                scale={aIsFront ? scale : MIN_SCALE}
                scrollEnabled={aIsFront && zoomed}
                pointerEvents={aIsFront && zoomed ? 'auto' : 'none'}
                onLoadComplete={handleLoadComplete}
                onError={aIsFront ? onError : undefined}
                onScaleChanged={aIsFront ? onScaleChanged : undefined}
              />
            ) : null}
            <Animated.View pointerEvents="none" style={[styles.shade, shadeStyleA]} />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
  }),
);

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    zIndex: 0,
    padding: PAGE_INSET,
  },
  pageFrame: {
    flex: 1,
    overflow: 'hidden',
  },
  slot: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    elevation: 0,
  },
  shade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#000000',
  },
});
