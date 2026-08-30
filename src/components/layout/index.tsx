import { memo, type PropsWithChildren, type ReactNode } from 'react';
import {
  Platform,
  StatusBar,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

import { IconButton } from '@/components/ui/Button';
import { Display, Text } from '@/components/ui/Text';
import { useAppInsets } from '@/hooks/useAppInsets';
import { layout } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/** The board's top padding, measured from the top of the device frame. */
const DESIGN_TOP_INSET = 52;

export type ScreenProps = PropsWithChildren<{
  scrollable?: boolean;
  /** Horizontal page padding. Admin screens run denser than the reader app. */
  padding?: number;
  /** Vertical rhythm between direct children. */
  gap?: number;
  /** Painted behind the content — a header wash or a blurred cover. */
  backdrop?: ReactNode;
  /** Pinned above the tab bar, e.g. an admin FAB or a sticky save bar. */
  overlay?: ReactNode;
  /** Suppresses the top safe-area inset for screens that bleed to the notch. */
  edgeToEdge?: boolean;
  /**
   * A compact bar that fades in once the page has scrolled past its opening
   * section — Home's `Discovery · Personalised` rule. Ignored when the screen
   * is not scrollable.
   */
  stickyHeader?: ReactNode;
  /** Scroll distance over which the sticky bar reaches full opacity. */
  stickyHeaderOffset?: number;
  contentStyle?: StyleProp<ViewStyle>;
  scrollViewProps?: Omit<ScrollViewProps, 'children' | 'contentContainerStyle'>;
}>;

/**
 * The page shell. Owns the background, the safe-area top inset and the bottom
 * clearance for the floating tab bar, so no screen has to work any of that out
 * for itself.
 */
export const Screen = memo(function Screen({
  children,
  scrollable = true,
  padding = layout.screenPadding,
  gap,
  backdrop,
  overlay,
  edgeToEdge = false,
  stickyHeader,
  stickyHeaderOffset = 180,
  contentStyle,
  scrollViewProps,
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { scrollEndPadding, contentBottomInset } = useAppInsets();

  // The board places content 52px down a 390×844 frame. Two things can put a
  // control under the clock instead: Android's status bar is far shorter than
  // an iPhone's, so `inset + 8` lands at ~32px there; and an inset of 0 is a
  // real state on Android before the window reports its decorations. Take the
  // larger of the measured inset and the platform's own status-bar height, then
  // hold the design's 52px as a floor.
  const measuredTop = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );
  const paddingTop = edgeToEdge ? 0 : Math.max(measuredTop + 8, DESIGN_TOP_INSET);

  const scrollY = useSharedValue(0);

  // The handler only runs on the UI thread, and only when a screen has asked
  // for a sticky bar — an ordinary page never pays for it.
  const onScroll = useAnimatedScrollHandler(event => {
    scrollY.value = event.contentOffset.y;
  });

  const inner = (
    <View
      style={[
        { paddingHorizontal: padding, gap },
        // A static page's children can only fill the screen if the wrapper does.
        !scrollable && styles.grow,
        contentStyle,
      ]}>
      {children}
    </View>
  );

  const showSticky = scrollable && stickyHeader != null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {backdrop}

      {scrollable ? (
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{ paddingTop, paddingBottom: scrollEndPadding }}
          {...scrollViewProps}
          onScroll={showSticky ? onScroll : undefined}
          scrollEventThrottle={16}>
          {inner}
        </Animated.ScrollView>
      ) : (
        <View style={[styles.static, { paddingTop, paddingBottom: contentBottomInset }]}>
          {inner}
        </View>
      )}

      {showSticky ? (
        <StickyBar scrollY={scrollY} offset={stickyHeaderOffset} padding={padding}>
          {stickyHeader}
        </StickyBar>
      ) : null}

      {overlay}
    </View>
  );
});

/**
 * The overlay rule that appears once the reader has scrolled past the opening
 * section. Bottom-aligned inside the safe area, so the label sits just under
 * the status bar exactly as the board draws it.
 */
const StickyBar = memo(function StickyBar({
  scrollY,
  offset,
  padding,
  children,
}: PropsWithChildren<{
  scrollY: { value: number };
  offset: number;
  padding: number;
}>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [offset - 60, offset],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.sticky,
        {
          paddingTop: insets.top,
          paddingHorizontal: padding,
          backgroundColor: colors.chrome,
          borderBottomColor: colors.chromeBorder,
        },
        style,
      ]}>
      {children}
    </Animated.View>
  );
});

export type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** Right-aligned controls — view toggles, a settings gear, a Save action. */
  action?: ReactNode;
  /** Renders the back chevron above the title, as on every profile sub-screen. */
  onBack?: () => void;
  /** Admin headings run one step smaller than the reader app's. */
  dense?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * The standard page heading. When `onBack` is given the chevron sits on its own
 * line above the title, matching the profile and admin stacks.
 */
export const ScreenHeader = memo(function ScreenHeader({
  title,
  subtitle,
  action,
  onBack,
  dense = false,
  style,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      {onBack ? (
        <View style={styles.backRow}>
          <IconButton
            icon={ChevronLeft}
            onPress={onBack}
            variant="plain"
            buttonSize={36}
            accessibilityLabel="Go back"
          />
          {action}
        </View>
      ) : null}

      <View style={styles.titleRow}>
        <View style={styles.titles}>
          <Display size={dense ? 'screenDense' : 'screen'}>{title}</Display>
          {subtitle ? (
            <Text size={fontSize.bodySmall} leading={1.6} tone="muted">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {!onBack ? action : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  static: {
    flex: 1,
  },
  grow: {
    flex: 1,
  },
  sticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  header: {
    gap: 14,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titles: {
    flex: 1,
    gap: 8,
  },
});

export { Card, PressableCard, Divider, SectionHeader, Callout } from '@/components/ui/Surface';
export { EmptyState } from '@/components/ui/EmptyState';
