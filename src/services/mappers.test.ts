import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  authorName,
  centsToAmount,
  formatReadTime,
  isEntitlementActive,
  mapCatalogBook,
  stripStoragePrefix,
} from './mappers';

describe('catalog mappers', () => {
  it('strips seeded storage prefixes', () => {
    assert.equal(stripStoragePrefix('covers/foo.webp', 'covers'), 'foo.webp');
    assert.equal(stripStoragePrefix('pdfs/book.pdf', 'pdfs'), 'book.pdf');
    assert.equal(stripStoragePrefix('book.pdf', 'pdfs'), 'book.pdf');
  });

  it('formats read time without inventing values', () => {
    assert.equal(formatReadTime(null), 'Read at your pace');
    assert.equal(formatReadTime(18), '18 min read');
    assert.equal(formatReadTime(240), '4 hr read');
  });

  it('converts cents using the row currency amount', () => {
    assert.equal(centsToAmount(149900), 1499);
    assert.equal(centsToAmount(699), 6.99);
  });

  it('treats entitlements as active only with a live expiry', () => {
    assert.equal(isEntitlementActive('active', null), true);
    assert.equal(isEntitlementActive('expired', null), false);
    assert.equal(
      isEntitlementActive('active', '2020-01-01T00:00:00.000Z', Date.parse('2026-01-01')),
      false,
    );
  });

  it('reads author names from object or nested array joins', () => {
    assert.equal(authorName({ name: 'Al-Ghazali' }), 'Al-Ghazali');
    assert.equal(authorName([{ name: 'Ibn Qayyim' }]), 'Ibn Qayyim');
    assert.equal(authorName(null), 'Unknown');
  });

  it('maps backend book rows onto the existing UI model', () => {
    const book = mapCatalogBook({
      id: '33333333-3333-3333-3333-333333333333',
      title: 'Revival of the Sciences',
      author_name: 'Al-Ghazali',
      cover_path: 'covers/ihya.webp',
      cover_color: '#1F4D3A',
      cover_color_dark: '#163628',
      rating: 4.9,
      tag: 'Classic',
      genre: 'Spirituality',
      read_time_minutes: 360,
      price_cents: 0,
      currency: 'USD',
      format: 'Digital edition',
      is_premium: false,
      description: 'A classic of the spiritual sciences.',
    }, 'https://example.test/ihya.webp');

    assert.equal(book.id, '33333333-3333-3333-3333-333333333333');
    assert.equal(book.author, 'Al-Ghazali');
    assert.equal(book.readTime, '6 hr read');
    assert.equal(book.price, 0);
    assert.equal(book.coverUrl, 'https://example.test/ihya.webp');
    assert.equal(book.isPremium, false);
    assert.equal(book.rating, 4.9);
  });

  it('coerces PostgREST numeric strings so UI toFixed does not crash', () => {
    const book = mapCatalogBook({
      id: '1',
      title: 'Test',
      author_name: 'Author',
      cover_path: null,
      cover_color: null,
      cover_color_dark: null,
      rating: '4.80',
      tag: null,
      genre: null,
      read_time_minutes: 12,
      price_cents: 0,
      currency: 'USD',
      format: 'Digital edition',
      is_premium: false,
    });

    assert.equal(book.rating, 4.8);
    assert.equal(book.rating?.toFixed(1), '4.8');
  });
});
