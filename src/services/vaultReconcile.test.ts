import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { planReconcile } from './vaultReconcile';

const T1 = '2026-09-01T00:00:00Z';
const T2 = '2026-09-10T00:00:00Z';

describe('planReconcile', () => {
  it('keeps a copy whose stamp matches the server', () => {
    const plan = planReconcile(
      [{ bookId: 'a', revision: T1 }],
      new Map([['a', { pdfUpdatedAt: T1 }]]),
    );
    assert.deepEqual(plan, { revoke: [], adopt: [] });
  });

  it('revokes a copy of a book the server no longer has', () => {
    const plan = planReconcile([{ bookId: 'a', revision: T1 }], new Map());
    assert.deepEqual(plan.revoke, [{ bookId: 'a', reason: 'removed' }]);
    assert.deepEqual(plan.adopt, []);
  });

  it('revokes a copy whose file has been replaced', () => {
    const plan = planReconcile(
      [{ bookId: 'a', revision: T1 }],
      new Map([['a', { pdfUpdatedAt: T2 }]]),
    );
    assert.deepEqual(plan.revoke, [{ bookId: 'a', reason: 'replaced' }]);
  });

  it('adopts the server stamp for a copy made before stamps existed', () => {
    const plan = planReconcile(
      [{ bookId: 'a', revision: null }],
      new Map([['a', { pdfUpdatedAt: T2 }]]),
    );
    assert.deepEqual(plan.revoke, []);
    assert.deepEqual(plan.adopt, [{ bookId: 'a', revision: T2 }]);
  });

  it('still revokes an unstamped copy of a deleted book', () => {
    const plan = planReconcile([{ bookId: 'a', revision: null }], new Map());
    assert.deepEqual(plan.revoke, [{ bookId: 'a', reason: 'removed' }]);
  });

  it('judges each copy on its own', () => {
    const plan = planReconcile(
      [
        { bookId: 'same', revision: T1 },
        { bookId: 'gone', revision: T1 },
        { bookId: 'newer', revision: T1 },
        { bookId: 'legacy', revision: null },
      ],
      new Map([
        ['same', { pdfUpdatedAt: T1 }],
        ['newer', { pdfUpdatedAt: T2 }],
        ['legacy', { pdfUpdatedAt: T1 }],
      ]),
    );
    assert.deepEqual(plan.revoke, [
      { bookId: 'gone', reason: 'removed' },
      { bookId: 'newer', reason: 'replaced' },
    ]);
    assert.deepEqual(plan.adopt, [{ bookId: 'legacy', revision: T1 }]);
  });

  it('is a no-op with nothing held', () => {
    assert.deepEqual(
      planReconcile([], new Map([['a', { pdfUpdatedAt: T1 }]])),
      {
        revoke: [],
        adopt: [],
      },
    );
  });
});
