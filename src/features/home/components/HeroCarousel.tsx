import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnUI,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import {
  HeroSlideCard,
  type HeroSlide,
} from '@/features/home/components/HeroSlideCard';
import { layout } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

/** How long a hero rests before the carousel moves on. */
const AUTO_ADVANCE_MS = 5000;

/**
 * The carousel at the top of Home.
 *
 * One page per slide, in the order the backend sent them — the admin owns what
 * is here and where it sits, and this component adds nothing to the list, drops
 * nothing from it and reorders nothing. An empty list draws no rail at all.
 *
 * Movement is native: `scrollTo` on the UI thread drives the platform's own
 * smooth scroll, and the scroll offset feeds the per-page transforms. Nothing
 * about the animation crosses to JS while it runs.
 */
export const HeroCarousel = memo(function HeroCarousel({
  slides,
  onRead,
  onPress,
  autoAdvance = true,
}: {
  slides: HeroSlide[];
  onRead?: (slide: HeroSlide) => void;
  onPress?: (slide: HeroSlide) => void;
  /** Off for reduced motion, or when the reader is mid-decision. */
  autoAdvance?: boolean;
}) {
  const { width } = useWindowDimensions();
  const isFocused = useIsFocused();

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(0);

  const [index, setIndex] = useState(0);

  // Mirrors of state the auto-advance timer needs. Reading them from a ref
  // keeps the timer effect from resubscribing on every scroll.
  const indexRef = useRef(0);
  const draggingRef = useRef(false);

  const pageWidth = Math.max(width, 1);
  const count = slides.length;

  const onScroll = useAnimatedScrollHandler(event => {
    scrollX.value = event.contentOffset.x;
  });

  const goTo = useCallback(
    (next: number) => {
      indexRef.current = next;
      setIndex(next);
      const x = next * pageWidth;
      runOnUI(() => {
        'worklet';
        scrollTo(scrollRef, x, 0, true);
      })();
    },
    [pageWidth, scrollRef],
  );

  // A single self-rescheduling timer. It is torn down whenever the carousel
  // leaves the screen, so a backgrounded Home is not animating anything.
  useEffect(() => {
    if (!autoAdvance || !isFocused || count <= 1) {
      return;
    }

    const timer = setInterval(() => {
      if (draggingRef.current) {
        return;
      }
      goTo((indexRef.current + 1) % count);
    }, AUTO_ADVANCE_MS);

    return () => clearInterval(timer);
  }, [autoAdvance, count, goTo, isFocused]);

  const handleDragBegin = useCallback(() => {
    draggingRef.current = true;
  }, []);

  const handleSettled = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const settled = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
      const clamped = Math.min(Math.max(settled, 0), Math.max(count - 1, 0));
      indexRef.current = clamped;
      setIndex(clamped);
      draggingRef.current = false;
    },
    [count, pageWidth],
  );

  // No slides means the backend had nothing to send — no published books, or
  // its carousel read failed. It already covers "admin curated nothing" with a
  // weekly draw, so nothing stands in for an empty list here.
  if (count === 0) {
    return null;
  }

  // A lone slide is not a carousel — no paging, no dots, no timer.
  if (count === 1) {
    return (
      <HeroSlideCard slide={slides[0]} onRead={onRead} onPress={onPress} />
    );
  }

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={handleDragBegin}
        onMomentumScrollEnd={handleSettled}
        style={{ marginHorizontal: -layout.screenPadding }}
      >
        {slides.map((slide, pageIndex) => (
          <HeroPage
            key={slide.id}
            slide={slide}
            index={pageIndex}
            scrollX={scrollX}
            pageWidth={pageWidth}
            onRead={onRead}
            onPress={onPress}
          />
        ))}
      </Animated.ScrollView>

      <View
        style={styles.dots}
        accessibilityRole="tablist"
        accessibilityLabel={`Featured ${index + 1} of ${count}`}
      >
        {slides.map((slide, dotIndex) => (
          <Dot
            key={slide.id}
            index={dotIndex}
            scrollX={scrollX}
            pageWidth={pageWidth}
          />
        ))}
      </View>
    </View>
  );
});

/**
 * One page. The card behind and ahead of the current one sits back slightly and
 * dims, so a swipe reads as a deck being turned rather than a filmstrip.
 */
const HeroPage = memo(function HeroPage({
  slide,
  index,
  scrollX,
  pageWidth,
  onRead,
  onPress,
}: {
  slide: HeroSlide;
  index: number;
  scrollX: SharedValue<number>;
  pageWidth: number;
  onRead?: (slide: HeroSlide) => void;
  onPress?: (slide: HeroSlide) => void;
}) {
  const range = [
    (index - 1) * pageWidth,
    index * pageWidth,
    (index + 1) * pageWidth,
  ];

  const cardStyle = useAnimatedStyle(() => {
    const active = interpolate(
      scrollX.value,
      range,
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    return {
      opacity: interpolate(active, [0, 1], [0.45, 1], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(active, [0, 1], [0.92, 1], Extrapolation.CLAMP) },
        {
          translateY: interpolate(active, [0, 1], [10, 0], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <View
      style={[
        styles.page,
        { width: pageWidth, paddingHorizontal: layout.screenPadding },
      ]}
    >
      <Animated.View style={cardStyle}>
        <HeroSlideCard slide={slide} onRead={onRead} onPress={onPress} />
      </Animated.View>
    </View>
  );
});

/** The active dot stretches into a bar rather than growing, keeping the row calm. */
const Dot = memo(function Dot({
  index,
  scrollX,
  pageWidth,
}: {
  index: number;
  scrollX: SharedValue<number>;
  pageWidth: number;
}) {
  const { colors } = useTheme();
  const range = [
    (index - 1) * pageWidth,
    index * pageWidth,
    (index + 1) * pageWidth,
  ];

  const dotStyle = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, range, [6, 20, 6], Extrapolation.CLAMP),
    opacity: interpolate(
      scrollX.value,
      range,
      [0.32, 1, 0.32],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: colors.primarySoft }, dotStyle]}
    />
  );
});

const styles = StyleSheet.create({
  root: {
    gap: 8,
  },
  page: {
    // Bottom margin for the card, and the room its shadow needs so the
    // horizontal ScrollView does not clip it.
    paddingBottom: 18,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
});
