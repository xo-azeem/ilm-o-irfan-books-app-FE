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
  it('turns a recorded Urdu or Arabic book the other way', () => {
    assert.equal(readsRightToLeft('urdu'), true);
    assert.equal(readsRightToLeft('arabic'), true);
  });

  it('turns everything else the way an English book turns', () => {
    assert.equal(readsRightToLeft('english'), false);
    // No language recorded is not a guess either way: the book turns as it
    // always has, whatever script its title is in.
    assert.equal(readsRightToLeft(null), false);
    assert.equal(readsRightToLeft(undefined), false);
  });
});
