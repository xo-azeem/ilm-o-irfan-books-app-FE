import {
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { BookPdfSource } from '@/constants/books';
import {
  PdfPageCountProbe,
  ReaderPdfPage,
} from '@/features/reader/components/ReaderPdfPage';
import { useThemeStore } from '@/stores/themeStore';
import { readerTones } from '@/theme/palette';
import {
  FLIP_ACTIVE_OFFSET,
  FLIP_COMMIT_RATIO,
  FLIP_COMMIT_VELOCITY,
  FLIP_DURATION_MS,
  FLIP_EDGE_RATIO,
  FLIP_FAIL_OFFSET_Y,
  FLIP_RUBBER_RATIO,
  MAX_SCALE,
  MIN_SCALE,
  PAGE_INSET,
} from '@/features/reader/constants';

export type BookPageFlipHandle = {
  turn: (dir: 1 | -1) => void;
  /** Cuts straight to a page, without the flip animation. */
  goTo: (page: number) => void;
};

type BookPageFlipProps = {
  source: BookPdfSource;
  scale: number;
  onLoadComplete: (totalPages: number) => void;
  onLoadProgress?: (percent: number) => void;
  onError: (message?: string) => void;
  onPageChanged: (page: number, totalPages: number) => void;
  onScaleChanged: (scale: number) => void;
  onApplyScale: (scale: number) => void;
  onResetZoom: () => void;
};

const SLIDE_EASE = Easing.out(Easing.cubic);
const SCALE_EPS = 0.01;
const QUEUE_TURN_MS = 32;

function clampPage(page: number, totalPages: number) {
  if (totalPages <= 0) return Math.max(1, page);
  return Math.min(Math.max(page, 1), totalPages);
}

function neighborPages(current: number, total: number) {
  const pages: number[] = [];
  if (current > 1) pages.push(current - 1);
  pages.push(current);
  if (total <= 0 || current < total) pages.push(current + 1);
  return pages;
}

function rubberband(distance: number, limit: number) {
  'worklet';
  if (limit <= 0) return 0;
  const sign = distance < 0 ? -1 : 1;
  return sign * (1 - 1 / (Math.abs(distance) / limit + 1)) * limit;
}

type FlipSlotProps = {
  page: number;
  source: BookPdfSource;
  width: number;
  height: number;
  fill: string;
  currentPageSV: SharedValue<number>;
  pageWidth: SharedValue<number>;
  dragX: SharedValue<number>;
  liveScale: SharedValue<number>;
  onPainted: (page: number) => void;
  onError: (page: number, message: string) => void;
};

const FlipSlot = memo(function FlipSlot({
  page,
  source,
  width,
  height,
  fill,
  currentPageSV,
  pageWidth,
  dragX,
  liveScale,
  onPainted,
  onError,
}: FlipSlotProps) {
  const style = useAnimatedStyle(() => {
    const offset = (page - currentPageSV.value) * pageWidth.value + dragX.value;
    const scale = page === currentPageSV.value ? liveScale.value : 1;
    return {
      transform: [{ translateX: offset }, { scale }],
    };
  });

  return (
    <Animated.View collapsable={false} pointerEvents="none" style={[styles.slot, { backgroundColor: fill }, style]}>
      <ReaderPdfPage
        source={source}
        page={page}
        width={width}
        height={height}
        fill={fill}
        onLoadComplete={() => onPainted(page)}
        onError={message => onError(page, message)}
      />
    </Animated.View>
  );
});

export const BookPageFlip = memo(
  forwardRef<BookPageFlipHandle, BookPageFlipProps>(function BookPageFlip(
    {
      source,
      scale,
      onLoadComplete,
      onError,
      onPageChanged,
      onApplyScale,
      onResetZoom,
    },
    ref,
  ) {
    // The sheet behind a rendering page matches the reader's chosen tone, so
    // there is no flash of the wrong colour while a page paints.
    const pageTone = useThemeStore(state => state.pageTone);
    const pageFill = readerTones[pageTone].background;

    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pinching, setPinching] = useState(false);
    const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
    const [documentReady, setDocumentReady] = useState(false);
    const [counting, setCounting] = useState(true);
    const [pagesEnabled, setPagesEnabled] = useState(false);

    const dragX = useSharedValue(0);
    const pageWidth = useSharedValue(1);
    const isAnimating = useSharedValue(0);
    const isDragging = useSharedValue(0);
    const currentPageSV = useSharedValue(1);
    const totalPagesSV = useSharedValue(0);
    const liveScale = useSharedValue(scale);
    const pinchStart = useSharedValue(MIN_SCALE);

    const pageRef = useRef(1);
    const totalPagesRef = useRef(0);
    const busyRef = useRef(false);
    const flippingRef = useRef(false);
    const queuedStepsRef = useRef(0);
    const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const queueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const didReportReady = useRef(false);
    const paintedPages = useRef(new Set<number>());
    const lastLayoutWidth = useRef(0);

    const zoomed = scale > MIN_SCALE + SCALE_EPS;
    const canFlip = !zoomed && !pinching && totalPages > 1 && documentReady;
    const hasFrame = frameSize.width > 0 && frameSize.height > 0;
    const pages = useMemo(() => neighborPages(currentPage, totalPages), [currentPage, totalPages]);

    useEffect(() => {
      liveScale.value = scale;
    }, [liveScale, scale]);

    useEffect(() => {
      totalPagesSV.value = totalPages;
    }, [totalPages, totalPagesSV]);

    useEffect(() => {
      return () => {
        if (unlockTimer.current) clearTimeout(unlockTimer.current);
        if (queueTimer.current) clearTimeout(queueTimer.current);
        if (mountTimer.current) clearTimeout(mountTimer.current);
      };
    }, []);

    const clearUnlockTimer = useCallback(() => {
      if (unlockTimer.current) {
        clearTimeout(unlockTimer.current);
        unlockTimer.current = null;
      }
    }, []);

    const animateTurnRef = useRef<(dir: 1 | -1) => void>(() => undefined);

    const finishBusy = useCallback(() => {
      if (!busyRef.current && !flippingRef.current) {
        return;
      }

      const remaining = queuedStepsRef.current;
      queuedStepsRef.current = 0;
      clearUnlockTimer();
      isDragging.value = 0;

      if (remaining !== 0) {
        const dir: 1 | -1 = remaining > 0 ? 1 : -1;
        const target = pageRef.current + dir;
        const total = totalPagesRef.current;
        if (target < 1 || (total > 0 && target > total)) {
          flippingRef.current = false;
          busyRef.current = false;
          isAnimating.value = 0;
          dragX.value = 0;
          return;
        }
        queuedStepsRef.current = remaining - dir;
        if (queueTimer.current) clearTimeout(queueTimer.current);
        queueTimer.current = setTimeout(() => {
          queueTimer.current = null;
          animateTurnRef.current(dir);
        }, QUEUE_TURN_MS);
        return;
      }

      flippingRef.current = false;
      busyRef.current = false;
      isAnimating.value = 0;
      dragX.value = 0;
    }, [clearUnlockTimer, dragX, isAnimating, isDragging]);

    const settleTurn = useCallback(
      (dir: 1 | -1) => {
        const total = totalPagesRef.current;
        const newPage = clampPage(pageRef.current + dir, total);
        pageRef.current = newPage;
        currentPageSV.value = newPage;
        dragX.value = 0;
        isDragging.value = 0;
        liveScale.value = MIN_SCALE;
        setCurrentPage(newPage);
        onPageChanged(newPage, total);
        onResetZoom();
        finishBusy();
      },
      [currentPageSV, dragX, finishBusy, isDragging, liveScale, onPageChanged, onResetZoom],
    );

    const animateTurn = useCallback(
      (dir: 1 | -1) => {
        const page = pageRef.current;
        const total = totalPagesRef.current;
        const target = page + dir;
        if (target < 1 || (total > 0 && target > total)) {
          dragX.value = withTiming(0, { duration: 180, easing: SLIDE_EASE });
          finishBusy();
          return;
        }

        flippingRef.current = true;
        busyRef.current = true;
        isAnimating.value = 1;
        liveScale.value = MIN_SCALE;
        dragX.value = withTiming(
          -dir * pageWidth.value,
          { duration: FLIP_DURATION_MS, easing: SLIDE_EASE },
          finished => {
            if (finished) {
              runOnJS(settleTurn)(dir);
            } else {
              runOnJS(finishBusy)();
            }
          },
        );
      },
      [dragX, finishBusy, isAnimating, liveScale, pageWidth, settleTurn],
    );

    animateTurnRef.current = animateTurn;

    const turnPage = useCallback(
      (dir: 1 | -1) => {
        if (!documentReady) return;
        if (busyRef.current || flippingRef.current || isAnimating.value === 1) {
          queuedStepsRef.current += dir;
          return;
        }

        const target = pageRef.current + dir;
        const total = totalPagesRef.current;
        if (target < 1 || (total > 0 && target > total)) {
          queuedStepsRef.current = 0;
          return;
        }

        busyRef.current = true;
        flippingRef.current = true;
        animateTurn(dir);
      },
      [animateTurn, documentReady, isAnimating],
    );

    /**
     * Jumps straight to a page. Unlike `turn`, this is a cut rather than a
     * flip: animating across two hundred pages would be theatre, and the
     * reader asked to be somewhere specific.
     */
    const goToPage = useCallback(
      (target: number) => {
        if (!documentReady || busyRef.current || flippingRef.current) {
          return;
        }

        const total = totalPagesRef.current;
        const next = clampPage(Math.round(target), total);
        if (next === pageRef.current) {
          return;
        }

        pageRef.current = next;
        currentPageSV.value = next;
        dragX.value = 0;
        isDragging.value = 0;
        liveScale.value = MIN_SCALE;
        setCurrentPage(next);
        onPageChanged(next, total);
        onResetZoom();
      },
      [
        currentPageSV,
        documentReady,
        dragX,
        isDragging,
        liveScale,
        onPageChanged,
        onResetZoom,
      ],
    );

    useImperativeHandle(
      ref,
      () => ({ turn: dir => turnPage(dir), goTo: page => goToPage(page) }),
      [goToPage, turnPage],
    );

    const handleCount = useCallback((numberOfPages: number) => {
      if (!Number.isFinite(numberOfPages) || numberOfPages < 1) return;
      totalPagesRef.current = numberOfPages;
      totalPagesSV.value = numberOfPages;
      setTotalPages(numberOfPages);
      setCounting(false);
      if (mountTimer.current) clearTimeout(mountTimer.current);
      mountTimer.current = setTimeout(() => {
        mountTimer.current = null;
        setPagesEnabled(true);
      }, QUEUE_TURN_MS);
    }, [totalPagesSV]);

    const handlePagePainted = useCallback(
      (page: number) => {
        paintedPages.current.add(page);
        if (didReportReady.current) return;
        const total = totalPagesRef.current;
        if (total < 1 || !paintedPages.current.has(1)) return;
        if (total > 1 && !paintedPages.current.has(2)) return;
        didReportReady.current = true;
        setDocumentReady(true);
        onLoadComplete(total);
        onPageChanged(1, total);
      },
      [onLoadComplete, onPageChanged],
    );

    const handlePageError = useCallback(
      (page: number, message: string) => {
        if (page !== pageRef.current || didReportReady.current) return;
        onError(message);
      },
      [onError],
    );

    const handleEdgeTap = useCallback(
      (x: number) => {
        const width = pageWidth.value;
        const edge = width * FLIP_EDGE_RATIO;
        if (x <= edge) turnPage(-1);
        else if (x >= width - edge) turnPage(1);
      },
      [pageWidth, turnPage],
    );

    const handleDoubleTapZoom = useCallback(() => {
      const next = scale > MIN_SCALE + SCALE_EPS ? MIN_SCALE : 2;
      liveScale.value = next;
      onApplyScale(next);
    }, [liveScale, onApplyScale, scale]);

    const commitPinchScale = useCallback(
      (next: number) => {
        const clamped = Number(Math.min(MAX_SCALE, Math.max(MIN_SCALE, next)).toFixed(2));
        liveScale.value = clamped;
        onApplyScale(clamped);
      },
      [liveScale, onApplyScale],
    );

    const lockPan = useCallback(() => {
      busyRef.current = true;
      flippingRef.current = true;
    }, []);

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
        }
      },
      [dragX, isAnimating, isDragging, pageWidth],
    );

    const pan = Gesture.Pan()
      .enabled(canFlip)
      .maxPointers(1)
      .activeOffsetX([-FLIP_ACTIVE_OFFSET, FLIP_ACTIVE_OFFSET])
      .failOffsetY([-FLIP_FAIL_OFFSET_Y, FLIP_FAIL_OFFSET_Y])
      .onStart(() => {
        'worklet';
        if (isAnimating.value === 1 && isDragging.value === 0) return;
        cancelAnimation(dragX);
        isDragging.value = 1;
        isAnimating.value = 1;
        runOnJS(lockPan)();
      })
      .onUpdate(event => {
        'worklet';
        if (isDragging.value !== 1) return;
        const width = pageWidth.value;
        const translation = event.translationX;
        const page = currentPageSV.value;
        const total = totalPagesSV.value;
        const atFirst = page <= 1 && translation > 0;
        const atLast = total > 0 && page >= total && translation < 0;
        if (atFirst || atLast) {
          dragX.value = rubberband(translation, width * FLIP_RUBBER_RATIO);
          return;
        }
        dragX.value = Math.min(Math.max(translation, -width), width);
      })
      .onEnd(event => {
        'worklet';
        if (isDragging.value !== 1) return;
        isDragging.value = 0;
        const width = pageWidth.value;
        const page = currentPageSV.value;
        const total = totalPagesSV.value;
        const translation = event.translationX;
        const velocity = event.velocityX;
        const dir = (Math.abs(translation) > 8 ? translation < 0 : velocity < 0) ? 1 : -1;
        const atBound =
          (dir === -1 && page <= 1) || (dir === 1 && total > 0 && page >= total);
        const commit =
          !atBound &&
          (Math.abs(translation) > width * FLIP_COMMIT_RATIO ||
            Math.abs(velocity) > FLIP_COMMIT_VELOCITY);

        if (commit) {
          runOnJS(animateTurn)(dir);
          return;
        }

        dragX.value = withTiming(0, { duration: FLIP_DURATION_MS, easing: SLIDE_EASE }, finished => {
          if (finished) runOnJS(finishBusy)();
        });
      })
      .onFinalize(() => {
        'worklet';
        if (isDragging.value === 1) {
          isDragging.value = 0;
          dragX.value = withTiming(0, { duration: FLIP_DURATION_MS, easing: SLIDE_EASE }, finished => {
            if (finished) runOnJS(finishBusy)();
          });
        }
      });

    const pinch = Gesture.Pinch()
      .enabled(documentReady)
      .onStart(() => {
        'worklet';
        pinchStart.value = liveScale.value;
        runOnJS(setPinching)(true);
      })
      .onUpdate(event => {
        'worklet';
        liveScale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStart.value * event.scale));
      })
      .onEnd(() => {
        'worklet';
        runOnJS(commitPinchScale)(liveScale.value);
        runOnJS(setPinching)(false);
      })
      .onFinalize(() => {
        'worklet';
        runOnJS(setPinching)(false);
      });

    const doubleTap = Gesture.Tap()
      .enabled(documentReady)
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

    const composed = Gesture.Simultaneous(pan, pinch, Gesture.Exclusive(doubleTap, edgeTap));

    return (
      <View style={styles.stage}>
        <GestureDetector gesture={composed}>
          <Animated.View
            collapsable={false}
            onLayout={onLayout}
            pointerEvents="auto"
            style={styles.pageFrame}>
            {hasFrame && counting ? (
              <PdfPageCountProbe
                source={source}
                width={frameSize.width}
                height={frameSize.height}
                onCount={handleCount}
                onError={onError}
              />
            ) : null}
            {hasFrame && !counting && pagesEnabled
              ? pages.map(page => (
                  <FlipSlot
                    key={page}
                    page={page}
                    source={source}
                    width={frameSize.width}
                    height={frameSize.height}
                    fill={pageFill}
                    currentPageSV={currentPageSV}
                    pageWidth={pageWidth}
                    dragX={dragX}
                    liveScale={liveScale}
                    onPainted={handlePagePainted}
                    onError={handlePageError}
                  />
                ))
              : null}
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
    overflow: 'hidden',
  },
});
