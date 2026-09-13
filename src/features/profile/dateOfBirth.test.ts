import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatDateOfBirth, parseDateOfBirth } from './dateOfBirth';

describe('parseDateOfBirth', () => {
  it('accepts the forms a reader is likely to type', () => {
    for (const input of [
      '1996-03-14',
      '14/03/1996',
      '14-03-1996',
      '14.03.1996',
      '14 March 1996',
      '14th march 1996',
      '14 Mar 1996',
      'March 14, 1996',
      'Mar 14 1996',
      '  14 March 1996  ',
    ]) {
      assert.equal(parseDateOfBirth(input), '1996-03-14', input);
    }
  });

  it('zero-pads single digits', () => {
    assert.equal(parseDateOfBirth('3/1/2001'), '2001-01-03');
    assert.equal(parseDateOfBirth('3 January 2001'), '2001-01-03');
  });

  it('refuses what the column would refuse', () => {
    for (const input of [
      '',
      'yesterday',
      '31 February 1996',
      '14 Marchember 1996',
      '14/13/1996',
      '96-03-14',
      '14 March 96',
    ]) {
      assert.equal(parseDateOfBirth(input), null, input);
    }
  });
});

describe('formatDateOfBirth', () => {
  it('reads the column back the way the reader wrote it', () => {
    assert.equal(formatDateOfBirth('1996-03-14'), '14 March 1996');
    assert.equal(formatDateOfBirth('2001-01-03'), '3 January 2001');
    // A Postgres timestamp, should one ever arrive, still reads as its day.
    assert.equal(formatDateOfBirth('1996-03-14T00:00:00Z'), '14 March 1996');
  });

  it('is transparent to the empty and the unknown', () => {
    assert.equal(formatDateOfBirth(null), '');
    assert.equal(formatDateOfBirth(''), '');
    assert.equal(formatDateOfBirth('sometime in spring'), 'sometime in spring');
  });

  it('round-trips through the parser', () => {
    assert.equal(
      parseDateOfBirth(formatDateOfBirth('1996-03-14')),
      '1996-03-14',
    );
  });
});
