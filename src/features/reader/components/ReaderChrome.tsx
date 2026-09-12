import { memo, useEffect, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { Bookmark, ChevronLeft, Settings2 } from 'lucide-react-native';

import { IconButton } from '@/components/ui';
import { LinearGradient, type GradientStop } from '@/components/ui/Gradient';
import { Label, Text } from '@/components/ui/Text';
import { READER_RULE_INSET } from '@/features/reader/constants';
import { useReaderSurface } from '@/features/reader/useReaderSurface';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

const TIMING = {
  duration: 200,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;

const HINT = {
  duration: 400,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;

/** How far the hint floats above the progress rule. */
const HINT_LIFT = 18;

export type ReaderChromeProps = {
  title: string;
  page: number;
  totalPages: number;
  /** Chrome is hidden by default; a tap on the page restores it. */
  visible: boolean;
  onBack: () => void;
  onOpenSettings: () => void;
  onBookmark: () => void;
  saved?: boolean;
  /** A chapter or section label, when the document supplies one. */
  chapterLabel?: string;
  /**
   * The one line of instruction the reader ever gets, and only in the mode
   * that needs it: a folded page is not a control anyone has seen before, and
   * unlike a swipe it does not announce itself by being the obvious thing to
   * try. It leaves for good the first time they touch the page.
   */
  hint?: boolean;
  /**
   * Whether the glass is blurring. Off while the screen is still arriving or
   * the book still loading, when a blur would be sampling the window on every
   * frame for nothing anyone is looking at.
   */
  glass?: boolean;
  children: ReactNode;
};

/**
 * What the top bar's glass is made of.
 *
 * Thinner than the tab bar's: that capsule floats over a scrolling list and
 * needs body, this rises over the page the reader was just reading and
 * needs to be looked through. So the tint is light and the blur does the
 * work, and what makes it read as glass rather than as a dimmed strip is the
 * light on it — a sheen from the screen's edge fading towards the page, and
 * a bright thread along the edge that meets the paper.
 */
const GLASS = {
  light: {
    blur: 32,
    tint: 'rgba(250, 252, 247, 0.30)',
    sheen: [
      { offset: 0, color: '#FFFFFF', opacity: 0.34 },
      { offset: 0.55, color: '#FFFFFF', opacity: 0.08 },
      { offset: 1, color: '#FFFFFF', opacity: 0 },
    ] as GradientStop[],
    edge: 'rgba(16, 26, 18, 0.10)',
    rim: 'rgba(255, 255, 255, 0.78)',
  },
  dark: {
    blur: 28,
    tint: 'rgba(12, 16, 12, 0.38)',
    sheen: [
      { offset: 0, color: '#FFFFFF', opacity: 0.09 },
      { offset: 0.55, color: '#FFFFFF', opacity: 0.025 },
      { offset: 1, color: '#FFFFFF', opacity: 0 },
    ] as GradientStop[],
    edge: 'rgba(241, 245, 238, 0.10)',
    rim: 'rgba(255, 255, 255, 0.13)',
  },
} as const;

/**
 * The top bar's glass: the blur, the tint, the sheen, and along its foot the
 * edge. Fills the bar.
 *
 * The blur is the one part of it that costs anything, and on Android it costs
 * on every frame of anything moving anywhere on screen — it samples the whole
 * window to know what it is blurring. So it is switched off while the screen
 * is still arriving, while the book is still loading, and while the bar is
 * not showing; the tint, the sheen and the edge stand alone in the meantime.
 */
const Glass = memo(function Glass({ blur }: { blur: boolean }) {
  const { colors, isDark } = useTheme();
  const glass = isDark ? GLASS.dark : GLASS.light;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {blur ? (
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType={isDark ? 'dark' : 'light'}
          blurAmount={glass.blur}
          reducedTransparencyFallbackColor={colors.surface}
          {...(Platform.OS === 'android'
            ? {
                overlayColor: 'transparent',
                blurRadius: 25,
                downsampleFactor: 4,
              }
            : null)}
        />
      ) : null}
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: glass.tint }]}
      />
      {/* The light on the glass: strongest at the screen's edge, gone by the page. */}
      <LinearGradient stops={glass.sheen} angle={180} />
      <View
        style={[
          styles.hairline,
          styles.hairlineBottom,
          { backgroundColor: glass.edge },
        ]}
      />
      <View
        style={[
          styles.hairline,
          styles.rimBottom,
          { backgroundColor: glass.rim },
        ]}
      />
    </View>
  );
});

/**
 * The reader's frame.
 *
 * Immersed, only two things survive: a hairline progress rule and one line of
 * typographic status. Everything else appears on a tap and leaves again, so the
 * page is what the reader is looking at.
 */
export const ReaderChrome = memo(function ReaderChrome({
  title,
  page,
  totalPages,
  visible,
  onBack,
  onOpenSettings,
  onBookmark,
  saved = false,
  chapterLabel,
  hint = false,
  glass = true,
  children,
}: ReaderChromeProps) {
  const { colors, isDark } = useTheme();
  const surface = useReaderSurface();
  const insets = useSafeAreaInsets();

  // The bar's blur runs only while the bar can be seen: from the moment it is
  // asked for until its fade out has finished. Hidden, it would be blurring a
  // strip nobody can see on every frame of a turn.
  const [barBlur, setBarBlur] = useState(visible);
  useEffect(() => {
    if (visible) {
      setBarBlur(true);
      return undefined;
    }
    const timer = setTimeout(() => setBarBlur(false), TIMING.duration + 40);
    return () => clearTimeout(timer);
  }, [visible]);

  const progress = totalPages > 0 ? Math.min(1, page / totalPages) : 0;
  const percent = Math.round(progress * 100);

  const shown = useDerivedValue(
    () => withTiming(visible ? 1 : 0, TIMING),
    [visible],
  );

  const barStyle = useAnimatedStyle(() => ({ opacity: shown.value }));
  const topStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (shown.value - 1) * 12 }],
  }));
  const statusStyle = useAnimatedStyle(() => ({ opacity: 1 - shown.value }));

  // Slower out than anything else here. It is the one thing on screen the
  // reader may still be reading as it goes.
  const hinted = useDerivedValue(() => withTiming(hint ? 1 : 0, HINT), [hint]);
  const hintStyle = useAnimatedStyle(() => ({
    opacity: hinted.value * (1 - shown.value),
  }));

  return (
    <View style={[styles.root, { backgroundColor: surface.stage }]}>
      {/*
        The stage owns no touches at all. The document view underneath is the
        only thing that sees them, so every gesture — tap, swipe, pinch, drag —
        reaches the page whole, and a tap is reported exactly once.
      */}
      <View style={styles.stage}>{children}</View>

      {/* Top bar — only reachable while the chrome is showing. Glass, so the
          page it rises over shows through it frosted. */}
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[styles.top, { paddingTop: insets.top + 10 }, topStyle]}
      >
        <Glass blur={glass && barBlur} />
        <IconButton
          icon={ChevronLeft}
          onPress={onBack}
          variant="plain"
          buttonSize={36}
          accessibilityLabel="Close the book"
        />

        <View style={styles.titleBlock}>
          <Text
            size={fontSize.caption}
            leading={1}
            weight="500"
            numberOfLines={1}
          >
            {title}
          </Text>
          {totalPages > 0 ? (
            <Label size={fontSize.labelSmall + 0.5} tracking={0.9}>
              {`P. ${page} OF ${totalPages}`}
            </Label>
          ) : null}
        </View>

        <View style={styles.topActions}>
          <IconButton
            icon={Bookmark}
            onPress={onBookmark}
            variant={saved ? 'ghost' : 'plain'}
            buttonSize={36}
            accessibilityLabel={
              saved ? 'Remove this bookmark' : 'Bookmark this page'
            }
          />
          <IconButton
            icon={Settings2}
            onPress={onOpenSettings}
            variant="plain"
            buttonSize={36}
            accessibilityLabel="Reading settings"
          />
        </View>
      </Animated.View>

      {/* Immersed status line — fades out as the chrome fades in. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.status,
          { bottom: Math.max(insets.bottom, 8) },
          statusStyle,
        ]}
      >
        {totalPages > 0 ? (
          // This line sits on the stage rather than in the chrome, so it takes
          // the stage's own ink rather than the chrome's.
          <Label
            size={fontSize.label}
            tracking={1.1}
            tone="inherit"
            style={{ color: surface.muted }}
          >
            {chapterLabel
              ? `${chapterLabel} · ${percent}%`
              : `PAGE ${page} OF ${totalPages} · ${percent}%`}
          </Label>
        ) : null}
      </Animated.View>

      {/* The hairline rule that never leaves. */}
      <View
        pointerEvents="none"
        style={[
          styles.rule,
          { bottom: Math.max(insets.bottom, 8) + READER_RULE_INSET },
        ]}
      >
        <View
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            backgroundColor: colors.primaryBright,
            opacity: 0.7,
          }}
        />
      </View>

      {/* How to turn a page, once. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.hint,
          {
            bottom:
              Math.max(insets.bottom, 8) + READER_RULE_INSET + 2 + HINT_LIFT,
          },
          hintStyle,
        ]}
      >
        <View
          style={[
            styles.hintPill,
            {
              backgroundColor: isDark
                ? 'rgba(5, 7, 6, 0.55)'
                : 'rgba(231, 234, 227, 0.72)',
            },
          ]}
        >
          <Label
            size={10}
            tracking={1.4}
            tone="inherit"
            style={{
              color: isDark
                ? 'rgba(241, 245, 238, 0.5)'
                : 'rgba(16, 26, 18, 0.55)',
            }}
          >
            DRAG THE PAGE FROM ANYWHERE
          </Label>
        </View>
      </Animated.View>

      {/* A scrim under the chrome, so the dimmed page reads as inactive. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.scrim, { backgroundColor: colors.scrim }, barStyle]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stage: {
    flex: 1,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    // Sits under the bars but over the page.
    zIndex: 1,
  },
  /** The edge of the glass: a hairline, and a thread of light just inside it. */
  hairline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth * 2,
  },
  hairlineBottom: {
    bottom: 0,
  },
  rimBottom: {
    bottom: StyleSheet.hairlineWidth * 2,
  },
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 14,
    overflow: 'hidden',
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  status: {
    position: 'absolute',
    left: 0,
    right: 0,
    // The band between the system's inset and the rule, exactly.
    height: READER_RULE_INSET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rule: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    flexDirection: 'row',
  },
  hint: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
});
