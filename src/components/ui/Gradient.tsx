import { memo, useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, {
  Defs,
  Line,
  LinearGradient as SvgLinearGradient,
  Pattern,
  RadialGradient as SvgRadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { useTheme } from '@/theme/ThemeContext';

export type GradientStop = { offset: number; color: string; opacity?: number };

/**
 * Gradients are drawn with `react-native-svg` rather than a blur pass. The
 * design calls for static washes precisely because they cost nothing on
 * Android — a real blur behind a scrolling list is the thing that drops frames.
 */
export const LinearGradient = memo(function LinearGradient({
  stops,
  /** Angle in degrees; 180 is top-to-bottom. */
  angle = 180,
  style,
}: {
  stops: GradientStop[];
  angle?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const id = useId();
  const radians = ((angle - 90) * Math.PI) / 180;
  const x = Math.cos(radians) / 2;
  const y = Math.sin(radians) / 2;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg pointerEvents="none" width="100%" height="100%">
        <Defs>
          <SvgLinearGradient
            id={id}
            x1={`${(0.5 - x) * 100}%`}
            y1={`${(0.5 - y) * 100}%`}
            x2={`${(0.5 + x) * 100}%`}
            y2={`${(0.5 + y) * 100}%`}>
            {stops.map((stop, index) => (
              <Stop
                key={index}
                offset={`${stop.offset * 100}%`}
                stopColor={stop.color}
                stopOpacity={stop.opacity ?? 1}
              />
            ))}
          </SvgLinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
});

/**
 * The soft circular bloom behind the splash logo, the sign-in heading and the
 * membership screen. Fades to fully transparent so it can sit over anything.
 */
export const RadialGlow = memo(function RadialGlow({
  color,
  opacity = 0.32,
  size,
  /** Position of the glow's centre, relative to the parent. */
  left,
  right,
  top,
  bottom,
  style,
}: {
  color: string;
  opacity?: number;
  size: number;
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const id = useId();

  return (
    <View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size, left, right, top, bottom }, style]}>
      <Svg pointerEvents="none" width="100%" height="100%">
        <Defs>
          <SvgRadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
            <Stop offset="68%" stopColor={color} stopOpacity={0} />
          </SvgRadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
});

/**
 * The fine diagonal rule that gives auth and membership screens their woven
 * texture. Drawn as one tiled SVG pattern, so it costs a single view no matter
 * how large the area it covers.
 */
export const DiagonalTexture = memo(function DiagonalTexture({
  color,
  opacity = 0.07,
  /** Degrees. The design runs 115° on auth and 120° on membership. */
  angle = 115,
  spacing = 16,
  thickness = 2,
  style,
}: {
  color: string;
  opacity?: number;
  angle?: number;
  spacing?: number;
  thickness?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const id = useId();

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg pointerEvents="none" width="100%" height="100%">
        <Defs>
          <Pattern
            id={id}
            patternUnits="userSpaceOnUse"
            width={spacing}
            height={spacing}
            patternTransform={`rotate(${angle})`}>
            <Line
              x1={thickness / 2}
              y1={0}
              x2={thickness / 2}
              y2={spacing}
              stroke={color}
              strokeWidth={thickness}
              strokeOpacity={opacity}
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
});

/**
 * The green wash that falls from the top of Home and fades into the page
 * background. Two static layers — the gradient, then the fine diagonal weave
 * the design lays over it — so the header has grain without a blur pass.
 */
export const HeaderWash = memo(function HeaderWash({
  height = 520,
  tone = 'primary',
  intensity = 0.3,
  textured = true,
}: {
  height?: number;
  tone?: 'primary' | 'gold';
  intensity?: number;
  /** The weave over the gradient. Off for washes behind dense content. */
  textured?: boolean;
}) {
  const { colors } = useTheme();
  const tint = tone === 'gold' ? colors.gold : colors.primary;

  return (
    <View pointerEvents="none" style={[styles.wash, { height }]}>
      <LinearGradient
        stops={[
          { offset: 0, color: tint, opacity: intensity },
          { offset: 0.55, color: colors.background, opacity: 0.8 },
          { offset: 1, color: colors.background, opacity: 1 },
        ]}
      />
      {textured ? (
        <DiagonalTexture
          color={colors.ink}
          opacity={0.035}
          angle={135}
          spacing={9}
          thickness={3}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wash: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
});
