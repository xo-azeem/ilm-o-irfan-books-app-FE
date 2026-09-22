import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { asciiHeaderValue } from './headerValue';

/** Every character a header value may carry. */
const isHeaderSafe = (value: string) => /^[\x20-\x7e]*$/.test(value);

describe('asciiHeaderValue', () => {
  it('turns the label separator into a hyphen', () => {
    assert.equal(
      asciiHeaderValue('IlmOIrfan/1.0.0 (Xiaomi M2007J3SY · Android 12)'),
      'IlmOIrfan/1.0.0 (Xiaomi M2007J3SY - Android 12)',
    );
  });

  it('keeps an accented brand readable rather than dropping the word', () => {
    assert.equal(asciiHeaderValue('Téléphone Pro'), 'Telephone Pro');
  });

  it('leaves a plain value alone', () => {
    const plain = 'IlmOIrfan/1.0.0 (Pixel 7 - Android 14)';
    assert.equal(asciiHeaderValue(plain), plain);
  });

  it('is header-safe for anything a device name could hold', () => {
    for (const value of [
      'Xiaomi M2007J3SY · Android 12',
      '小米 Redmi Note 9',
      'Sony Xperia™ 1 VI',
      'iPhone · iOS 18.2',
      'emoji 📱 phone',
      'tab\tand\nnewline',
    ]) {
      const safe = asciiHeaderValue(value);
      assert.ok(isHeaderSafe(safe), `${value} → ${safe}`);
    }
  });

  it('can come back empty, which callers have to expect', () => {
    assert.equal(asciiHeaderValue('小米'), '');
  });
});
