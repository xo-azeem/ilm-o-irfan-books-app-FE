import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { fonts } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

const DEFAULT_MAX = 100;
const DEFAULT_SIZE = 48;
const DEFAULT_THICKNESS = 4;
const SPIN_MS = 800;
const FILL_MS = 160;
const TIMING = { reduceMotion: ReduceMotion.System } as const;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ProgressState = 'indeterminate' | 'complete' | 'loading';

type CircularProgressContextValue = {
  value: number | null;
  valueText: string | undefined;
  max: number;
  min: number;
  state: ProgressState;
  radius: number;
  thickness: number;
  size: number;
  center: number;
  circumference: number;
  percentage: number | null;
  trackColor: string;
  rangeColor: string;
  labelColor: string;
};

const CircularProgressContext = createContext<CircularProgressContextValue | null>(null);

function useCircularProgressContext(consumerName: string) {
  const context = useContext(CircularProgressContext);
  if (!context) {
    throw new Error(`${consumerName} must be used within CircularProgress`);
  }
  return context;
}

function getProgressState(value: number | null, max: number): ProgressState {
  return value == null ? 'indeterminate' : value >= max ? 'complete' : 'loading';
}

export type CircularProgressProps = {
  value?: number | null;
  min?: number;
  max?: number;
  size?: number;
  thickness?: number;
  children?: ReactNode;
};

export function CircularProgress({
  value: valueProp = null,
  min = 0,
  max = DEFAULT_MAX,
  size = DEFAULT_SIZE,
  thickness = DEFAULT_THICKNESS,
  children,
}: CircularProgressProps) {
  const { colors } = useTheme();
  const clampedMax = max > min ? max : min + 1;
  const value =
    typeof valueProp === 'number' && Number.isFinite(valueProp)
      ? Math.min(clampedMax, Math.max(min, valueProp))
      : null;
  const percentage =
    value == null ? null : clampedMax === min ? 1 : (value - min) / (clampedMax - min);
  const radius = Math.max(0, (size - thickness) / 2);
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const valueText =
    value == null ? undefined : `${Math.round((percentage ?? 0) * 100)}%`;

  const contextValue = useMemo<CircularProgressContextValue>(
    () => ({
      value,
      valueText,
      max: clampedMax,
      min,
      state: getProgressState(value, clampedMax),
      radius,
      thickness,
      size,
      center,
      circumference,
      percentage,
      trackColor: colors.faint,
      rangeColor: colors.primary,
      labelColor: colors.ink,
    }),
    [
      clampedMax,
      colors.faint,
      colors.ink,
      colors.primary,
      min,
      percentage,
      radius,
      size,
      thickness,
      value,
      valueText,
    ],
  );

  return (
    <CircularProgressContext.Provider value={contextValue}>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={
          value == null
            ? { min, max: clampedMax, text: 'Loading' }
            : { min, max: clampedMax, now: Math.round(value) }
        }
        style={[styles.root, { width: size, height: size }]}>
        {children}
      </View>
    </CircularProgressContext.Provider>
  );
}

export function CircularProgressIndicator({ children }: { children?: ReactNode }) {
  const { size, state } = useCircularProgressContext('CircularProgressIndicator');
  const reduceMotion = useReducedMotion();
  const spin = useSharedValue(0);

  useEffect(() => {
    if (state !== 'indeterminate' || reduceMotion) {
      cancelAnimation(spin);
      spin.value = 0;
      return;
    }

    spin.value = 0;
    spin.value = withRepeat(
      withTiming(1, { duration: SPIN_MS, easing: Easing.linear, ...TIMING }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(spin);
    };
  }, [reduceMotion, spin, state]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-90 + spin.value * 360}deg` }],
  }));

  return (
    <Animated.View style={[styles.indicator, { width: size, height: size }, spinStyle]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {children}
      </Svg>
    </Animated.View>
  );
}

export function CircularProgressTrack() {
  const { center, radius, thickness, trackColor } = useCircularProgressContext(
    'CircularProgressTrack',
  );

  return (
    <Circle
      cx={center}
      cy={center}
      r={radius}
      fill="none"
      stroke={trackColor}
      strokeOpacity={0.2}
      strokeWidth={thickness}
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
    />
  );
}

export function CircularProgressRange() {
  const { center, radius, thickness, circumference, percentage, rangeColor, state } =
    useCircularProgressContext('CircularProgressRange');
  const initialOffset =
    state === 'indeterminate' || percentage == null
      ? circumference * 0.75
      : circumference * (1 - percentage);
  const offset = useSharedValue(initialOffset);

  useEffect(() => {
    const next =
      state === 'indeterminate' || percentage == null
        ? circumference * 0.75
        : circumference * (1 - percentage);
    offset.value = withTiming(next, {
      duration: FILL_MS,
      easing: Easing.inOut(Easing.quad),
      ...TIMING,
    });
  }, [circumference, offset, percentage, state]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
  }));

  return (
    <AnimatedCircle
      cx={center}
      cy={center}
      r={radius}
      fill="none"
      stroke={rangeColor}
      strokeWidth={thickness}
      strokeLinecap="round"
      strokeDasharray={`${circumference} ${circumference}`}
      strokeDashoffset={initialOffset}
      vectorEffect="non-scaling-stroke"
      animatedProps={animatedProps}
    />
  );
}

export function CircularProgressValueText() {
  const { valueText, labelColor, state } = useCircularProgressContext(
    'CircularProgressValueText',
  );

  if (state === 'indeterminate' || !valueText) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.valueWrap}>
      <Text style={[styles.value, { color: labelColor }]}>{valueText}</Text>
    </View>
  );
}

export function CircularProgressCombined(props: CircularProgressProps) {
  return (
    <CircularProgress {...props}>
      <CircularProgressIndicator>
        <CircularProgressTrack />
        <CircularProgressRange />
      </CircularProgressIndicator>
      <CircularProgressValueText />
    </CircularProgress>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
  },
  valueWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
