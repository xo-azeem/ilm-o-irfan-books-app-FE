import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { anyColumnLike, likePattern } from './search';

describe('likePattern', () => {
  it('wraps a plain term in wildcards', () => {
    assert.equal(likePattern('ali'), '%ali%');
  });

  it('trims and collapses whitespace', () => {
    assert.equal(likePattern('  ali   khan '), '%ali khan%');
  });

  it('is null for an empty or blank term', () => {
    assert.equal(likePattern(''), null);
    assert.equal(likePattern('   '), null);
  });

  it("escapes LIKE's own wildcards so they match literally", () => {
    assert.equal(likePattern('100%'), '%100\\%%');
    assert.equal(likePattern('a_b'), '%a\\_b%');
    assert.equal(likePattern('c\\d'), '%c\\\\d%');
  });

  it('drops the characters that would break the PostgREST filter grammar', () => {
    assert.equal(likePattern('khan, ali (dr)'), '%khan ali dr%');
    assert.equal(likePattern('"quoted"'), '%quoted%');
  });

  it('is null when only grammar characters were typed', () => {
    assert.equal(likePattern(',()'), null);
  });

  it('caps the length of the term', () => {
    const pattern = likePattern('x'.repeat(500));
    assert.equal(pattern, `%${'x'.repeat(100)}%`);
  });

  it('keeps Urdu script intact', () => {
    assert.equal(likePattern('علم'), '%علم%');
  });
});

describe('anyColumnLike', () => {
  it('tests the pattern against every column', () => {
    assert.equal(
      anyColumnLike('ali', ['email', 'full_name']),
      'email.ilike.%ali%,full_name.ilike.%ali%',
    );
  });

  it('is null when there is nothing to search', () => {
    assert.equal(anyColumnLike(' ', ['email']), null);
  });
});
