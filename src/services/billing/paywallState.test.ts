import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isHostedPaywallOnly,
  isPaywallPending,
  isPaywallUnavailable,
  paywallCtaKind,
  type PaywallOfferInput,
} from './paywallState';

function input(
  overrides: Partial<PaywallOfferInput> = {},
): PaywallOfferInput {
  return {
    available: true,
    offeringPending: false,
    offeringError: false,
    packageCount: 0,
    optionCount: 0,
    ...overrides,
  };
}

describe('paywallCtaKind', () => {
  it('is unavailable when this build has no billing key', () => {
    assert.equal(
      paywallCtaKind(input({ available: false, offeringPending: true })),
      'unavailable',
    );
  });

  it('stays loading while the offering is in flight, even with empty options', () => {
    assert.equal(
      paywallCtaKind(input({ offeringPending: true, optionCount: 0 })),
      'loading',
    );
    assert.equal(isPaywallPending(input({ offeringPending: true })), true);
    assert.equal(isPaywallUnavailable(input({ offeringPending: true })), false);
  });

  it('shows Subscribe once packages have become quoteable rows', () => {
    assert.equal(
      paywallCtaKind(input({ packageCount: 2, optionCount: 2 })),
      'subscribe',
    );
  });

  it('falls back to the hosted paywall when packages exist but rows do not', () => {
    const hosted = input({ packageCount: 2, optionCount: 0 });
    assert.equal(paywallCtaKind(hosted), 'hosted');
    assert.equal(isHostedPaywallOnly(hosted), true);
  });

  it('is unavailable after a settled empty offering or store error', () => {
    assert.equal(paywallCtaKind(input({ packageCount: 0, optionCount: 0 })), 'unavailable');
    assert.equal(
      paywallCtaKind(input({ offeringError: true, packageCount: 1, optionCount: 1 })),
      'unavailable',
    );
    assert.equal(
      isPaywallUnavailable(input({ packageCount: 0, optionCount: 0 })),
      true,
    );
  });
});
