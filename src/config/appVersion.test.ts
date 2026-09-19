import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { compareVersions, isBelowMinimum } from './appVersion';

describe('compareVersions', () => {
  it('orders by each slot in turn', () => {
    assert.ok(compareVersions('1.2.3', '1.2.4') < 0);
    assert.ok(compareVersions('1.3.0', '1.2.9') > 0);
    assert.ok(compareVersions('2.0.0', '1.99.99') > 0);
    assert.equal(compareVersions('1.2.3', '1.2.3'), 0);
  });

  it('treats a missing slot as zero', () => {
    assert.equal(compareVersions('1.2', '1.2.0'), 0);
    assert.ok(compareVersions('1.2', '1.2.1') < 0);
  });

  it('ignores a leading v and surrounding whitespace', () => {
    assert.equal(compareVersions(' v1.0.0 ', '1.0.0'), 0);
  });
});

describe('isBelowMinimum', () => {
  it('is false when no floor is set', () => {
    assert.equal(isBelowMinimum(null, '1.0.0'), false);
    assert.equal(isBelowMinimum('', '1.0.0'), false);
    assert.equal(isBelowMinimum('   ', '1.0.0'), false);
  });

  it('is false for a floor that is not a version — a typo must not lock readers out', () => {
    assert.equal(isBelowMinimum('latest', '1.0.0'), false);
    assert.equal(isBelowMinimum('1.2.x', '1.0.0'), false);
    assert.equal(isBelowMinimum('1.0.0-beta', '1.0.0'), false);
  });

  it('is true only when the build is older than the floor', () => {
    assert.equal(isBelowMinimum('1.1.0', '1.0.0'), true);
    assert.equal(isBelowMinimum('1.0.0', '1.0.0'), false);
    assert.equal(isBelowMinimum('0.9.9', '1.0.0'), false);
  });
});
