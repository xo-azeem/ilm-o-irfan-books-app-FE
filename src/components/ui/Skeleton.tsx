import { createContext, memo, useContext, useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeContext';

const PulseContext = createContext<SharedValue<number> | null>(null);

/**
 * One driver for a whole skeleton tree. Every bone reads the same shared value,
 * so a full-screen skeleton costs one animation rather than thirty.
 */
export const SkeletonPulse = memo(function SkeletonPulse({ children }: { children: ReactNode }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, {
        duration: 1400,
        easing: Easing.inOut(Easing.quad),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(pulse);
    };
  }, [pulse]);

  return <PulseContext.Provider value={pulse}>{children}</PulseContext.Provider>;
});

export type SkeletonBoneProps = {
  width?: DimensionValue;
  height: number;
  radius?: number;
  /**
   * Adds the travelling highlight. Reserve it for the one or two lead elements
   * in a section — a screen where everything shimmers reads as noise.
   */
  shimmer?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const SkeletonBone = memo(function SkeletonBone({
  width = '100%',
  height,
  radius = 8,
  shimmer = false,
  style,
}: SkeletonBoneProps) {
  const pulse = useContext(PulseContext);
  const { colors } = useTheme();

  const animatedStyle = useAnimatedStyle(() => {
    const t = pulse ? pulse.value : 0.6;
    return { opacity: interpolate(t, [0, 1], [0.5, 1]) };
  });

  const sweepStyle = useAnimatedStyle(() => {
    const t = pulse ? pulse.value : 0;
    return {
      // Travels a little past both edges so the highlight enters and exits
      // rather than appearing mid-bone.
      transform: [{ translateX: interpolate(t, [0, 1], [-120, 320]) }],
      opacity: interpolate(t, [0, 0.5, 1], [0, 0.5, 0]),
    };
  });

  return (
    <Animated.View
      style={[
        styles.bone,
        { width, height, borderRadius: radius, backgroundColor: colors.surfaceRaised },
        animatedStyle,
        style,
      ]}>
      {shimmer ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.sweep, { backgroundColor: colors.surfaceHigh }, sweepStyle]}
        />
      ) : null}
    </Animated.View>
  );
});

/** A skeleton standing in for a cover, at the real cover ratio. */
export const SkeletonCover = memo(function SkeletonCover({
  width,
  height,
  shimmer = false,
}: {
  width: number;
  height?: number;
  shimmer?: boolean;
}) {
  return (
    <SkeletonBone
      width={width}
      height={height ?? Math.round(width * 1.5)}
      radius={Math.max(5, Math.round(width * 0.07))}
      shimmer={shimmer}
    />
  );
});

/** A horizontal rail of skeleton covers. */
export const SkeletonRail = memo(function SkeletonRail({
  count = 3,
  width = 120,
  gap = 14,
}: {
  count?: number;
  width?: number;
  gap?: number;
}) {
  return (
    <View style={[styles.row, { gap }]}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCover key={index} width={width} shimmer={index === 0} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  bone: {
    overflow: 'hidden',
  },
  sweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
  },
  row: {
    flexDirection: 'row',
  },
});
