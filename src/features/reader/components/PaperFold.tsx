import { memo, useCallback, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';

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

/** The ink of the book: what its shading is drawn in. */
const INK = '#30302B';

/**
 * The shadow the raised leaf throws on the page below, out from the crease.
 *
 * This and the curl are the only shading a fold gets. The design also drew a
 * halo around the raised leaf's outer edges; it went, and not only for looks.
 * An outline that changes every frame can only be drawn as a path, and a path
 * can only be updated from the JavaScript thread — a render of this component
 * on every frame of a turn, which is where the stutter came from.
 */
const CAST_STOPS: GradientStop[] = [
  { offset: 0, color: '#000000', opacity: 0 },
  {
    offset: (1 - CAST_FROM) / CAST_SPAN,
    color: '#000000',
    opacity: 0.5 * PAGE_FLIP.shadowStrength,
  },
  {
    offset: (34 - CAST_FROM) / CAST_SPAN,
    color: '#000000',
    opacity: 0.18 * PAGE_FLIP.shadowStrength,
  },
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
   * A document view can only draw the page it is on, and a fold needs the page
   * lying flat while the page it opens onto is drawn underneath. So the leaf
   * is a picture of a page and the page beneath is the live document view,
   * seen through everything here that is not painted. Null while a page has
   * never been captured, which leaves the leaf as blank paper rather than as
   * a hole in the book. Only the front of the sheet wears it; the back is
   * blank paper.
   */
  leaf: string | null;
  /**
   * Whether the flat part of the leaf must hide the page beneath it.
   *
   * It must once the document view has been moved on to the next page. Until
   * then the page beneath *is* the leaf, and the sheet is left see-through
   * where it lies flat rather than painted as blank paper — so a fold whose
   * picture has not arrived yet does not blank the page the reader is reading
   * for the frames it takes to get there.
   */
  opaque: boolean;
  /**
   * The leaf's picture has been drawn — or could not be, which for the stage
   * comes to the same thing: there is nothing further to wait for before the
   * page underneath can change.
   */
  onLeafDrawn?: () => void;
  /**
   * The page underneath, as a picture, on the lifted side of the crease.
   *
   * A leaf coming back is the page before, which has usually never been on
   * screen to be photographed — so it is the live document view instead,
   * showing through the see-through front of the leaf, and the page it is
   * unrolling over is the one that has to be a picture: of the page in hand,
   * taken as the reader touched it, and laid wherever the sheet has not yet
   * reached. Null going forward, when the live view is the page underneath.
   */
  under?: string | null;
  /** That picture has been drawn, or could not be. As `onLeafDrawn`. */
  onUnderDrawn?: () => void;
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
 * sheet still lying flat, then the folded half itself. The page underneath is
 * mostly not drawn here at all — it is the live document view, showing
 * through wherever this is transparent. The one exception is a leaf coming
 * back, where the page underneath is a picture (`under`) and goes in first.
 */
export const PaperFold = memo(function PaperFold({
  width,
  height,
  fold,
  leaf,
  opaque,
  onLeafDrawn,
  under = null,
  onUnderDrawn,
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
    };
  }, [width, height]);

  // The sheet still lying flat: the half of the page against the normal.
  //
  // Nothing at all once the fold is no longer live. A crease parked off the
  // page lays the whole sheet flat — the right thing at the start of a turn,
  // when the sheet is the page — but the stage clears the fold a frame before
  // React takes these views down, and in that frame the whole flat sheet
  // would paint the page just turned away from over the page turned to.
  const frontClip = useAnimatedStyle(() => {
    const c = crease.value;
    return {
      opacity: c.on ? 1 : 0,
      transform: clipperXf(c.mx, c.my, c.th, -1, size) as Xf,
    };
  });
  const frontContent = useAnimatedStyle(() => {
    const c = crease.value;
    return { transform: contentXf(c.mx, c.my, c.th, -1, size) as Xf };
  });

  // The page underneath, when it is a picture: the half of the page along
  // the normal, where the sheet has lifted away. Hidden with the front once
  // the fold is no longer live, for the same reason.
  const underClip = useAnimatedStyle(() => {
    const c = crease.value;
    return {
      opacity: c.on ? 1 : 0,
      transform: clipperXf(c.mx, c.my, c.th, 1, size) as Xf,
    };
  });
  const underContent = useAnimatedStyle(() => {
    const c = crease.value;
    return { transform: contentXf(c.mx, c.my, c.th, 1, size) as Xf };
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

  const source = useMemo(() => (leaf ? { uri: leaf } : null), [leaf]);
  const underSource = useMemo(() => (under ? { uri: under } : null), [under]);
  const bare = source ? null : wash;

  // Which picture the front of the sheet has finished drawing. Kept as the
  // picture's own address rather than a flag, so a picture that arrives
  // mid-fold — onto a leaf that started as blank paper — starts the wait over
  // rather than inheriting the answer for the one before it.
  const [drawnUri, setDrawnUri] = useState<string | null>(null);
  const drawn = source !== null && drawnUri === source.uri;
  const handleFrontDrawn = useCallback(() => {
    setDrawnUri(leaf);
    onLeafDrawn?.();
  }, [leaf, onLeafDrawn]);
  // A picture that will not draw is blank paper after all, and the stage need
  // not wait on it any further.
  const handleFrontFailed = useCallback(() => {
    onLeafDrawn?.();
  }, [onLeafDrawn]);

  // Blank paper stands in for a picture only once it has to. Before the page
  // underneath has changed, the flat part of the sheet is the page itself,
  // and painting paper over it would blank the page for the frames it takes
  // the picture to arrive.
  const frontPaper = opaque || drawn ? PAGE_FLIP.paper : 'transparent';

  const clipper = useMemo(() => [styles.clipper, { width: size, height: size }], [size]);
  const page = useMemo(() => [styles.page, { width, height }], [height, width]);

  return (
    <View pointerEvents="none" style={[styles.box, { width, height }]}>
      {/* 0. The page underneath, when it is a picture: exactly as it was
             photographed, tone and all, so nothing here tints it twice. */}
      {underSource ? (
        <Animated.View style={[clipper, underClip]}>
          <Animated.View style={[page, underContent]}>
            <Image
              source={underSource}
              resizeMode="stretch"
              fadeDuration={0}
              style={StyleSheet.absoluteFill}
              onLoad={onUnderDrawn}
              onError={onUnderDrawn}
            />
          </Animated.View>
        </Animated.View>
      ) : null}

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
            paper={frontPaper}
            wash={opaque ? bare : null}
            spine={spine}
            onDrawn={handleFrontDrawn}
            onFailed={handleFrontFailed}
          />
        </Animated.View>
      </Animated.View>

      {/* 3. The folded half of the same sheet, mirrored across the crease.
             The page's own box clips it to where it lands: a bound leaf
             cannot fold past its own binding. The back of the sheet is blank
             paper: what is printed on the other side of a page is not this
             page mirrored, and the reader has not been shown it yet. */}
      <Animated.View style={[page, backReflect]}>
        <Animated.View style={[clipper, flapClip]}>
          <Animated.View style={[page, styles.clipped, flapContent]}>
            <Face
              width={width}
              height={height}
              source={null}
              paper={PAGE_FLIP.paperBack}
              wash={wash}
              spine={spine}
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
  onDrawn,
  onFailed,
}: {
  width: number;
  height: number;
  /** The page printed on the face, or null for blank paper. */
  source: { uri: string } | null;
  paper: string;
  wash: string | null | undefined;
  spine: number;
  /** The picture is on screen. */
  onDrawn?: () => void;
  /** The picture could not be drawn; the face is blank paper after all. */
  onFailed?: () => void;
}) {
  return (
    <View style={[styles.face, { width, height, backgroundColor: paper }]}>
      {source ? (
        <Image
          source={source}
          resizeMode="stretch"
          fadeDuration={0}
          style={StyleSheet.absoluteFill}
          onLoad={onDrawn}
          onError={onFailed}
        />
      ) : null}
      {wash ? <View style={[StyleSheet.absoluteFill, { backgroundColor: wash }]} /> : null}
      <View style={[styles.spine, { width: spine }]}>
        <LinearGradient stops={SPINE_STOPS} angle={90} />
      </View>
    </View>
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
