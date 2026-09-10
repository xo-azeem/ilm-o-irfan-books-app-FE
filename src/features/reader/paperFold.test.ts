import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { foldFrame, half, type Pt } from './paperFold';

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
  const pts = Array.from(path.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)).map(m => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }));
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
      const across = (x: number, y: number) => (x - m.x) * -n.y + (y - m.y) * n.x;

      assert.ok(Math.abs(along(ours.cast[0], ours.cast[1]) - -3) < 1e-9, `cast from ${where}`);
      assert.ok(Math.abs(along(ours.cast[2], ours.cast[3]) - 105) < 1e-9, `cast to ${where}`);
      assert.ok(Math.abs(across(ours.cast[0], ours.cast[1])) < 1e-9, `cast square ${where}`);

      assert.ok(Math.abs(along(ours.curl[0], ours.curl[1]) - -26) < 1e-9, `curl from ${where}`);
      assert.ok(Math.abs(across(ours.curl[0], ours.curl[1])) < 1e-9, `curl square ${where}`);
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
      assert.equal(Math.round(areaOf(flatSheet.flat)), whole, `flat sheet at cy=${cy}`);
      assert.equal(flatSheet.gone, true, `flat sheet at cy=${cy}`);

      // Turned right over, no part of the leaf is on the page at all — neither
      // the half still lying flat nor the half that folded. The crease has
      // reached the spine, so both clips have collapsed onto it: the design
      // still calls that a leaf and draws it, and drawing a polygon of no area
      // is how it comes to nothing.
      assert.equal(Math.round(areaOf(turnedOver.flat)), 0, `turned at cy=${cy}`);
      assert.equal(Math.round(areaOf(turnedOver.land)), 0, `turned at cy=${cy}`);
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
        assert.ok(side <= 0.1, `land at ${p.x},${p.y} is ${side} past the crease`);
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
