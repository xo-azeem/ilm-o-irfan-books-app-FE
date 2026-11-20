import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isUrduTitle, readsRightToLeft, scriptOf } from './script';

describe('scriptOf', () => {
  it('tells Arabic script from Latin', () => {
    assert.equal(scriptOf('علم و عرفان'), 'arabic-script');
    assert.equal(scriptOf('Jannat Ki Talash'), 'latin');
    assert.equal(scriptOf(''), 'latin');
    assert.equal(scriptOf(null), 'latin');
    assert.equal(scriptOf(undefined), 'latin');
  });

  it('sets a mixed title in Nastaliq', () => {
    assert.equal(isUrduTitle('Tafseer — تفسیر'), true);
  });
});

describe('readsRightToLeft', () => {
  it('binds Urdu and Arabic on the right — forward turn is left to right', () => {
    // Free edge on the left; the reader carries that edge over to the right.
    assert.equal(readsRightToLeft('urdu'), true);
    assert.equal(readsRightToLeft('arabic'), true);
  });

  it('binds English on the left — forward turn is right to left', () => {
    assert.equal(readsRightToLeft('english'), false);
    // No language recorded is not a guess either way: the book turns as it
    // always has, whatever script its title is in.
    assert.equal(readsRightToLeft(null), false);
    assert.equal(readsRightToLeft(undefined), false);
  });

  it('ignores title script when deciding which way pages turn', () => {
    // A romanised Urdu title is Latin script but still an Urdu book once
    // `language` says so; an Arabic-script English title stays left-bound.
    assert.equal(readsRightToLeft('urdu'), true);
    assert.equal(isUrduTitle('Jannat Ki Talash'), false);
    assert.equal(readsRightToLeft('english'), false);
    assert.equal(isUrduTitle('تفسیر'), true);
  });
});
