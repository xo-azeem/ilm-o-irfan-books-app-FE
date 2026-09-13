import { memo, useEffect } from 'react';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The tick, in a 24-unit box, and the length of its stroke. */
const TICK_PATH = 'M5 12.5 L10 17.5 L19 7.5';
const TICK_LENGTH = 20.6;

const DRAW_MS = 260;
const POP_DELAY_MS = 40;

/**
 * A tick that draws itself — the stroke runs from the short arm to the long
 * one while the glyph pops up to size. Static (already drawn) unless `animate`
 * is set, so a button that mounts already saved does not celebrate on arrival.
 */
export const AnimatedCheck = memo(function AnimatedCheck({
  size = 16,
  color,
  strokeWidth = 2.4,
  animate = false,
}: {
  size?: number;
  color: string;
  strokeWidth?: number;
  animate?: boolean;
}) {
  const drawn = useSharedValue(animate ? 0 : 1);
  const scale = useSharedValue(animate ? 0.6 : 1);

  useEffect(() => {
    if (!animate) {
      return;
    }
    drawn.value = withTiming(1, {
      duration: DRAW_MS,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
    scale.value = withDelay(
      POP_DELAY_MS,
      withSequence(
        withSpring(1.18, {
          damping: 12,
          stiffness: 260,
          reduceMotion: ReduceMotion.System,
        }),
        withSpring(1, {
          damping: 14,
          stiffness: 220,
          reduceMotion: ReduceMotion.System,
        }),
      ),
    );
  }, [animate, drawn, scale]);

  const pathProps = useAnimatedProps(() => ({
    strokeDashoffset: TICK_LENGTH * (1 - drawn.value),
  }));

  const boxStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={boxStyle}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <AnimatedPath
          d={TICK_PATH}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={TICK_LENGTH}
          animatedProps={pathProps}
        />
      </Svg>
    </Animated.View>
  );
});
