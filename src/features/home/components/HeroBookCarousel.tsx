import {
  Platform,
  Pressable,
  Text,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { memo, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useIsFocused } from '@react-navigation/native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  runOnUI,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { BookOpen, Bookmark, ChevronRight, Star, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeContext';
import { fonts, palette, theme, typography } from '@/theme/palette';
import type { HeroCarouselBook } from '@/features/explore/data/exploreContent';

type AppColors = (typeof theme)['light'] | (typeof theme)['dark'];

const COVER_W_RATIO = 0.46;
const COVER_ASPECT = 1.48;
const PANEL_HEIGHT = 206;
const PANEL_OVERLAP = 32;
const COVER_PANEL_GAP = 8;
const STAGE_HEADER_SPACE = 72;
const AUTO_SCROLL_INTERVAL_MS = 4000;
const AUTO_SCROLL_DURATION_MS = 800;
const AUTO_SCROLL_EASING = Easing.bezier(0.4, 0, 0.2, 1);

const scheduleAutoScrollRef: { current: () => void } = { current: () => {} };

function onAutoScrollTimingComplete() {
  scheduleAutoScrollRef.current();
}

function parseHex(hex: string) {
  if (!hex?.startsWith('#')) {
    return null;
  }

  const value = Number.parseInt(hex.slice(1), 16);
  if (Number.isNaN(value)) {
    return null;
  }

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function blendHex(base: string, r: number, g: number, b: number, alpha: number) {
  const baseRgb = parseHex(base);
  if (!baseRgb) {
    return base;
  }

  const inv = 1 - alpha;
  return `rgb(${Math.round(r * alpha + baseRgb.r * inv)},${Math.round(g * alpha + baseRgb.g * inv)},${Math.round(b * alpha + baseRgb.b * inv)})`;
}

/** Single uniform opaque fill — no top sheen or two-tone gradient. */
function panelOpaqueFill(coverColor: string, isDark: boolean) {
  return isDark
    ? blendHex(coverColor, 18, 26, 20, 0.88)
    : blendHex(coverColor, 255, 255, 255, 0.82);
}

function darkenFill(fill: string, amount: number) {
  const match = fill.match(/rgb\((\d+),(\d+),(\d+)\)/);
  if (!match) {
    return fill;
  }

  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  const inv = 1 - amount;

  return `rgb(${Math.round(r * inv)},${Math.round(g * inv)},${Math.round(b * inv)})`;
}

function glassRim(isDark: boolean) {
  return isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.85)';
}

const GlassPanel = memo(function GlassPanel({
  panelFill,
  isDark,
  height,
  children,
}: {
  panelFill: string;
  isDark: boolean;
  height: number;
  children: ReactNode;
}) {
  return (
    <View
      style={[
        styles.panel,
        { height, borderTopColor: glassRim(isDark), backgroundColor: panelFill },
      ]}>
      <View style={styles.panelContent}>{children}</View>
    </View>
  );
});

function ReadNowButton({
  colors,
  panelFill,
  coverColor,
  isDark,
  onPress,
}: {
  colors: AppColors;
  panelFill: string;
  coverColor: string;
  isDark: boolean;
  onPress?: () => void;
}) {
  const buttonFill = darkenFill(panelFill, isDark ? 0.14 : 0.08);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.readBtnWrap,
        { opacity: pressed ? 0.88 : 1 },
      ]}>
      <View
        style={[
          styles.readBtn,
          {
            backgroundColor: buttonFill,
            borderColor: coverColor,
          },
        ]}>
        <Text style={[styles.readBtnLabel, { color: colors.ink }]}>Read now</Text>
        <ChevronRight color={colors.ink} size={16} strokeWidth={2} />
      </View>
    </Pressable>
  );
}

function SaveBookButton({
  colors,
  isDark,
  onPress,
}: {
  colors: AppColors;
  isDark: boolean;
  onPress?: () => void;
}) {
  const bg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.50)';
  const border = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(20,40,24,0.10)';

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Save book"
      style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
      <View style={[styles.saveBtn, { backgroundColor: bg, borderColor: border }]}>
        <Bookmark color={colors.ink} size={18} strokeWidth={1.5} />
      </View>
    </Pressable>
  );
}

type BookDescriptionProps = {
  book: HeroCarouselBook;
  colors: AppColors;
  isDark: boolean;
  panelFill: string;
  coverColor: string;
  onPress?: () => void;
};

const BookDescription = memo(function BookDescription({
  book,
  colors,
  isDark,
  panelFill,
  coverColor,
  onPress,
}: BookDescriptionProps) {
  return (
    <View style={styles.descRoot}>
      <View style={styles.descBody}>
        <Text style={[styles.genreLabel, { color: colors.primary }]}>
          {book.genre.toUpperCase()}
        </Text>

        <Text style={[styles.panelTitle, { color: colors.ink }]} numberOfLines={2}>
          {book.title}
        </Text>

        <View style={styles.authorMetaRow}>
          <Text style={[styles.panelAuthor, { color: colors.muted }]} numberOfLines={1}>
            {book.author}
          </Text>
          <View style={styles.metaInline}>
            {book.rating != null ? (
              <>
                <Star
                  size={11}
                  color={palette.sunflower}
                  fill={palette.sunflower}
                  strokeWidth={0}
                />
                <Text style={[styles.metaText, { color: colors.muted }]}>
                  {book.rating.toFixed(1)}
                </Text>
                <Text style={[styles.metaSep, { color: colors.faint }]}>·</Text>
              </>
            ) : null}
            <Text style={[styles.metaText, { color: colors.faint }]}>{book.readTime}</Text>
          </View>
        </View>

        <Text style={[styles.panelDesc, { color: colors.faint }]} numberOfLines={2}>
          {book.description}
        </Text>
      </View>

      <View style={styles.actions}>
        <ReadNowButton
          colors={colors}
          panelFill={panelFill}
          coverColor={coverColor}
          isDark={isDark}
          onPress={onPress}
        />
        <SaveBookButton colors={colors} isDark={isDark} onPress={onPress} />
      </View>
    </View>
  );
});

const CarouselHeader = memo(function CarouselHeader({
  colors,
  isDark,
  onProfilePress,
}: {
  colors: AppColors;
  isDark: boolean;
  onProfilePress?: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.headerBrand}>
        <View style={[styles.headerLogo, { backgroundColor: colors.primary }]}>
          <BookOpen color={colors.onPrimary} size={19} strokeWidth={1.8} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.ink }]}>
            Ilm o Irfan
          </Text>
          <Text style={[styles.headerSub, { color: colors.primary }]}>
            bookstore
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        onPress={onProfilePress}
        style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}>
        <View
          style={[
            styles.profileBtn,
            {
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.10)'
                : 'rgba(255,255,255,0.55)',
              borderColor: isDark
                ? 'rgba(255,255,255,0.18)'
                : 'rgba(20,40,24,0.10)',
            },
          ]}>
          <UserRound color={colors.muted} size={20} strokeWidth={1.5} />
        </View>
      </Pressable>
    </View>
  );
});

const BookCover = memo(function BookCover({
  book,
  coverColor,
  width,
  height,
}: {
  book: HeroCarouselBook;
  coverColor: string;
  width: number;
  height: number;
}) {
  return (
    <View style={[styles.cover, { width, height, backgroundColor: coverColor }]}>
      <View style={styles.coverSpine} />
      <View style={styles.coverGloss} />
      {book.tag ? (
        <View style={styles.coverTag}>
          <Text style={styles.coverTagLabel}>{book.tag}</Text>
        </View>
      ) : null}
      <View style={styles.coverFooter}>
        <Text style={styles.coverTitle} numberOfLines={3}>
          {book.title}
        </Text>
      </View>
    </View>
  );
});

type CarouselPageProps = {
  book: HeroCarouselBook;
  index: number;
  scrollX: SharedValue<number>;
  screenWidth: number;
  panelHeight: number;
  coverWidth: number;
  coverHeight: number;
  colors: AppColors;
  coverColor: string;
  isDark: boolean;
  stageHeight: number;
  onBookPress?: (book: HeroCarouselBook) => void;
};

const CarouselPage = memo(function CarouselPage({
  book,
  index,
  scrollX,
  screenWidth,
  panelHeight,
  coverWidth,
  coverHeight,
  colors,
  coverColor,
  isDark,
  stageHeight,
  onBookPress,
}: CarouselPageProps) {
  const panelFill = panelOpaqueFill(coverColor, isDark);
  const pageHeight = stageHeight + panelHeight - PANEL_OVERLAP;
  const layoutWidth = Math.max(screenWidth, 1);

  const handlePress = useCallback(() => {
    onBookPress?.(book);
  }, [book, onBookPress]);

  const inputRange = [
    (index - 1) * layoutWidth,
    index * layoutWidth,
    (index + 1) * layoutWidth,
  ];

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, inputRange, [0, 0.42, 0], Extrapolation.CLAMP),
  }));

  const coverStyle = useAnimatedStyle(() => {
    const active = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    return {
      transform: [
        { scale: interpolate(active, [0, 1], [0.88, 1], Extrapolation.CLAMP) },
        { translateY: interpolate(active, [0, 1], [10, 0], Extrapolation.CLAMP) },
      ],
      opacity: interpolate(active, [0, 1], [0.4, 1], Extrapolation.CLAMP),
    };
  });

  return (
    <View style={{ width: layoutWidth, height: pageHeight }}>
      <View style={[styles.stagePage, { height: stageHeight }]}>
        <Animated.View
          style={[
            styles.stageGlow,
            { backgroundColor: coverColor },
            glowStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.coverWrap,
            coverStyle,
            { paddingBottom: COVER_PANEL_GAP },
          ]}>
          <BookCover
            book={book}
            coverColor={coverColor}
            width={coverWidth}
            height={coverHeight}
          />
        </Animated.View>
      </View>

      <GlassPanel
        panelFill={panelFill}
        isDark={isDark}
        height={panelHeight}>
        <BookDescription
          book={book}
          colors={colors}
          isDark={isDark}
          panelFill={panelFill}
          coverColor={coverColor}
          onPress={handlePress}
        />
      </GlassPanel>
    </View>
  );
});

const CarouselDot = memo(function CarouselDot({
  index,
  scrollX,
  screenWidth,
  activeColor,
}: {
  index: number;
  scrollX: SharedValue<number>;
  screenWidth: number;
  activeColor: string;
}) {
  const inputRange = [
    (index - 1) * screenWidth,
    index * screenWidth,
    (index + 1) * screenWidth,
  ];

  const dotStyle = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, inputRange, [6, 20, 6], Extrapolation.CLAMP),
    opacity: interpolate(scrollX.value, inputRange, [0.35, 1, 0.35], Extrapolation.CLAMP),
    backgroundColor: activeColor,
  }));

  return <Animated.View style={[styles.dot, dotStyle]} />;
});

type HeroBookCarouselProps = {
  books?: HeroCarouselBook[];
  onBookPress?: (book: HeroCarouselBook) => void;
  onProfilePress?: () => void;
};

export const HeroBookCarousel = memo(function HeroBookCarousel({
  books = [],
  onBookPress,
  onProfilePress,
}: HeroBookCarouselProps) {
  const { isDark, colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const layoutWidth = Math.max(windowWidth, 1);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(0);
  const isAutoScrolling = useSharedValue(false);
  const activeIndexRef = useRef(0);
  const isUserInteractingRef = useRef(false);
  const autoScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFocusedRef = useRef(isFocused);
  const screenWidthRef = useRef(layoutWidth);
  const booksLengthRef = useRef(books.length);

  isFocusedRef.current = isFocused;
  screenWidthRef.current = layoutWidth;
  booksLengthRef.current = books.length;

  const coverWidth = Math.round(layoutWidth * COVER_W_RATIO);
  const coverHeight = Math.round(coverWidth * COVER_ASPECT);
  const stageHeight = coverHeight + insets.top + STAGE_HEADER_SPACE;
  const pageHeight = stageHeight + PANEL_HEIGHT - PANEL_OVERLAP;
  const totalHeight = pageHeight;

  const clearAutoScrollTimer = useCallback(() => {
    if (autoScrollTimerRef.current) {
      clearTimeout(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
  }, []);

  const scheduleAutoScroll = useCallback(() => {
    clearAutoScrollTimer();

    if (booksLengthRef.current <= 1 || !isFocusedRef.current || isUserInteractingRef.current) {
      return;
    }

    autoScrollTimerRef.current = setTimeout(() => {
      if (isUserInteractingRef.current || !isFocusedRef.current) {
        return;
      }

      const nextIndex = (activeIndexRef.current + 1) % booksLengthRef.current;
      activeIndexRef.current = nextIndex;
      const width = screenWidthRef.current;
      if (width <= 0) {
        return;
      }

      const offsetX = nextIndex * width;
      if (!Number.isFinite(offsetX)) {
        return;
      }

      runOnUI((x: number) => {
        'worklet';
        isAutoScrolling.value = true;
        scrollX.value = withTiming(
          x,
          {
            duration: AUTO_SCROLL_DURATION_MS,
            easing: AUTO_SCROLL_EASING,
          },
          finished => {
            if (finished) {
              isAutoScrolling.value = false;
              runOnJS(onAutoScrollTimingComplete)();
            }
          },
        );
      })(offsetX);
    }, AUTO_SCROLL_INTERVAL_MS);
  }, [clearAutoScrollTimer, isAutoScrolling, scrollX]);

  scheduleAutoScrollRef.current = scheduleAutoScroll;

  useAnimatedReaction(
    () => scrollX.value,
    (offset, previous) => {
      if (isAutoScrolling.value && offset !== previous) {
        scrollTo(scrollRef, offset, 0, false);
      }
    },
  );

  useEffect(() => {
    if (isFocused) {
      scheduleAutoScroll();
    } else {
      clearAutoScrollTimer();
    }

    return clearAutoScrollTimer;
  }, [clearAutoScrollTimer, isFocused, scheduleAutoScroll, books.length]);

  const handleScrollBeginDrag = useCallback(() => {
    isUserInteractingRef.current = true;
    clearAutoScrollTimer();
    runOnUI(() => {
      'worklet';
      cancelAnimation(scrollX);
      isAutoScrolling.value = false;
    })();
  }, [clearAutoScrollTimer, isAutoScrolling, scrollX]);

  const handleScrollSettled = useCallback(
    (offsetX: number) => {
      const width = screenWidthRef.current;
      if (width <= 0 || booksLengthRef.current === 0) {
        return;
      }

      const settledIndex = Math.min(
        Math.max(Math.round(offsetX / width), 0),
        booksLengthRef.current - 1,
      );
      activeIndexRef.current = settledIndex;

      if (isUserInteractingRef.current) {
        isUserInteractingRef.current = false;
        scheduleAutoScroll();
      }
    },
    [scheduleAutoScroll],
  );

  const onScroll = useAnimatedScrollHandler(event => {
    if (!isAutoScrolling.value) {
      scrollX.value = event.contentOffset.x;
    }
  });

  if (books.length === 0) {
    return (
      <View style={{ backgroundColor: colors.background }}>
        <CarouselHeader colors={colors} isDark={isDark} onProfilePress={onProfilePress} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.headerWrap}>
        <CarouselHeader colors={colors} isDark={isDark} onProfilePress={onProfilePress} />
      </View>

      <View style={[styles.carouselBody, { height: totalHeight }]}>
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          decelerationRate="fast"
          onScroll={onScroll}
          onScrollBeginDrag={handleScrollBeginDrag}
          onMomentumScrollEnd={event =>
            handleScrollSettled(event.nativeEvent.contentOffset.x)
          }
          onScrollEndDrag={event => {
            if (event.nativeEvent.velocity?.x === 0) {
              handleScrollSettled(event.nativeEvent.contentOffset.x);
            }
          }}
          style={StyleSheet.absoluteFill}
          contentContainerStyle={{ width: layoutWidth * books.length }}>
          {books.map((book, index) => (
            <CarouselPage
              key={book.id}
              book={book}
              index={index}
              scrollX={scrollX}
              screenWidth={layoutWidth}
              panelHeight={PANEL_HEIGHT}
              coverWidth={coverWidth}
              coverHeight={coverHeight}
              colors={colors}
              coverColor={isDark ? book.coverColorDark : book.coverColor}
              isDark={isDark}
              stageHeight={stageHeight}
              onBookPress={onBookPress}
            />
          ))}
        </Animated.ScrollView>
      </View>

      <View style={styles.dotsWrap}>
        {books.map((book, index) => (
          <CarouselDot
            key={book.id}
            index={index}
            scrollX={scrollX}
            screenWidth={layoutWidth}
            activeColor={colors.primary}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  headerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: 'transparent',
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    gap: 1,
  },
  headerTitle: {
    fontFamily: fonts.sans,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: typography.snug,
    lineHeight: 21,
  },
  headerSub: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: typography.wide,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  carouselBody: {
    position: 'relative',
    overflow: 'hidden',
  },
  stagePage: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  stageGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  coverWrap: {
    zIndex: 1,
  },
  dotsWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    paddingBottom: 4,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
  cover: {
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 11,
    ...Platform.select({
      ios: {
        shadowColor: '#1C2B22',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.28,
        shadowRadius: 18,
      },
      android: { elevation: 12 },
    }),
  },
  coverSpine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  coverGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  coverTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  coverTagLabel: {
    fontFamily: fonts.sans,
    fontSize: 8,
    fontWeight: '700',
    color: palette.green,
    letterSpacing: 0.5,
  },
  coverFooter: {
    justifyContent: 'flex-end',
  },
  coverTitle: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    letterSpacing: typography.snug,
    color: '#FFFFFF',
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 0,
    flexDirection: 'column',
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#142818',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      },
      android: { elevation: 8 },
    }),
  },
  panelContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  descRoot: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'space-between',
  },
  descBody: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
  },
  authorMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 5,
    marginBottom: 8,
  },
  genreLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: typography.label,
    marginBottom: 4,
  },
  panelTitle: {
    fontFamily: fonts.sans,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: typography.tight,
  },
  panelAuthor: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: typography.normal,
  },
  panelDesc: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: typography.snug,
  },
  metaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  metaText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '500',
  },
  metaSep: {
    fontFamily: fonts.sans,
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    flexShrink: 0,
  },
  readBtnWrap: {
    flexShrink: 1,
  },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  readBtnLabel: {
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: typography.wide,
  },
  saveBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
