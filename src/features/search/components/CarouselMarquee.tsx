import { memo, useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { BookCover, Display, Label, UrduText } from '@/components/ui';
import type { CatalogSlide } from '@/services/catalog';
import { isUrduTitle } from '@/services/script';
import { layout } from '@/theme/palette';

const COVER_WIDTH = 92;
const GAP = 14;
/** One cover plus the gap after it — the stride the loop advances by per book. */
const STRIDE = COVER_WIDTH + GAP;
/** How fast the shelf drifts. Slow enough to read a title as it goes by. */
const PX_PER_SECOND = 22;

/**
 * The home carousel's books as a slow, endless drift across the top of
 * Discover: covers with their titles underneath, in the order the backend sent
 * them, looping back to the first once the last has gone by.
 *
 * The data is the carousel already sitting in `home-feed` — nothing is fetched
 * for this rail. The loop is one native `translateX` on the UI thread over a
 * row that repeats the set enough times to cover the screen and then once
 * more, so the reset from the end of a set to the start of the next is
 * pixel-identical and invisible.
 */
export const CarouselMarquee = memo(function CarouselMarquee({
  slides,
  title = 'From the carousel',
  onPress,
}: {
  slides: CatalogSlide[];
  title?: string;
  onPress?: (slide: CatalogSlide) => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const isFocused = useIsFocused();
  const reduceMotion = useReducedMotion();

  const setWidth = slides.length * STRIDE;

  // Enough copies to fill the viewport, plus one so the row never shows its
  // end while the translate is anywhere between 0 and -setWidth.
  const copies = useMemo(() => {
    if (setWidth === 0) {
      return 0;
    }
    return Math.ceil(screenWidth / setWidth) + 1;
  }, [screenWidth, setWidth]);

  const offset = useSharedValue(0);

  useEffect(() => {
    // Nothing to loop over, off-screen, or the reader asked for stillness: park
    // the row at the start and leave it there.
    if (setWidth === 0 || !isFocused || reduceMotion) {
      cancelAnimation(offset);
      offset.value = 0;
      return;
    }

    offset.value = 0;
    offset.value = withRepeat(
      withTiming(-setWidth, {
        duration: (setWidth / PX_PER_SECOND) * 1000,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => cancelAnimation(offset);
  }, [isFocused, offset, reduceMotion, setWidth]);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  if (slides.length === 0) {
    return null;
  }

  return (
    <View style={styles.root}>
      <Label style={styles.label}>{title}</Label>

      <View style={styles.viewport}>
        <Animated.View style={[styles.row, rowStyle]}>
          {Array.from({ length: copies }, (_, copy) =>
            slides.map(slide => (
              <MarqueeItem key={`${copy}-${slide.id}`} slide={slide} onPress={onPress} />
            )),
          )}
        </Animated.View>
      </View>
    </View>
  );
});

const MarqueeItem = memo(function MarqueeItem({
  slide,
  onPress,
}: {
  slide: CatalogSlide;
  onPress?: (slide: CatalogSlide) => void;
}) {
  const handlePress = useCallback(() => onPress?.(slide), [onPress, slide]);
  const isUrdu = isUrduTitle(slide.title);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={slide.title}
      onPress={handlePress}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
      <BookCover
        width={COVER_WIDTH}
        coverUrl={slide.coverUrl ?? slide.imageUrl}
        coverColor={slide.accent}
      />
      {isUrdu ? (
        <UrduText size={13} leading={1.4} align="center" numberOfLines={2}>
          {slide.title}
        </UrduText>
      ) : (
        <Display size={12.5} leading={1.25} align="center" numberOfLines={2}>
          {slide.title}
        </Display>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: {
    gap: 12,
    // The header sits inside the list's horizontal padding; the rail bleeds
    // through it so covers run off both edges of the screen.
    marginHorizontal: -layout.screenPadding,
  },
  label: {
    paddingHorizontal: layout.screenPadding,
  },
  viewport: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  item: {
    width: COVER_WIDTH,
    marginRight: GAP,
    gap: 7,
  },
  pressed: {
    opacity: 0.8,
  },
});
