import { memo, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  CircularProgress,
  CircularProgressIndicator,
  CircularProgressRange,
  CircularProgressTrack,
  CircularProgressValueText,
} from '@/components/ui/CircularProgress';
import { useTheme } from '@/theme/ThemeContext';

const EXIT_MS = 220;
const COMPLETE_HOLD_MS = 280;
const EASE_OUT = Easing.out(Easing.quad);
const TIMING = { reduceMotion: ReduceMotion.System } as const;

type ReaderStageSkeletonProps = {
  ready?: boolean;
  progress?: number | null;
  onFinished?: () => void;
};

export const ReaderStageSkeleton = memo(function ReaderStageSkeleton({
  ready = false,
  progress = null,
  onFinished,
}: ReaderStageSkeletonProps) {
  const { isDark } = useTheme();
  const reduceMotion = useReducedMotion();
  const overlayOpacity = useSharedValue(1);
  const onFinishedRef = useRef(onFinished);
  const exiting = useRef(false);

  onFinishedRef.current = onFinished;

  const finish = useCallback(() => {
    onFinishedRef.current?.();
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimation(overlayOpacity);
    };
  }, [overlayOpacity]);

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

      overlayOpacity.value = withTiming(
        0,
        { duration: EXIT_MS, easing: EASE_OUT, ...TIMING },
        finished => {
          if (finished) {
            runOnJS(finish)();
          }
        },
      );
    };

    const timer = setTimeout(playExit, COMPLETE_HOLD_MS);
    const fallback = setTimeout(finish, COMPLETE_HOLD_MS + EXIT_MS + 80);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallback);
    };
  }, [finish, overlayOpacity, ready, reduceMotion]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return (
    <Animated.View
      pointerEvents={ready ? 'none' : 'auto'}
      style={[
        styles.wrap,
        { backgroundColor: isDark ? '#101410' : '#ECECEB' },
        overlayStyle,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading book"
      accessibilityState={{ busy: !ready }}>
      <View style={styles.center} pointerEvents="none">
        <CircularProgress value={ready ? 100 : progress ?? 0} size={60} thickness={4}>
          <CircularProgressIndicator>
            <CircularProgressTrack />
            <CircularProgressRange />
          </CircularProgressIndicator>
          <CircularProgressValueText />
        </CircularProgress>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
