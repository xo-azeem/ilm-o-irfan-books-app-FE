import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MAX_PAGE_FILL, fillLimitFor, measureSideMargins } from './pageInk';

function page(
  width: number,
  height: number,
  paint: (x: number, y: number) => number | null,
): Uint8Array {
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = paint(x, y) ?? 235;
      const i = (y * width + x) * 4;
      rgba[i] = v;
      rgba[i + 1] = v;
      rgba[i + 2] = v;
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

describe('measureSideMargins', () => {
  it('finds the block of type and reports the paper either side', () => {
    // 50 wide: type from column 10 to 39 on every other row.
    const rgba = page(50, 64, (x, y) =>
      x >= 10 && x < 40 && y % 2 === 0 ? 30 : null,
    );
    const m = measureSideMargins(rgba, 50, 64);
    assert.ok(m);
    assert.equal(m.left, 0.2);
    assert.equal(m.right, 0.2);
  });

  it('ignores a running head and a folio', () => {
    // Body from 10..39; one line of head across 2..47 on row 3 only.
    const rgba = page(50, 64, (x, y) => {
      if (y === 3 && x >= 2 && x < 48) return 30;
      return x >= 10 && x < 40 && y > 8 && y % 2 === 0 ? 30 : null;
    });
    const m = measureSideMargins(rgba, 50, 64);
    assert.ok(m);
    assert.equal(m.left, 0.2);
    assert.equal(m.right, 0.2);
  });

  it('is null for a blank page', () => {
    assert.equal(
      measureSideMargins(
        page(50, 64, () => null),
        50,
        64,
      ),
      null,
    );
  });

  it('works on a dark page tone', () => {
    const rgba = page(50, 64, (x, y) =>
      x >= 5 && x < 45 && y % 2 === 0 ? 200 : 20,
    );
    const m = measureSideMargins(rgba, 50, 64);
    assert.ok(m);
    assert.equal(m.left, 0.1);
    assert.equal(m.right, 0.1);
  });
});

describe('fillLimitFor', () => {
  it('is the fallback when nothing is known', () => {
    assert.equal(fillLimitFor(null, 1.18), 1.18);
  });

  it('lets a wide margin fill more, capped', () => {
    assert.ok(
      Math.abs(fillLimitFor({ left: 0.2, right: 0.2 }, 1.18) - 1 / 0.64) < 1e-9,
    );
    assert.equal(fillLimitFor({ left: 0.4, right: 0.4 }, 1.18), MAX_PAGE_FILL);
  });

  it('never clips type: a tight page draws at the frame width', () => {
    assert.equal(fillLimitFor({ left: 0.01, right: 0.3 }, 1.18), 1);
  });

  it('is governed by the smaller margin', () => {
    const limit = fillLimitFor({ left: 0.11, right: 0.3 }, 1.18);
    // 11% margin, 2% in hand → 9% may go past each edge.
    assert.ok(Math.abs(limit - 1 / 0.82) < 1e-9);
  });
});
