import {
  Platform,
  Pressable,
  Text,
  StyleSheet,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import type { ReactNode } from 'react';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { BookOpen, Bookmark, ChevronRight, Star, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { fonts, palette, theme } from '@/theme/palette';
import type { HeroCarouselBook } from '@/features/explore/data/exploreContent';

type AppColors = (typeof theme)['light'] | (typeof theme)['dark'];

const COVER_W_RATIO = 0.46;
const COVER_ASPECT = 1.48;
const PANEL_RADIUS = 28;
const PANEL_OVERLAP = 32;

function panelFrost(isDark: boolean) {
  return isDark ? 'rgba(18, 26, 20, 0.78)' : 'rgba(255, 255, 255, 0.72)';
}

function panelSheen(isDark: boolean) {
  return isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.55)';
}

function glassRim(isDark: boolean) {
  return isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.85)';
}

function GlassPanel({
  panelId,
  coverColor,
  isDark,
  height,
  children,
}: {
  panelId: string;
  coverColor: string;
  isDark: boolean;
  height: number;
  children: ReactNode;
}) {
  const gradientId = `glass-${panelId}`;

  return (
    <View style={[styles.panel, { height, borderTopColor: glassRim(isDark) }]}>
      {/* background layers — rendered first so content sits on top */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: coverColor, opacity: isDark ? 0.38 : 0.28 },
        ]}
      />
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: panelFrost(isDark) }]}
      />
      <Svg
        style={[StyleSheet.absoluteFill, { zIndex: 0 }]}
        preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={isDark ? 0.16 : 0.38} />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={isDark ? 0.03 : 0.08} />
            <Stop
              offset="1"
              stopColor={isDark ? '#000000' : '#142818'}
              stopOpacity={isDark ? 0.18 : 0.04}
            />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
      <View style={[styles.panelSheen, { backgroundColor: panelSheen(isDark) }]} />

      <View style={styles.panelContent}>{children}</View>
    </View>
  );
}

function ReadNowButton({
  colors,
  onPress,
}: {
  colors: AppColors;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.readBtnWrap,
        { opacity: pressed ? 0.88 : 1 },
      ]}>
      <View style={[styles.readBtn, { backgroundColor: colors.primary }]}>
        <Text style={[styles.readBtnLabel, { color: colors.onPrimary }]}>Read now</Text>
        <ChevronRight color={colors.onPrimary} size={16} strokeWidth={2} />
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
  onPress?: () => void;
};

function BookDescription({
  book,
  colors,
  isDark,
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
        <ReadNowButton colors={colors} onPress={onPress} />
        <SaveBookButton colors={colors} isDark={isDark} onPress={onPress} />
      </View>
    </View>
  );
}

function CarouselHeader({
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
}

function BookCover({
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
}

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
  pageHeight: number;
  onPress?: () => void;
};

function CarouselPage({
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
  pageHeight,
  onPress,
}: CarouselPageProps) {
  const inputRange = [
    (index - 1) * screenWidth,
    index * screenWidth,
    (index + 1) * screenWidth,
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
    <View style={{ width: screenWidth, height: pageHeight }}>
      <View style={[styles.stagePage, { height: pageHeight }]}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: coverColor }, glowStyle]}
        />
        <Animated.View
          style={[
            coverStyle,
            { paddingBottom: panelHeight - PANEL_OVERLAP + 8 },
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
        panelId={book.id}
        coverColor={coverColor}
        isDark={isDark}
        height={panelHeight}>
        <BookDescription
          book={book}
          colors={colors}
          isDark={isDark}
          onPress={onPress}
        />
      </GlassPanel>
    </View>
  );
}

function CarouselDot({
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
}

type HeroBookCarouselProps = {
  books?: HeroCarouselBook[];
  onBookPress?: (book: HeroCarouselBook) => void;
  onProfilePress?: () => void;
};

export function HeroBookCarousel({
  books = [],
  onBookPress,
  onProfilePress,
}: HeroBookCarouselProps) {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? theme.dark : theme.light;
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const scrollX = useSharedValue(0);

  const coverWidth = Math.round(screenWidth * COVER_W_RATIO);
  const coverHeight = Math.round(coverWidth * COVER_ASPECT);
  const stageHeight = coverHeight + insets.top + 72;
  const panelHeight = 206;
  const pageHeight = stageHeight + panelHeight - PANEL_OVERLAP;
  const totalHeight = pageHeight;

  const onScroll = useAnimatedScrollHandler(event => {
    scrollX.value = event.contentOffset.x;
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
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          decelerationRate="fast"
          onScroll={onScroll}
          style={StyleSheet.absoluteFill}
          contentContainerStyle={{ width: screenWidth * books.length }}>
          {books.map((book, index) => (
            <CarouselPage
              key={book.id}
              book={book}
              index={index}
              scrollX={scrollX}
              screenWidth={screenWidth}
              panelHeight={panelHeight}
              coverWidth={coverWidth}
              coverHeight={coverHeight}
              colors={colors}
              coverColor={isDark ? book.coverColorDark : book.coverColor}
              isDark={isDark}
              pageHeight={pageHeight}
              onPress={() => onBookPress?.(book)}
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
            screenWidth={screenWidth}
            activeColor={colors.primary}
          />
        ))}
      </View>
    </View>
  );
}

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
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 21,
  },
  headerSub: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
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
    fontFamily: fonts.display,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    color: '#FFFFFF',
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 2,
    flexDirection: 'column',
    borderTopLeftRadius: PANEL_RADIUS,
    borderTopRightRadius: PANEL_RADIUS,
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
  panelSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    borderTopLeftRadius: PANEL_RADIUS,
    borderTopRightRadius: PANEL_RADIUS,
  },
  panelContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  descRoot: {
    flex: 1,
    justifyContent: 'space-between',
  },
  descBody: {
    flex: 1,
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
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  panelTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  panelAuthor: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '500',
  },
  panelDesc: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
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
    gap: 8,
    paddingTop: 4,
  },
  readBtnWrap: {
    flex: 1,
  },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 18,
  },
  readBtnLabel: {
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
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
