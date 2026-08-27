import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
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

/** One pulse for a whole skeleton tree — avoids per-bone animations. */
export function SkeletonPulse({ children }: { children: ReactNode }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(pulse);
    };
  }, [pulse]);

  return <PulseContext.Provider value={pulse}>{children}</PulseContext.Provider>;
}

type SkeletonBoneProps = {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonBone({
  width = '100%',
  height,
  radius = 8,
  style,
}: SkeletonBoneProps) {
  const pulse = useContext(PulseContext);
  const { colors } = useTheme();
  const animatedStyle = useAnimatedStyle(() => {
    const t = pulse ? pulse.value : 0.6;
    return {
      opacity: interpolate(t, [0, 1], [0.42, 1]),
    };
  });

  return (
    <Animated.View
      style={[
        styles.bone,
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.fill,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bone: {
    overflow: 'hidden',
  },
});
