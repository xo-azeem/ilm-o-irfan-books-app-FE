import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AppLogo } from '@/components/brand';
import { RadialGlow } from '@/components/ui';
import { fonts, typography } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

const ENTER_MS = 560;
const EXIT_MS = 320;
const MIN_VISIBLE_MS = 640;
/** Give the navigator a beat to mount/paint under the splash before exit. */
const SETTLE_MS = 140;
const ENTER_SCALE = 0.92;
const EXIT_SCALE = 1.045;
const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const TIMING = { reduceMotion: ReduceMotion.System } as const;
const ENTER_SPRING = {
  damping: 18,
  stiffness: 160,
  mass: 0.72,
  overshootClamping: true,
  reduceMotion: ReduceMotion.System,
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type AuthSplashProps = {
  ready?: boolean;
  onFinished?: () => void;
};

export function AuthSplash({ ready = false, onFinished }: AuthSplashProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(reduceMotion ? 1 : ENTER_SCALE);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const overlayOpacity = useSharedValue(1);
  const mountedAt = useRef(Date.now());
  const onFinishedRef = useRef(onFinished);
  const exiting = useRef(false);

  onFinishedRef.current = onFinished;

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
    setSize(prev =>
      prev.width === nextWidth && prev.height === nextHeight
        ? prev
        : { width: nextWidth, height: nextHeight },
    );
  }, []);

  const metrics = useMemo(() => {
    const shortest = Math.min(width || 1, height || 1);
    const logoSize = Math.round(clamp(shortest * 0.22, 80, 128));
    const fontSize = Math.round(clamp(shortest * 0.052, 18, 26));
    return {
      logoSize,
      fontSize,
      nameGap: Math.round(logoSize * 0.16),
    };
  }, [height, width]);

  const finish = useCallback(() => {
    onFinishedRef.current?.();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      opacity.value = 1;
      return;
    }

    scale.value = withSpring(1, ENTER_SPRING);
    opacity.value = withTiming(1, { duration: ENTER_MS * 0.7, easing: EASE_OUT, ...TIMING });

    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [opacity, reduceMotion, scale]);

  useEffect(() => {
    if (!ready || exiting.current) {
      return;
    }

    const playExit = () => {
      if (exiting.current) {
        return;
      }
      exiting.current = true;

      if (reduceMotion) {
        finish();
        return;
      }

      scale.value = withTiming(EXIT_SCALE, { duration: EXIT_MS, easing: EASE_OUT, ...TIMING });
      overlayOpacity.value = withTiming(
        0,
        { duration: EXIT_MS, easing: Easing.out(Easing.quad), ...TIMING },
        finished => {
          if (finished) {
            runOnJS(finish)();
          }
        },
      );
    };

    const wait = Math.max(
      SETTLE_MS,
      MIN_VISIBLE_MS - (Date.now() - mountedAt.current),
    );
    const timer = setTimeout(playExit, wait);
    const fallbackTimer = setTimeout(finish, wait + EXIT_MS + 80);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
      cancelAnimation(overlayOpacity);
    };
  }, [finish, opacity, overlayOpacity, ready, reduceMotion, scale]);

  const brandStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="auto"
      onLayout={onLayout}
      style={[
        styles.root,
        overlayStyle,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingRight: insets.right,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
        },
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel="Ilm o Irfan"
      accessibilityState={{ busy: !ready }}>
      <RadialGlow color={colors.primary} opacity={0.3} size={460} style={styles.glow} />
      <Animated.View
        collapsable={false}
        style={[styles.brand, brandStyle]}>
        <AppLogo size={metrics.logoSize} />
        <Text
          style={[
            styles.name,
            {
              color: colors.ink,
              marginTop: metrics.nameGap,
              fontSize: metrics.fontSize,
              lineHeight: Math.round(metrics.fontSize * 1.2),
            },
          ]}>
          Ilm o Irfan
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    alignSelf: 'center',
  },
  brand: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontFamily: fonts.display,
    letterSpacing: typography.tight,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
