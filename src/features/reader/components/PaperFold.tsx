import { memo, useCallback, useId, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { LinearGradient, type GradientStop } from '@/components/ui/Gradient';
import { PAGE_FLIP } from '@/features/reader/constants';
import {
  CAST_FROM,
  CAST_SPAN,
  CURL_FROM,
  bandXf,
  clipperXf,
  contentXf,
  creaseOf,
  curlSpan,
  foldFrame,
  reflectXf,
  type Xf,
} from '@/features/reader/paperFold';
import type { FoldState } from '@/features/reader/usePaperFlip';

/** The ink of the book: what its shading and its grain are drawn in. */
const INK = '#30302B';

/**
 * The halo a raised leaf throws around its own edges.
 *
 * The design asks for a drop-shadow, which for a shape that changes every
 * frame means an offscreen pass and a blur, regenerated on every frame of a
 * fold — the one thing a turn cannot afford. So the blur is built instead out
 * of three strokes of the leaf's own outline, widest and faintest first. Each
 * is centred on the edge, so its inner half is covered by the leaf drawn over
 * it and only the outer half is seen; stacked, they step down from the edge the
 * way a blur does. Composited over one another the three reach 1-(1-a)³ ≈ 0.34
 * hard against the edge, which is the shadow the design asks for.
 */
const HALO = [1, 0.62, 0.3] as const;
const HALO_ALPHA = 0.13;

/** The shadow the raised leaf throws on the page below, out from the crease. */
const CAST_STOPS: GradientStop[] = [
  { offset: 0, color: '#000000', opacity: 0 },
  { offset: (1 - CAST_FROM) / CAST_SPAN, color: '#000000', opacity: 0.5 * PAGE_FLIP.shadowStrength },
  { offset: (34 - CAST_FROM) / CAST_SPAN, color: '#000000', opacity: 0.18 * PAGE_FLIP.shadowStrength },
  { offset: 1, color: '#000000', opacity: 0 },
];

/** The shade along the spine, where a bound page curves away. */
const SPINE_STOPS: GradientStop[] = [
  { offset: 0, color: INK, opacity: 0.2 },
  { offset: 0.45, color: INK, opacity: 0.06 },
  { offset: 1, color: INK, opacity: 0 },
];

/**
 * A clipper's side. A page is at most a few hundred points across; a square
 * this large, laid with one edge on the crease, covers the whole of it from
 * any angle with room to spare.
 */
function sizeFor(width: number, height: number) {
  return 2 * (width + height);
}

/** Where the crease is, and everything the views need to know about it. */
type Crease = {
  on: number;
  mx: number;
  my: number;
  th: number;
  /** Nothing has folded: the sheet is lying flat across the whole page. */
  flat: number;
  /** Nothing of the folded half is on the page. */
  gone: number;
  cast: number;
  halo: number;
  land: string;
};

/** The crease with no fold: off the page to the right, so everything is flat. */
function noCrease(width: number, on: number): Crease {
  'worklet';
  return {
    on,
    mx: width + 8,
    my: 0,
    th: 0,
    flat: 1,
    gone: 1,
    cast: 0,
    halo: 0,
    land: 'M0 0Z',
  };
}

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
 * `paperFold.ts` works out where the crease is; this draws what falls either
 * side of it, on the UI thread, out of nothing but native views.
 *
 * ## Why views and not paths
 *
 * The obvious way to fold a picture is to clip it to a polygon — and on the
 * web, where the design was drawn, that is what a fold is. Here it is not.
 * A polygon clip is an SVG definition, and an SVG picture inside it is a second
 * one, and neither of those reliably draws what it is asked to on both
 * platforms. A leaf whose picture never appears is not a fold.
 *
 * A half-plane, though, is nothing special. It is a large rotated view with
 * `overflow: hidden`, laid so that one edge runs along the crease; whatever is
 * put inside it wears the inverse transform and so stays exactly where it was
 * on the page while the view around it clips. The folded half is the same
 * thing again under a reflection in the crease. Every piece of that is a
 * translation, a rotation or one mirror — transforms a native view has drawn
 * for as long as there have been native views — and the picture on the leaf is
 * an ordinary `Image`.
 *
 * The shadows fall out of the same trick. A clipper's local x axis *is* the
 * crease normal, so a shadow measured out from the crease is a plain
 * left-to-right gradient inside one, with no transform of its own.
 *
 * Order is the design's: the shadow the leaf throws on the page below, then the
 * sheet still lying flat, then the halo around the raised leaf, then the folded
 * half itself. The page underneath is not drawn here at all — it is the live
 * document view, showing through wherever this is transparent.
 */
export const PaperFold = memo(function PaperFold({
  width,
  height,
  fold,
  leaf,
  wash,
}: PaperFoldProps) {
  const { fx, fy, cy, live } = fold;
  const size = sizeFor(width, height);
  const k = PAGE_FLIP.shadowStrength;
  const lit = PAGE_FLIP.curlHighlight;
  const spine = Math.min(PAGE_FLIP.spine, width);

  /** The curl on the folded half, measured out from the crease. */
  const span = curlSpan(width, height);
  const curlStops = useMemo<GradientStop[]>(() => {
    const at = (points: number) => Math.min(1, (points - CURL_FROM) / (span || 1));
    return [
      { offset: 0, color: '#FFFFFF', opacity: 0 },
      { offset: at(1), color: '#FFFFFF', opacity: lit },
      { offset: at(14), color: '#FFFFFF', opacity: 0 },
      { offset: at(46), color: '#000000', opacity: 0.07 * k },
      { offset: at(170), color: '#000000', opacity: 0.19 * k },
      { offset: 1, color: '#000000', opacity: 0.28 * k },
    ];
  }, [k, lit, span]);

  // One geometry pass per frame, read by every view below it.
  const crease = useDerivedValue<Crease>(() => {
    const on = live.value;
    const c = on ? creaseOf(width, height, cy.value, fx.value, fy.value) : null;
    if (!c) return noCrease(width, on);
    const frame = foldFrame(width, height, cy.value, fx.value, fy.value);
    return {
      on,
      mx: c.mx,
      my: c.my,
      th: c.th,
      flat: 0,
      gone: frame.gone ? 1 : 0,
      cast: frame.castOpacity,
      halo: frame.halo,
      land: frame.land,
    };
  }, [width, height]);

  // The sheet still lying flat: the half of the page against the normal.
  const frontClip = useAnimatedStyle(() => {
    const c = crease.value;
    return { transform: clipperXf(c.mx, c.my, c.th, -1, size) as Xf };
  });
  const frontContent = useAnimatedStyle(() => {
    const c = crease.value;
    return { transform: contentXf(c.mx, c.my, c.th, -1, size) as Xf };
  });

  // What the raised leaf casts on the page below: the lifted half, shaded out
  // from the crease. Its band needs no transform of its own — the clipper's
  // local x is already distance from the crease.
  const castClip = useAnimatedStyle(() => {
    const c = crease.value;
    return {
      opacity: c.flat ? 0 : c.cast,
      transform: clipperXf(c.mx, c.my, c.th, 1, size) as Xf,
    };
  });

  // The folded half: the lifted half of the page, reflected in the crease. The
  // reflection is outermost; inside it the clip and its contents are laid out
  // as if the sheet had never folded, and the reflection carries them over.
  const backReflect = useAnimatedStyle(() => {
    const c = crease.value;
    return {
      opacity: c.flat || c.gone ? 0 : 1,
      transform: reflectXf(c.mx, c.my, c.th) as Xf,
    };
  });
  const flapClip = useAnimatedStyle(() => {
    const c = crease.value;
    return { transform: clipperXf(c.mx, c.my, c.th, 1, size) as Xf };
  });
  const flapContent = useAnimatedStyle(() => {
    const c = crease.value;
    return { transform: contentXf(c.mx, c.my, c.th, 1, size) as Xf };
  });
  const curlBand = useAnimatedStyle(() => {
    const c = crease.value;
    return { transform: bandXf(c.mx, c.my, c.th, CURL_FROM, size) as Xf };
  });

  // The halo is the one thing here that is a shape rather than a half-plane,
  // so it is the one thing drawn as a path — a plain one, with no definition
  // behind it, rendered from props once per frame.
  const [halo, setHalo] = useState<{ d: string; r: number } | null>(null);
  const pushHalo = useCallback((d: string, r: number, gone: number) => {
    setHalo(gone ? null : { d, r });
  }, []);
  useAnimatedReaction(
    () => {
      const c = crease.value;
      return { d: c.land, r: c.halo, gone: c.gone };
    },
    (now, before) => {
      if (before && now.d === before.d && now.r === before.r && now.gone === before.gone) return;
      runOnJS(pushHalo)(now.d, now.r, now.gone);
    },
    [pushHalo],
  );

  const source = useMemo(() => (leaf ? { uri: leaf } : null), [leaf]);
  const bare = source ? null : wash;

  const clipper = useMemo(
    () => [styles.clipper, { width: size, height: size }],
    [size],
  );
  const page = useMemo(() => [styles.page, { width, height }], [height, width]);

  return (
    <View pointerEvents="none" style={[styles.box, { width, height }]}>
      {/* 1. The shadow the raised leaf throws on the page showing through. */}
      <Animated.View style={[clipper, castClip]}>
        <View style={[styles.band, { left: CAST_FROM, width: CAST_SPAN, height: size }]}>
          <LinearGradient stops={CAST_STOPS} angle={90} />
        </View>
      </Animated.View>

      {/* 2. The sheet still lying flat. */}
      <Animated.View style={[clipper, frontClip]}>
        <Animated.View style={[page, frontContent]}>
          <Face
            width={width}
            height={height}
            source={source}
            paper={PAGE_FLIP.paper}
            wash={bare}
            spine={spine}
          />
        </Animated.View>
      </Animated.View>

      {/* 3. The halo, over the flat sheet and under the leaf that throws it. */}
      {halo ? (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
          {HALO.map((share, index) => (
            <Path
              key={index}
              d={halo.d}
              fill="none"
              stroke="#000000"
              strokeOpacity={HALO_ALPHA * k}
              strokeWidth={2 * halo.r * share}
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      ) : null}

      {/* 4. The folded half of the same sheet, mirrored across the crease.
             The page's own box clips it to where it lands: a bound leaf
             cannot fold past its own binding. */}
      <Animated.View style={[page, backReflect]}>
        <Animated.View style={[clipper, flapClip]}>
          <Animated.View style={[page, styles.clipped, flapContent]}>
            <Face
              width={width}
              height={height}
              source={source}
              paper={PAGE_FLIP.paperBack}
              wash={bare}
              spine={spine}
              inkOpacity={0.9}
            />
            {/* The curl: a lit edge right at the crease, and the paper
                falling into its own shade behind it. In the page's own
                coordinates, so the reflection carries it over with the
                rest of the sheet. */}
            <Animated.View style={[styles.band, { width: span, height: size }, curlBand]}>
              <LinearGradient stops={curlStops} angle={90} />
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
});

/**
 * One face of the leaf: paper, the page printed on it, and the shade along the
 * spine. Memoised on exactly what it is made of, so that nothing in it — least
 * of all the picture — is touched while the fold around it moves.
 */
const Face = memo(function Face({
  width,
  height,
  source,
  paper,
  wash,
  spine,
  inkOpacity = 1,
}: {
  width: number;
  height: number;
  source: { uri: string } | null;
  paper: string;
  wash: string | null | undefined;
  spine: number;
  /** The back of the sheet shows its print a shade fainter. */
  inkOpacity?: number;
}) {
  return (
    <View style={[styles.face, { width, height, backgroundColor: paper }]}>
      {source ? (
        <Image
          source={source}
          resizeMode="stretch"
          fadeDuration={0}
          style={[StyleSheet.absoluteFill, { opacity: inkOpacity }]}
        />
      ) : null}
      {wash ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: wash, opacity: inkOpacity }]} />
      ) : null}
      <View style={[styles.spine, { width: spine }]}>
        <LinearGradient stops={SPINE_STOPS} angle={90} />
      </View>
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
  /** Laid exactly over the page box it is a fold of, and clipping to it. */
  box: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
  },
  /**
   * One side of the crease. Every transform in this file assumes the origin
   * is the top-left corner, so that they compose the way the maths does.
   */
  clipper: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
    transformOrigin: 'top left',
  },
  /** A page-sized layer inside a clipper, wearing the inverse transform. */
  page: {
    position: 'absolute',
    left: 0,
    top: 0,
    transformOrigin: 'top left',
  },
  clipped: {
    overflow: 'hidden',
  },
  /** A band of shading, along a clipper's own x axis or laid on the crease. */
  band: {
    position: 'absolute',
    left: 0,
    top: 0,
    transformOrigin: 'top left',
  },
  face: {
    overflow: 'hidden',
  },
  spine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
});
