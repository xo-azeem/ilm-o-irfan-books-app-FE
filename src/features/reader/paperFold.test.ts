import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  clipperSize,
  foldFrame,
  foldSummary,
  half,
  sweepProgress,
  type Pt,
} from './paperFold';

/**
 * The fold, as the design has it.
 *
 * A transcription of `Paper Flip.dc.html`'s own `apply()`, kept deliberately
 * literal — same names, same order, same operations — so that what these tests
 * compare is the port and not a second opinion about the geometry. If the two
 * ever disagree it is the port that is wrong.
 */
function design(W: number, H: number, cy: number, Fx: number, Fy: number) {
  const O = { x: W, y: cy };
  const F = { x: Fx, y: Fy };

  if (Math.abs(F.x - O.x) < 1.5 && Math.abs(F.y - O.y) < 1.5) {
    return { flat: null, land: null, matrix: null, m: null, n: null };
  }

  let nx = O.x - F.x;
  let ny = O.y - F.y;
  const len = Math.hypot(nx, ny) || 1;
  nx /= len;
  ny /= len;
  const M = { x: (O.x + F.x) / 2, y: (O.y + F.y) / 2 };
  const n = { x: nx, y: ny };

  const rect: Pt[] = [
    { x: 0, y: 0 },
    { x: W, y: 0 },
    { x: W, y: H },
    { x: 0, y: H },
  ];
  const flap = half(rect, M, n, 1);
  const flat = half(rect, M, n, -1);

  if (flap.length < 3) return { flat, land: null, matrix: null, m: M, n };

  const mirror = (p: Pt) => {
    const t = 2 * ((p.x - M.x) * nx + (p.y - M.y) * ny);
    return { x: p.x - t * nx, y: p.y - t * ny };
  };

  let land = flap.map(mirror);
  land = half(land, { x: 0, y: 0 }, { x: 1, y: 0 }, 1);
  land = half(land, { x: W, y: 0 }, { x: -1, y: 0 }, 1);
  land = half(land, { x: 0, y: 0 }, { x: 0, y: 1 }, 1);
  land = half(land, { x: 0, y: H }, { x: 0, y: -1 }, 1);

  const d = 2 * (M.x * nx + M.y * ny);
  const matrix = [
    1 - 2 * nx * nx,
    -2 * nx * ny,
    -2 * nx * ny,
    1 - 2 * ny * ny,
    d * nx,
    d * ny,
  ];

  return { flat, land: land.length < 3 ? null : land, matrix, m: M, n };
}

/** The design writes its polygons to one decimal place; so does the port. */
function pathOf(poly: Pt[] | null) {
  if (!poly || poly.length < 3) return 'M0 0Z';
  return (
    poly
      .map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join('') + 'Z'
  );
}

/** How much of the page a clip path covers, by the shoelace formula. */
function areaOf(path: string) {
  const pts = Array.from(path.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)).map(
    m => ({
      x: Number(m[1]),
      y: Number(m[2]),
    }),
  );
  let sum = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

/** The page the design is drawn against. */
const W = 386;
const H = 579;

/** Corners, edges and the middle — every way a sheet can be taken hold of. */
function sweep() {
  const cases: { cy: number; fx: number; fy: number }[] = [];
  for (const cy of [0, H]) {
    for (let fx = -W; fx <= W; fx += W / 8) {
      for (const dy of [-H, -H / 2, -40, 0, 40, H / 2, H]) {
        cases.push({ cy, fx, fy: cy + dy });
      }
    }
  }
  return cases;
}

describe('paper fold geometry', () => {
  it('creases where the design creases it', () => {
    for (const { cy, fx, fy } of sweep()) {
      const ours = foldFrame(W, H, cy, fx, fy);
      const theirs = design(W, H, cy, fx, fy);
      const where = `cy=${cy} F=(${fx.toFixed(1)},${fy.toFixed(1)})`;

      if (theirs.flat === null) {
        // Nothing has folded. The design leaves the sheet unclipped; the port
        // says the same thing by clipping it to the whole page.
        assert.equal(ours.flatOut, true, where);
        assert.equal(areaOf(ours.flat).toFixed(0), String(W * H), where);
        continue;
      }

      assert.equal(ours.flat, pathOf(theirs.flat), `flat at ${where}`);
      assert.equal(ours.land, pathOf(theirs.land), `land at ${where}`);
      assert.equal(ours.gone, theirs.land === null, `gone at ${where}`);

      if (theirs.matrix) {
        ours.matrix.forEach((value, i) => {
          assert.ok(
            Math.abs(value - theirs.matrix![i]) < 1e-9,
            `matrix[${i}] at ${where}`,
          );
        });
      }
    }
  });

  it('measures both shadows out from the crease itself', () => {
    for (const { cy, fx, fy } of sweep()) {
      const theirs = design(W, H, cy, fx, fy);
      if (!theirs.n || !theirs.m) continue;
      const ours = foldFrame(W, H, cy, fx, fy);
      const { m, n } = theirs;
      const where = `cy=${cy} F=(${fx.toFixed(1)},${fy.toFixed(1)})`;

      // Each axis starts and ends a stated number of points from the crease,
      // along its normal — which is what lets the stops stay put.
      const along = (x: number, y: number) => (x - m.x) * n.x + (y - m.y) * n.y;
      const across = (x: number, y: number) =>
        (x - m.x) * -n.y + (y - m.y) * n.x;

      assert.ok(
        Math.abs(along(ours.cast[0], ours.cast[1]) - -3) < 1e-9,
        `cast from ${where}`,
      );
      assert.ok(
        Math.abs(along(ours.cast[2], ours.cast[3]) - 105) < 1e-9,
        `cast to ${where}`,
      );
      assert.ok(
        Math.abs(across(ours.cast[0], ours.cast[1])) < 1e-9,
        `cast square ${where}`,
      );

      assert.ok(
        Math.abs(along(ours.curl[0], ours.curl[1]) - -26) < 1e-9,
        `curl from ${where}`,
      );
      assert.ok(
        Math.abs(across(ours.curl[0], ours.curl[1])) < 1e-9,
        `curl square ${where}`,
      );
    }
  });

  it('starts and ends every turn either covering the page or off it', () => {
    const whole = W * H;

    for (const cy of [0, H]) {
      // Forward: the corner rests at the free edge and is carried past the
      // spine. Back: it starts folded flat against the spine and unrolls.
      const flatSheet = foldFrame(W, H, cy, W, cy);
      const turnedOver = foldFrame(W, H, cy, -W, cy);

      // A sheet lying flat covers the page outright, which is what the stage
      // changes the page underneath.
      assert.equal(
        Math.round(areaOf(flatSheet.flat)),
        whole,
        `flat sheet at cy=${cy}`,
      );
      assert.equal(flatSheet.gone, true, `flat sheet at cy=${cy}`);

      // Turned right over, no part of the leaf is on the page at all — neither
      // the half still lying flat nor the half that folded. The crease has
      // reached the spine, so both clips have collapsed onto it: the design
      // still calls that a leaf and draws it, and drawing a polygon of no area
      // is how it comes to nothing.
      assert.equal(
        Math.round(areaOf(turnedOver.flat)),
        0,
        `turned at cy=${cy}`,
      );
      assert.equal(
        Math.round(areaOf(turnedOver.land)),
        0,
        `turned at cy=${cy}`,
      );
    }
  });

  it('lands the folded half on the sheet it left, never off it', () => {
    for (const { cy, fx, fy } of sweep()) {
      const theirs = design(W, H, cy, fx, fy);
      if (!theirs.n || !theirs.m) continue;
      const { land, gone } = foldFrame(W, H, cy, fx, fy);
      if (gone) continue;
      const { m, n } = theirs;

      Array.from(land.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)).forEach(v => {
        const p = { x: Number(v[1]), y: Number(v[2]) };
        // Everything the fold brings down is on the flat side of the crease.
        // A leaf that came down on the lifted side would be paper folded onto
        // paper that is no longer there.
        const side = (p.x - m.x) * n.x + (p.y - m.y) * n.y;
        assert.ok(
          side <= 0.1,
          `land at ${p.x},${p.y} is ${side} past the crease`,
        );
      });
    }
  });

  it('never lets a bound leaf fold past its own binding', () => {
    for (const { cy, fx, fy } of sweep()) {
      const { land, gone } = foldFrame(W, H, cy, fx, fy);
      if (gone) continue;
      Array.from(land.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)).forEach(m => {
        const x = Number(m[1]);
        const y = Number(m[2]);
        assert.ok(x >= -0.1 && x <= W + 0.1, `land x=${x} off the page`);
        assert.ok(y >= -0.1 && y <= H + 0.1, `land y=${y} off the page`);
      });
    }
  });
});

// ---- the fold as native views -----------------------------------------------

import {
  bandXf,
  clipperXf,
  contentXf,
  creaseOf,
  reflectXf,
  type Xf,
} from './paperFold';

/**
 * What a native view does with a transform list and `transformOrigin: '0 0'`:
 * reads it right to left, the last entry meeting the point first.
 */
function apply(xf: Xf, p: Pt): Pt {
  let { x, y } = p;
  for (let i = xf.length - 1; i >= 0; i -= 1) {
    const step = xf[i];
    if ('translateX' in step) x += step.translateX;
    else if ('translateY' in step) y += step.translateY;
    else if ('scaleX' in step) x *= step.scaleX;
    else {
      const th = parseFloat(step.rotate);
      const c = Math.cos(th);
      const s = Math.sin(th);
      [x, y] = [x * c - y * s, x * s + y * c];
    }
  }
  return { x, y };
}

const SIZE = 2 * (W + H);

describe('paper fold as views', () => {
  it('leaves what is inside a clipper exactly where it was on the page', () => {
    for (const { cy, fx, fy } of sweep()) {
      const crease = creaseOf(W, H, cy, fx, fy);
      if (!crease) continue;
      for (const side of [1, -1] as const) {
        const outer = clipperXf(crease.mx, crease.my, crease.th, side, SIZE);
        const inner = contentXf(crease.mx, crease.my, crease.th, side, SIZE);
        for (const p of [
          { x: 0, y: 0 },
          { x: W, y: 0 },
          { x: W / 3, y: H / 2 },
          { x: W, y: H },
        ]) {
          const q = apply(outer, apply(inner, p));
          assert.ok(
            Math.abs(q.x - p.x) < 1e-6 && Math.abs(q.y - p.y) < 1e-6,
            `${side} ${JSON.stringify(p)}`,
          );
        }
      }
    }
  });

  it('puts the edge of each clipper on the crease, and its body on its own side', () => {
    for (const { cy, fx, fy } of sweep()) {
      const crease = creaseOf(W, H, cy, fx, fy);
      const theirs = design(W, H, cy, fx, fy);
      if (!crease || !theirs.n || !theirs.m) continue;
      const { m, n } = theirs;
      const along = (p: Pt) => (p.x - m.x) * n.x + (p.y - m.y) * n.y;

      for (const side of [1, -1] as const) {
        const outer = clipperXf(crease.mx, crease.my, crease.th, side, SIZE);
        const edgeX = side === 1 ? 0 : SIZE;
        for (const ly of [0, SIZE / 2, SIZE]) {
          assert.ok(
            Math.abs(along(apply(outer, { x: edgeX, y: ly }))) < 1e-6,
            'edge on crease',
          );
        }
        const inside = apply(outer, { x: SIZE / 2, y: SIZE / 2 });
        assert.ok(Math.sign(along(inside)) === side, `body on side ${side}`);
      }
    }
  });

  it('reflects the corner in the hand onto where it has been carried', () => {
    for (const { cy, fx, fy } of sweep()) {
      const crease = creaseOf(W, H, cy, fx, fy);
      if (!crease) continue;
      const mirror = reflectXf(crease.mx, crease.my, crease.th);
      const carried = apply(mirror, { x: W, y: cy });
      assert.ok(
        Math.abs(carried.x - fx) < 1e-6 && Math.abs(carried.y - fy) < 1e-6,
        `${fx},${fy}`,
      );
      // A reflection is its own inverse.
      const back = apply(mirror, carried);
      assert.ok(Math.abs(back.x - W) < 1e-6 && Math.abs(back.y - cy) < 1e-6);
    }
  });

  it('starts a band of shading the stated distance from the crease', () => {
    for (const { cy, fx, fy } of sweep()) {
      const crease = creaseOf(W, H, cy, fx, fy);
      const theirs = design(W, H, cy, fx, fy);
      if (!crease || !theirs.n || !theirs.m) continue;
      const { m, n } = theirs;
      const along = (p: Pt) => (p.x - m.x) * n.x + (p.y - m.y) * n.y;
      const band = bandXf(crease.mx, crease.my, crease.th, -26, SIZE);
      assert.ok(Math.abs(along(apply(band, { x: 0, y: 0 })) - -26) < 1e-6);
      assert.ok(Math.abs(along(apply(band, { x: 40, y: SIZE })) - 14) < 1e-6);
    }
  });
});

describe('sweepProgress', () => {
  /** Where the corner is after the finger has travelled `travel` points. */
  const cornerAfter = (pageWidth: number, travel: number, amplify = 2) =>
    pageWidth - amplify * travel;

  it('costs the same sweep however far the page runs past the screen', () => {
    // The reader drags a quarter of the glass. The page may be drawn at the
    // frame's width or half again as wide — the turn must feel identical.
    const screen = 393;
    const travel = screen * 0.25;
    const tight = sweepProgress(cornerAfter(393, travel), 1, 393, screen);
    const filled = sweepProgress(cornerAfter(570, travel), 1, 570, screen);
    assert.ok(Math.abs(tight - filled) < 1e-9, `${tight} vs ${filled}`);
  });

  it('reads the sweep as the fraction of the screen the finger crossed', () => {
    const screen = 400;
    // Amplified 2×, a 50pt travel puts the corner 100pt in on a 600pt page.
    const swept = sweepProgress(cornerAfter(600, 50), 1, 600, screen);
    assert.ok(Math.abs(swept - 50 / screen) < 1e-9, String(swept));
  });

  it('is the same coming back as going forward', () => {
    const screen = 393;
    const page = 570;
    const travel = 80;
    const forward = sweepProgress(page - 2 * travel, 1, page, screen);
    const back = sweepProgress(-page + 2 * travel, -1, page, screen);
    assert.ok(Math.abs(forward - back) < 1e-9, `${forward} vs ${back}`);
  });

  it('measures against the page when the page is the narrower of the two', () => {
    // A landscape page on a tablet is fitted whole, narrower than the glass;
    // the fold cannot be dragged off paper that is not there.
    const swept = sweepProgress(300 - 2 * 75, 1, 300, 1000);
    assert.ok(Math.abs(swept - 75 / 300) < 1e-9, String(swept));
  });

  it('never leaves 0..1, and answers an unmeasured stage with nothing', () => {
    assert.equal(sweepProgress(0, 1, 0, 393), 0);
    assert.equal(sweepProgress(-9999, 1, 570, 393), 1);
    assert.equal(sweepProgress(9999, 1, 570, 393), 0);
  });
});

/**
 * The renderer's hot path.
 *
 * `PaperFold` redraws the fold on every frame of every turn, and for a long
 * time it did that by calling `foldFrame` — which builds two SVG path strings
 * and five polygons — and then reading two numbers off the result. The rest
 * was computed and dropped, sixty times a second, while the page it was
 * computed from grew wide enough to fill the screen.
 *
 * `foldSummary` is that path with the dead work taken out. These hold it to
 * the only thing that matters: it must say exactly what `foldFrame` said.
 */
describe('foldSummary matches foldFrame, cheaply', () => {
  const SHAPES = [
    { w: 393, h: 820, label: 'phone, fitted' },
    { w: 578, h: 820, label: 'phone, filling the screen' },
    { w: 865, h: 820, label: 'a page wider than it is tall' },
    { w: 800, h: 1180, label: 'tablet' },
    { w: 344, h: 796, label: 'narrow foldable' },
  ];

  it('agrees on `gone` and on the shadow, everywhere on the page', () => {
    for (const { w, h, label } of SHAPES) {
      for (const cy of [0, h / 2, h]) {
        // Right across the sweep, and past both ends of it.
        for (let step = -12; step <= 24; step += 1) {
          const fx = w - (step / 12) * w;
          for (const fy of [0, cy, h * 0.37, h]) {
            const frame = foldFrame(w, h, cy, fx, fy);
            const summary = foldSummary(w, h, cy, fx, fy);
            const where = `${label} cy=${cy} fx=${fx.toFixed(1)} fy=${fy}`;
            assert.equal(summary.gone, frame.gone, `${where}: gone`);
            assert.ok(
              Math.abs(summary.cast - frame.castOpacity) < 1e-12,
              `${where}: cast ${summary.cast} != ${frame.castOpacity}`,
            );
          }
        }
      }
    }
  });

  it('answers a sheet nobody has touched the way the full frame does', () => {
    const frame = foldFrame(400, 800, 800, 400, 800);
    const summary = foldSummary(400, 800, 800, 400, 800);
    assert.equal(summary.gone, frame.gone);
    assert.equal(summary.cast, frame.castOpacity);
  });

  it('has nothing to draw on a stage with no size', () => {
    assert.deepEqual(foldSummary(0, 0, 0, 0, 0), { gone: true, cast: 0 });
    assert.deepEqual(foldSummary(400, 0, 0, 10, 10), { gone: true, cast: 0 });
  });
});

/**
 * The clipper squares.
 *
 * Each half of the fold is drawn by a square view laid along the crease with
 * `overflow: hidden`. It has to reach every corner of the page from wherever
 * the crease is; any larger and the compositor is blending pixels that can
 * never show, on five views, every frame.
 */
describe('clipperSize covers the page and no more', () => {
  const SHAPES = [
    { w: 393, h: 820 },
    { w: 578, h: 820 },
    { w: 865, h: 820 },
    { w: 800, h: 1180 },
    { w: 1280, h: 740 },
    { w: 344, h: 796 },
  ];

  it('reaches every corner from any crease the page can have', () => {
    for (const { w, h } of SHAPES) {
      const size = clipperSize(w, h);
      // The crease midpoint is the midpoint of the resting corner and the
      // carried one, so it can sit anywhere on or just off the page. The
      // square spans `size` along the normal and `size/2` either side of the
      // midpoint across it, so `size/2` must clear the furthest corner.
      for (const mx of [0, w / 2, w]) {
        for (const my of [0, h / 2, h]) {
          for (const [cx, cyy] of [
            [0, 0],
            [w, 0],
            [w, h],
            [0, h],
          ]) {
            const reach = Math.hypot(cx - mx, cyy - my);
            assert.ok(
              size / 2 >= reach - 1e-9,
              `${w}x${h}: half-side ${size / 2} short of corner at ${reach}`,
            );
          }
        }
      }
    }
  });

  it('is smaller than the box it replaced, which is the point', () => {
    for (const { w, h } of SHAPES) {
      const now = clipperSize(w, h);
      const before = 2 * (w + h);
      assert.ok(now <= before, `${w}x${h}: ${now} > ${before}`);
      // Area is what the compositor pays for.
      const saved = 1 - (now * now) / (before * before);
      assert.ok(saved > 0.25, `${w}x${h}: only ${(saved * 100).toFixed(0)}% off`);
    }
  });
});
