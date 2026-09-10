import { memo, useId, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useDerivedValue } from 'react-native-reanimated';
import Svg, {
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  LinearGradient,
  Path,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { PAGE_FLIP } from '@/features/reader/constants';
import {
  CAST_FROM,
  CAST_SPAN,
  CURL_FROM,
  curlSpan,
  foldFrame,
  type FoldFrame,
} from '@/features/reader/paperFold';
import type { FoldState } from '@/features/reader/usePaperFlip';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

/**
 * `matrix`, not `transform`.
 *
 * An animated prop is written straight onto the native node, past the JSX
 * props a group would normally be built from — and the node knows the fold's
 * reflection by the name its own shadow node uses. The JSX type has no reason
 * to know that name, so it is told here.
 */
type MatrixProps = { matrix: number[] };
const AnimatedG = Animated.createAnimatedComponent(
  G as unknown as React.ComponentType<React.ComponentProps<typeof G> & Partial<MatrixProps>>,
);

/** The ink of the book: what its shading and its grain are drawn in. */
const INK = '#30302B';

/**
 * The halo a raised leaf throws around its own edges.
 *
 * The design asks for a drop-shadow, which in SVG means a filter — an offscreen
 * pass and a blur, regenerated on every frame of a fold, which is the one thing
 * a turn cannot afford. So the blur is built instead out of three strokes of
 * the leaf's own outline, widest and faintest first. Each is centred on the
 * edge, so its inner half is covered by the leaf drawn over it and only the
 * outer half is seen; stacked, they step down from the edge the way a blur
 * does. Composited over one another the three reach 1-(1-a)³ ≈ 0.34 hard
 * against the edge, which is the shadow the design asks for.
 */
const HALO = [1, 0.62, 0.3] as const;
const HALO_ALPHA = 0.13;

/** Fixed stops along the cast shadow's axis: see `paperFold.ts`. */
const CAST_STOPS = [
  { at: 0, opacity: 0 },
  { at: (1 - CAST_FROM) / CAST_SPAN, opacity: 0.5 },
  { at: (34 - CAST_FROM) / CAST_SPAN, opacity: 0.18 },
  { at: 1, opacity: 0 },
] as const;

type PaperFoldProps = {
  /** The page box, in points. The fold is measured in its coordinates. */
  width: number;
  height: number;
  /** Where the fold is. All of it lives on the UI thread. */
  fold: FoldState;
  /**
   * The leaf's own face, as a bitmap.
   *
   * A document view can only draw the page it is on, and a fold needs the same
   * page twice — lying flat, and mirrored across the crease — while the page it
   * opens onto is drawn underneath. So the leaf is a picture of a page and the
   * page beneath is the live document view, seen through everything here that
   * is not painted. Null while a page has never been captured, which leaves the
   * leaf as blank paper rather than as a hole in the book.
   */
  leaf: string | null;
  /**
   * The tint the reader's page tone lays over paper, if it lays one.
   *
   * Only ever reaches the blank paper. A captured leaf was captured with the
   * tone already on it, and tinting it twice would put the reader's sepia on
   * the page they are turning but not on the page underneath it.
   */
  wash?: string | null;
};

/**
 * A sheet of paper, folded.
 *
 * `paperFold.ts` works out where the crease is and what falls either side of
 * it; this draws that, once per frame, on the UI thread. Nothing in here
 * re-renders during a turn — every moving part is an animated prop.
 *
 * Order matters, and it is the design's: the shadow the leaf throws on the page
 * below, then the sheet still lying flat, then the halo around the raised leaf,
 * then the folded half itself. The page underneath is not drawn here at all —
 * it is the live document view, showing through wherever this is transparent.
 */
export const PaperFold = memo(function PaperFold({
  width,
  height,
  fold,
  leaf,
  wash,
}: PaperFoldProps) {
  // React's own ids carry characters a URL reference may not, and every one of
  // these is referenced as `url(#…)`.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const flatId = `pf-flat-${uid}`;
  const landId = `pf-land-${uid}`;
  const castId = `pf-cast-${uid}`;
  const curlId = `pf-curl-${uid}`;
  const spineId = `pf-spine-${uid}`;

  const { fx, fy, cy, live } = fold;
  const k = PAGE_FLIP.shadowStrength;
  const lit = PAGE_FLIP.curlHighlight;
  const spine = Math.min(PAGE_FLIP.spine, width);

  /** The curl's stops, which are fractions of an axis the page's size sets. */
  const curlStops = useMemo(() => {
    const span = curlSpan(width, height) || 1;
    const at = (points: number) => Math.min(1, (points - CURL_FROM) / span);
    return [
      { at: 0, color: '#FFFFFF', opacity: 0 },
      { at: at(1), color: '#FFFFFF', opacity: lit },
      { at: at(14), color: '#FFFFFF', opacity: 0 },
      { at: at(46), color: '#000000', opacity: 0.07 * k },
      { at: at(170), color: '#000000', opacity: 0.19 * k },
      { at: 1, color: '#000000', opacity: 0.28 * k },
    ];
  }, [height, k, lit, width]);

  // One geometry pass per frame, read by everything below it.
  const frame = useDerivedValue<FoldFrame>(
    () => foldFrame(live.value ? width : 0, height, cy.value, fx.value, fy.value),
    [width, height],
  );

  const flatProps = useAnimatedProps(() => ({ d: frame.value.flat }));
  const landProps = useAnimatedProps(() => ({ d: frame.value.land }));

  const castProps = useAnimatedProps(() => {
    const a = frame.value.cast;
    return { x1: a[0], y1: a[1], x2: a[2], y2: a[3] };
  });
  const castFade = useAnimatedProps(() => ({ opacity: frame.value.castOpacity }));

  const curlProps = useAnimatedProps(() => {
    const a = frame.value.curl;
    return { x1: a[0], y1: a[1], x2: a[2], y2: a[3] };
  });

  const mirrorProps = useAnimatedProps<MatrixProps>(() => ({ matrix: frame.value.matrix }));

  const halo0 = useAnimatedProps(() => ({
    d: frame.value.land,
    strokeWidth: 2 * frame.value.halo * HALO[0],
  }));
  const halo1 = useAnimatedProps(() => ({
    d: frame.value.land,
    strokeWidth: 2 * frame.value.halo * HALO[1],
  }));
  const halo2 = useAnimatedProps(() => ({
    d: frame.value.land,
    strokeWidth: 2 * frame.value.halo * HALO[2],
  }));

  const halos = [halo0, halo1, halo2];
  const href = leaf ? { uri: leaf } : undefined;
  const bare = href ? null : wash;

  return (
    <View pointerEvents="none" style={[styles.box, { width, height }]}>
      <Svg width={width} height={height} pointerEvents="none">
        <Defs>
          <ClipPath id={flatId}>
            <AnimatedPath animatedProps={flatProps} />
          </ClipPath>
          <ClipPath id={landId}>
            <AnimatedPath animatedProps={landProps} />
          </ClipPath>

          {/* The shadow the raised leaf throws on the page below: hard against
              the crease, and gone a hundred points out from it. */}
          <AnimatedLinearGradient
            id={castId}
            gradientUnits="userSpaceOnUse"
            animatedProps={castProps}>
            {CAST_STOPS.map((stop, index) => (
              <Stop
                key={index}
                offset={stop.at}
                stopColor="#000000"
                stopOpacity={stop.opacity * k}
              />
            ))}
          </AnimatedLinearGradient>

          {/* The curl on the folded half: a lit edge right at the crease, and
              the paper falling into its own shade behind it. */}
          <AnimatedLinearGradient
            id={curlId}
            gradientUnits="userSpaceOnUse"
            animatedProps={curlProps}>
            {curlStops.map((stop, index) => (
              <Stop
                key={index}
                offset={stop.at}
                stopColor={stop.color}
                stopOpacity={stop.opacity}
              />
            ))}
          </AnimatedLinearGradient>

          {/* The shade along the spine, where a bound page curves away. */}
          <LinearGradient
            id={spineId}
            gradientUnits="userSpaceOnUse"
            x1={0}
            y1={0}
            x2={spine}
            y2={0}>
            <Stop offset={0} stopColor={INK} stopOpacity={0.2} />
            <Stop offset={0.45} stopColor={INK} stopOpacity={0.06} />
            <Stop offset={1} stopColor={INK} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* 1. What the raised leaf casts on the page showing through beneath.
               The design clips this to the lifted half; there is no need to,
               because the sheet still lying flat is drawn opaque over the
               rest of it in the very next layer. */}
        <AnimatedRect
          width={width}
          height={height}
          fill={`url(#${castId})`}
          animatedProps={castFade}
        />

        {/* 2. The sheet still lying flat: clipped to the part that has not
               folded, which at rest is the whole page. */}
        <G clipPath={`url(#${flatId})`}>
          <Rect width={width} height={height} fill={PAGE_FLIP.paper} />
          {href ? (
            <SvgImage
              href={href}
              x={0}
              y={0}
              width={width}
              height={height}
              preserveAspectRatio="none"
            />
          ) : null}
          {bare ? <Rect width={width} height={height} fill={bare} /> : null}
          <Rect width={spine} height={height} fill={`url(#${spineId})`} />
        </G>

        {/* 3. The halo, over the flat sheet and under the leaf that throws it. */}
        {halos.map((props, index) => (
          <AnimatedPath
            key={index}
            animatedProps={props}
            fill="none"
            stroke="#000000"
            strokeOpacity={HALO_ALPHA * k}
            strokeLinejoin="round"
          />
        ))}

        {/* 4. The folded half of the same sheet, mirrored across the crease and
               trimmed to where it lands — a bound leaf cannot fold past its own
               binding. The clip is in the page's coordinates, outside the
               reflection; the paper inside it is drawn as if it had never
               folded, and the reflection carries it over. */}
        <G clipPath={`url(#${landId})`}>
          <AnimatedG animatedProps={mirrorProps}>
            <Rect width={width} height={height} fill={PAGE_FLIP.paperBack} />
            {href ? (
              <SvgImage
                href={href}
                x={0}
                y={0}
                width={width}
                height={height}
                opacity={0.9}
                preserveAspectRatio="none"
              />
            ) : null}
            {bare ? <Rect width={width} height={height} fill={bare} opacity={0.9} /> : null}
            <Rect width={spine} height={height} fill={`url(#${spineId})`} />
            <Rect width={width} height={height} fill={`url(#${curlId})`} />
          </AnimatedG>
        </G>
      </Svg>
    </View>
  );
});

/**
 * The grain of the paper.
 *
 * Two crossed weaves a few points apart and a slow darkening towards the foot
 * of the page. Nothing in it moves, so it is its own static SVG rather than
 * three more layers inside the fold to be redrawn every frame of a turn for no
 * change at all.
 *
 * It covers the whole page box rather than each of the fold's three surfaces
 * separately, as the design has it — every point of the box is one of those
 * three at any moment, so one sheet of grain over all of them comes to the same
 * thing for a third of the cost.
 *
 * The stage draws it, not the fold, and for the whole time the reader is in
 * this mode rather than only during a turn. Grain that arrived with the fold
 * and left with it would be a texture appearing on the page every time it was
 * touched; and drawn above the page but outside what is photographed, it is
 * never captured into a leaf and so never laid down twice.
 */
export const PaperGrain = memo(function PaperGrain({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const warpId = `pg-warp-${uid}`;
  const weftId = `pg-weft-${uid}`;
  const footId = `pg-foot-${uid}`;

  return (
    <Svg
      pointerEvents="none"
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern
          id={warpId}
          patternUnits="userSpaceOnUse"
          width={3}
          height={3}
          patternTransform="rotate(4)">
          <Rect width={1} height={3} fill={INK} fillOpacity={0.035} />
        </Pattern>
        <Pattern
          id={weftId}
          patternUnits="userSpaceOnUse"
          width={4}
          height={4}
          patternTransform="rotate(4)">
          <Rect width={4} height={1} fill={INK} fillOpacity={0.028} />
        </Pattern>
        <RadialGradient id={footId} cx="50%" cy="0%" rx="120%" ry="90%">
          <Stop offset={0.4} stopColor={INK} stopOpacity={0} />
          <Stop offset={1} stopColor={INK} stopOpacity={0.05} />
        </RadialGradient>
      </Defs>
      <Rect width={width} height={height} fill={`url(#${warpId})`} />
      <Rect width={width} height={height} fill={`url(#${weftId})`} />
      <Rect width={width} height={height} fill={`url(#${footId})`} />
    </Svg>
  );
});

const styles = StyleSheet.create({
  /** Laid exactly over the page box it is a fold of. */
  box: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
