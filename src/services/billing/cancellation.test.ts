import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  cancellationAvailability,
  isRenewing,
  isStoreManaged,
  manageSubscriptionsUrl,
  storeName,
  type CancellationFacts,
} from './cancellation';

function facts(overrides: Partial<CancellationFacts> = {}): CancellationFacts {
  return {
    active: true,
    status: 'active',
    store: 'play_store',
    cancelRequestedAt: null,
    ...overrides,
  };
}

describe('cancellationAvailability', () => {
  it('offers to cancel a renewing store membership', () => {
    assert.equal(cancellationAvailability(facts()), 'cancellable');
    assert.equal(
      cancellationAvailability(facts({ store: 'app_store', status: 'trial' })),
      'cancellable',
    );
  });

  it('keeps offering while a card is failing — the store still renews it', () => {
    assert.equal(
      cancellationAvailability(facts({ status: 'grace' })),
      'cancellable',
    );
    assert.equal(
      cancellationAvailability(facts({ status: 'billing_issue' })),
      'cancellable',
    );
  });

  it('is pending once the reader asked and the store has not confirmed', () => {
    assert.equal(
      cancellationAvailability(
        facts({ cancelRequestedAt: '2026-09-16T12:00:00Z' }),
      ),
      'pending',
    );
  });

  it('is ending once the store confirmed, whatever the request column says', () => {
    assert.equal(
      cancellationAvailability(facts({ status: 'cancelled' })),
      'ending',
    );
    assert.equal(
      cancellationAvailability(
        facts({
          status: 'cancelled',
          cancelRequestedAt: '2026-09-16T12:00:00Z',
        }),
      ),
      'ending',
    );
    // A comp an admin marked cancelled is still "ending" — there is a date.
    assert.equal(
      cancellationAvailability(
        facts({ status: 'cancelled', store: 'promotional' }),
      ),
      'ending',
    );
  });

  it('points a comp or a Stripe row at support, never at a store sheet', () => {
    assert.equal(
      cancellationAvailability(facts({ store: 'promotional' })),
      'not_store_managed',
    );
    assert.equal(
      cancellationAvailability(facts({ store: 'stripe' })),
      'not_store_managed',
    );
    assert.equal(
      cancellationAvailability(facts({ store: 'unknown' })),
      'not_store_managed',
    );
    assert.equal(
      cancellationAvailability(facts({ store: null })),
      'not_store_managed',
    );
  });

  it('draws nothing when there is no subscription to cancel', () => {
    // An admin: canAccessPremium is true, but `active` — the subscription
    // alone — is false, and that is the flag this reads.
    assert.equal(
      cancellationAvailability(facts({ active: false, status: null })),
      'none',
    );
    // Lapsed: the row exists but no longer grants access.
    assert.equal(
      cancellationAvailability(facts({ active: false, status: 'expired' })),
      'none',
    );
    // Inconsistent input — active with an expired status — still draws
    // nothing rather than a cancel button for a dead subscription.
    assert.equal(
      cancellationAvailability(facts({ status: 'expired' })),
      'none',
    );
  });
});

describe('store helpers', () => {
  it('knows which stores have a sheet', () => {
    assert.equal(isStoreManaged('app_store'), true);
    assert.equal(isStoreManaged('play_store'), true);
    assert.equal(isStoreManaged('promotional'), false);
    assert.equal(isStoreManaged(undefined), false);
  });

  it('mirrors the backend renewing set', () => {
    for (const status of ['active', 'trial', 'grace', 'billing_issue']) {
      assert.equal(isRenewing(status), true, status);
    }
    assert.equal(isRenewing('cancelled'), false);
    assert.equal(isRenewing('expired'), false);
    assert.equal(isRenewing(null), false);
  });

  it('names the store and its subscriptions page', () => {
    assert.equal(storeName('app_store'), 'the App Store');
    assert.equal(storeName('play_store'), 'Google Play');
    assert.equal(storeName('promotional'), 'your app store');
    assert.match(manageSubscriptionsUrl('app_store') ?? '', /apps\.apple\.com/);
    assert.match(
      manageSubscriptionsUrl('play_store') ?? '',
      /play\.google\.com/,
    );
    assert.equal(manageSubscriptionsUrl('promotional'), null);
  });
});
