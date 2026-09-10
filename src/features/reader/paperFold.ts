/**
 * The geometry of a sheet of paper folding over.
 *
 * A leaf does not turn on a hinge. Grab a page anywhere and pull, and the sheet
 * creases along the perpendicular bisector of the corner you took hold of and
 * the point you have carried it to — everything past that line is the same
 * paper, mirrored across it, and everything short of it is still lying flat
 * with the next page showing through wherever the sheet has lifted.
 *
 * That one line is the whole model. Everything here follows from it: the two
 * halves of the sheet are half-planes cut by the crease, the folded half is a
 * reflection in it, and both shadows are gradients measured out from it.
 *
 * All of it runs on the UI thread, a frame at a time, so every function here is
 * a worklet and none of them may reach for anything that is not a number.
 *
 * Coordinates are the page's own: 0,0 is its top-left corner and `W`,`H` its
 * bottom-right. The spine is always the left edge.
 */

/** A point on the page. */
export type Pt = { x: number; y: number };

/** An empty path — what a degenerate polygon clips away to. */
const NOTHING = 'M0 0Z';

/**
 * Sutherland–Hodgman, one edge at a time.
 *
 * Keeps whichever side of the line through `m` with normal `n` that `s` points
 * at, cutting new vertices where the polygon crosses it.
 */
export function half(poly: Pt[], m: Pt, n: Pt, s: number): Pt[] {
  'worklet';
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const da = s * ((a.x - m.x) * n.x + (a.y - m.y) * n.y);
    const db = s * ((b.x - m.x) * n.x + (b.y - m.y) * n.y);
    if (da >= 0) out.push(a);
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

/** A polygon as an SVG path. Anything degenerate clips away to nothing. */
export function polyPath(poly: Pt[]): string {
  'worklet';
  if (poly.length < 3) return NOTHING;
  let d = `M${poly[0].x.toFixed(1)} ${poly[0].y.toFixed(1)}`;
  for (let i = 1; i < poly.length; i += 1) {
    d += `L${poly[i].x.toFixed(1)} ${poly[i].y.toFixed(1)}`;
  }
  return `${d}Z`;
}

/**
 * Paper does not stretch.
 *
 * The grabbed corner stays inside a disc of one page-width around the spine
 * corner it is bound at, which is what keeps the leaf part of the book rather
 * than a sheet sliding around loose over it.
 */
export function tether(x: number, y: number, cy: number, w: number): Pt {
  'worklet';
  const dy = y - cy;
  const d = Math.hypot(x, dy);
  if (d <= w || d === 0) return { x, y };
  const k = w / d;
  return { x: x * k, y: cy + dy * k };
}

/**
 * How far the turn has come: 0 lying flat, 1 turned right over.
 *
 * Forward the corner travels from the right edge to a page-width past the
 * spine; back it comes the other way, which is why the two read off the same
 * span from opposite ends.
 */
export function progressOf(x: number, dir: number, w: number): number {
  'worklet';
  const t = dir === 1 ? (w - x) / (2 * w) : (x + w) / (2 * w);
  return Math.min(1, Math.max(0, t));
}

/** How far past the crease the cast shadow's axis runs, in points. */
export const CAST_FROM = -3;
export const CAST_TO = 105;
export const CAST_SPAN = CAST_TO - CAST_FROM;

/** ...and where the curl's starts, short of the crease, to catch the light. */
export const CURL_FROM = -26;

/**
 * The curl's axis is as long as the page's own diagonal, which is the furthest
 * the crease can ever be from a corner. The design measures it to the exact
 * width of the gradient line instead — a hair shorter at most angles — but the
 * far end of that ramp is its slowest, flattest part and the difference does
 * not survive being drawn.
 */
export function curlSpan(w: number, h: number): number {
  'worklet';
  return Math.hypot(w, h) - CURL_FROM;
}

/**
 * Everything the renderer needs for one frame of the fold.
 *
 * The two shadows are why the crease is measured rather than eyeballed. A
 * gradient in SVG is an axis and a set of stops along it; the design gives its
 * stops as distances from the crease in points, so the axis is laid out from
 * the crease along its own normal and the stops fall at fixed fractions of it.
 * That way only four numbers move per frame and the stops never do — which
 * matters, because a gradient's stops are flattened into its parent when it
 * renders and cannot be animated on the UI thread at all.
 */
export type FoldFrame = {
  /** The sheet still lying flat: the part that has not folded. */
  flat: string;
  /** Where the folded half comes down, clipped to the page it lands on. */
  land: string;
  /** The reflection in the crease, as an SVG matrix. */
  matrix: number[];
  /** The axis of the shadow the raised leaf throws on the page below. */
  cast: number[];
  /** How much of that shadow there is: none flat, most of it half-way up. */
  castOpacity: number;
  /** The axis of the curl on the folded half: its lit crease, and its shade. */
  curl: number[];
  /** How wide a halo the raised leaf throws around its own edges. */
  halo: number;
  /** Nothing has folded: the sheet is flat and there is no leaf to draw. */
  flatOut: boolean;
  /** The leaf has folded right over: nothing of it is left on the page. */
  gone: boolean;
};

const NO_FOLD: number[] = [1, 0, 0, 1, 0, 0];
const NO_AXIS: number[] = [0, 0, 0, 0];

export function foldFrame(
  w: number,
  h: number,
  cy: number,
  fx: number,
  fy: number,
): FoldFrame {
  'worklet';

  // The corner in the hand at rest, and where it has been carried to.
  const ox = w;
  const oy = cy;

  if (w <= 0 || h <= 0 || (Math.abs(fx - ox) < 1.5 && Math.abs(fy - oy) < 1.5)) {
    // Nothing has folded, so the whole sheet is still lying flat — and that
    // matters far more than it looks. A turn both starts and ends in this
    // state, and the flat sheet covering the page outright is what the stage
    // changes the document view underneath.
    return {
      flat: w > 0 && h > 0 ? polyPath([
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: h },
        { x: 0, y: h },
      ]) : NOTHING,
      land: NOTHING,
      matrix: NO_FOLD,
      cast: NO_AXIS,
      castOpacity: 0,
      curl: NO_AXIS,
      halo: 0,
      flatOut: true,
      gone: true,
    };
  }

  let nx = ox - fx;
  let ny = oy - fy;
  const len = Math.hypot(nx, ny) || 1;
  nx /= len;
  ny /= len;

  const m = { x: (ox + fx) / 2, y: (oy + fy) / 2 };
  const n = { x: nx, y: ny };

  const rect: Pt[] = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];

  // The two halves of the sheet: what has lifted, and what is still down.
  const flap = half(rect, m, n, 1);
  const flatPoly = half(rect, m, n, -1);

  // How far up the fold is, as the light sees it: nothing flat, most of it
  // half-way, and nothing again once the leaf has gone right over.
  //
  // Which way the reader is going is not passed in and does not need to be.
  // Read forward, a fold coming back measures as its own complement — and this
  // is a sine of it, which is symmetric about the half-way mark, so both
  // directions come out at the same brightness for the same amount of fold.
  const s = Math.sin(progressOf(fx, 1, w) * Math.PI);

  if (flap.length < 3) {
    return {
      flat: polyPath(flatPoly),
      land: NOTHING,
      matrix: NO_FOLD,
      cast: NO_AXIS,
      castOpacity: 0,
      curl: NO_AXIS,
      halo: 0,
      flatOut: false,
      gone: true,
    };
  }

  // A bound leaf cannot fold past its own binding, so the folded half is
  // clipped again by where it lands: mirror it, trim it to the page, and what
  // survives is the only part of it the reader can see. Without this the paper
  // hangs over the spine into the room.
  const d = 2 * (m.x * nx + m.y * ny);
  const mirror = (p: Pt): Pt => {
    'worklet';
    const t = 2 * ((p.x - m.x) * nx + (p.y - m.y) * ny);
    return { x: p.x - t * nx, y: p.y - t * ny };
  };

  let landPoly = flap.map(mirror);
  landPoly = half(landPoly, { x: 0, y: 0 }, { x: 1, y: 0 }, 1);
  landPoly = half(landPoly, { x: w, y: 0 }, { x: -1, y: 0 }, 1);
  landPoly = half(landPoly, { x: 0, y: 0 }, { x: 0, y: 1 }, 1);
  landPoly = half(landPoly, { x: 0, y: h }, { x: 0, y: -1 }, 1);

  const gone = landPoly.length < 3;
  const span = curlSpan(w, h);

  return {
    flat: polyPath(flatPoly),
    land: gone ? NOTHING : polyPath(landPoly),
    // Reflection in the crease. The same six numbers CSS wants, in the same
    // order, because SVG and CSS agree on what a 2D matrix is.
    matrix: [
      1 - 2 * nx * nx,
      -2 * nx * ny,
      -2 * nx * ny,
      1 - 2 * ny * ny,
      d * nx,
      d * ny,
    ],
    cast: [
      m.x + CAST_FROM * nx,
      m.y + CAST_FROM * ny,
      m.x + CAST_TO * nx,
      m.y + CAST_TO * ny,
    ],
    castOpacity: Math.min(1, s * 1.15),
    curl: [
      m.x + CURL_FROM * nx,
      m.y + CURL_FROM * ny,
      m.x + (CURL_FROM + span) * nx,
      m.y + (CURL_FROM + span) * ny,
    ],
    halo: 10 + 12 * s,
    flatOut: false,
    gone,
  };
}
