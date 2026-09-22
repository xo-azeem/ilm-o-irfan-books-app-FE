import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pageBox } from './pageBox';
import { fillLimitFor, MAX_PAGE_FILL } from './pageInk';

/**
 * Real frames, in the points the stage would measure — the screen less the
 * status bar and the reader's own foot. Phones, a small phone, tablets,
 * landscape and a split screen, so nothing below can pass by being tuned to
 * one shape.
 */
const FRAMES = {
  'Redmi 9 (1080×2400 @2.75)': { width: 393, height: 820 },
  'Pixel 4a (1080×2340 @2.75)': { width: 393, height: 799 },
  'small phone (720×1280 @2)': { width: 360, height: 587 },
  'iPhone 15 Pro Max': { width: 430, height: 856 },
  'tall foldable, closed': { width: 344, height: 796 },
  'foldable, open': { width: 674, height: 782 },
  'tablet portrait': { width: 800, height: 1180 },
  'tablet landscape': { width: 1280, height: 740 },
  'split screen, short': { width: 393, height: 380 },
};

/** Page shapes, width ÷ height: A4/A5, US trade, a square-ish plate, landscape. */
const ASPECTS = {
  A4: 210 / 297,
  A5: 148 / 210,
  trade: 6 / 9,
  square: 1,
  landscape: 4 / 3,
};

/** A generous book, a tight one, and one never measured. */
const LIMITS = {
  'wide margins (18%)': fillLimitFor({ left: 0.18, right: 0.18 }, 1.18),
  'tight margins (8%)': fillLimitFor({ left: 0.08, right: 0.08 }, 1.18),
  unmeasured: 1.18,
};

describe('pageBox across devices', () => {
  it('never leaves a band at the sides, and never overflows the height', () => {
    for (const [screen, frame] of Object.entries(FRAMES)) {
      for (const [shape, aspect] of Object.entries(ASPECTS)) {
        for (const [book, limit] of Object.entries(LIMITS)) {
          const box = pageBox(frame, aspect, limit);
          const where = `${screen} / ${shape} / ${book}`;
          assert.ok(box, where);
          // A page proportionally wider than the screen — every book on
          // every phone — is grown until it fills the height, so there is
          // never a band at the sides. A page proportionally narrower than
          // the screen (a tall book on a wide foldable) is the other way
          // round: it is fitted whole, because filling the width would push
          // its first and last lines off the top and bottom.
          const screenAspect = frame.width / frame.height;
          if (aspect > screenAspect + 1e-9) {
            assert.ok(box.width >= frame.width - 1e-9, `${where}: side band`);
          } else {
            assert.ok(
              Math.abs(box.height - frame.height) < 1e-6,
              `${where}: not fitted to the height`,
            );
          }
          assert.ok(box.height <= frame.height + 1e-9, `${where}: too tall`);
          assert.ok(box.width > 0 && box.height > 0, where);
          // The page keeps its own shape — never stretched to fit.
          assert.ok(
            Math.abs(box.width / box.height - aspect) < 1e-9,
            `${where}: aspect ${box.width / box.height} != ${aspect}`,
          );
        }
      }
    }
  });

  it('fills the height outright when the margins allow it', () => {
    // A phone and a book with 18% margins: the page should reach top and
    // bottom, which is the whole point of drawing it past the edges.
    const frame = FRAMES['Redmi 9 (1080×2400 @2.75)'];
    const box = pageBox(frame, ASPECTS.A5, LIMITS['wide margins (18%)']);
    assert.ok(box);
    assert.equal(Math.round(box.height), frame.height);
  });

  it('stops short rather than clipping the type of a tight book', () => {
    const frame = FRAMES['Redmi 9 (1080×2400 @2.75)'];
    const box = pageBox(frame, ASPECTS.A5, LIMITS['tight margins (8%)']);
    assert.ok(box);
    // Short of the frame, and no wider than that book's margins permit.
    assert.ok(box.height < frame.height);
    assert.ok(box.width <= frame.width * LIMITS['tight margins (8%)'] + 1e-9);
  });

  it('never asks for more width than filling the height needs', () => {
    // Even a book measured as almost all margin only grows until the page is
    // as tall as the frame — the cap is a guard, not a target.
    const frame = FRAMES['Redmi 9 (1080×2400 @2.75)'];
    const box = pageBox(frame, ASPECTS.A5, MAX_PAGE_FILL);
    assert.ok(box);
    assert.equal(Math.round(box.height), frame.height);
    assert.ok(box.width < frame.width * MAX_PAGE_FILL);
  });

  it('clips a landscape page by its margins, never by more', () => {
    // A map or a plate on a portrait phone would need nearly three times the
    // width to fill the height. It gets what its margins allow and no more,
    // which is what keeps the picture on the page.
    const frame = FRAMES['Redmi 9 (1080×2400 @2.75)'];
    const limit = LIMITS['tight margins (8%)'];
    const box = pageBox(frame, ASPECTS.landscape, limit);
    assert.ok(box);
    assert.ok(box.width <= frame.width * limit + 1e-9);
    assert.ok(box.height < frame.height);
  });

  it('answers a rotation with a different box, from the same numbers', () => {
    const portrait = pageBox(
      { width: 393, height: 820 },
      ASPECTS.A5,
      LIMITS['wide margins (18%)'],
    );
    const landscape = pageBox(
      { width: 820, height: 393 },
      ASPECTS.A5,
      LIMITS['wide margins (18%)'],
    );
    assert.ok(portrait && landscape);
    assert.equal(Math.round(portrait.height), 820);
    // Turned on its side there is height to spare, so the page is fitted
    // whole and centred instead of clipped.
    assert.equal(Math.round(landscape.height), 393);
    assert.ok(landscape.width < 820);
  });

  it('has nothing to draw before the stage has been measured', () => {
    assert.equal(pageBox({ width: 0, height: 0 }, ASPECTS.A5, 1.2), null);
    assert.equal(pageBox({ width: 393, height: 820 }, 0, 1.2), null);
    assert.equal(pageBox({ width: 393, height: 820 }, NaN, 1.2), null);
  });
});
