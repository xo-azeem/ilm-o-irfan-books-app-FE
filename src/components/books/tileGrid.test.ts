import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TILE_GAP, tileGridFor } from './tileGrid';
import { layout } from '@/theme/palette';

const inner = (width: number) => width - layout.screenPadding * 2;

describe('tileGridFor', () => {
  it('gives a phone three columns that meet both margins', () => {
    for (const width of [360, 393, 412, 430]) {
      const grid = tileGridFor(width);
      assert.equal(grid.columns, 3, `${width}`);
      const used = grid.tileWidth * 3 + TILE_GAP * 2;
      assert.ok(used <= inner(width), `${width}: ${used} > ${inner(width)}`);
      assert.ok(
        inner(width) - used < 3,
        `${width}: gap of ${inner(width) - used}`,
      );
    }
  });

  it('gives a tablet more, no narrower than a phone tile', () => {
    const phone = tileGridFor(412).tileWidth;
    for (const width of [600, 768, 1024]) {
      const grid = tileGridFor(width);
      assert.ok(grid.columns > 3, `${width}`);
      assert.ok(grid.tileWidth >= phone - 20, `${width}: ${grid.tileWidth}`);
    }
  });

  it('never divides by zero or goes negative', () => {
    const grid = tileGridFor(0);
    assert.equal(grid.columns, 3);
    assert.equal(grid.tileWidth, 0);
  });
});
