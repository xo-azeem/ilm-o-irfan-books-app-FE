import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildMembershipRows,
  cheapestRow,
  defaultFeatures,
  planForPackage,
  type PackageLike,
  type PlanLike,
} from './options';

const DEFAULT_CODE = 'premium_monthly';

const monthly: PackageLike = {
  id: '$rc_monthly',
  productId: 'ilm_premium_monthly',
  priceString: 'Rs 490.00',
  price: 490,
  period: 'P1M',
  title: 'Premium (Ilm o Irfan)',
};

const yearly: PackageLike = {
  id: '$rc_annual',
  productId: 'ilm_premium_yearly',
  priceString: 'Rs 3,900.00',
  price: 3900,
  period: 'P1Y',
  title: 'Premium Yearly (Ilm o Irfan)',
};

const plans: PlanLike[] = [
  {
    code: 'premium_yearly',
    name: 'Yearly',
    interval: 'year',
    features: ['Every book, unlimited', 'Offline downloads'],
    revenuecat_product_id: 'ilm_premium_yearly',
  },
  {
    code: DEFAULT_CODE,
    name: 'Monthly',
    interval: 'month',
    features: ['Every book, unlimited'],
    revenuecat_product_id: 'ilm_premium_monthly',
  },
];

describe('matching a store package to a plan', () => {
  it('matches on revenuecat_product_id, as the webhook does', () => {
    assert.equal(planForPackage(yearly, plans, DEFAULT_CODE)?.code, 'premium_yearly');
    assert.equal(planForPackage(monthly, plans, DEFAULT_CODE)?.code, DEFAULT_CODE);
  });

  it('falls back to the default plan code, mirroring the webhook', () => {
    const unknown: PackageLike = { ...monthly, productId: 'ilm_something_else' };

    assert.equal(planForPackage(unknown, plans, DEFAULT_CODE)?.code, DEFAULT_CODE);
  });

  it('answers undefined when there are no plans at all', () => {
    assert.equal(planForPackage(monthly, [], DEFAULT_CODE), undefined);
    assert.equal(planForPackage(monthly, undefined, DEFAULT_CODE), undefined);
  });
});

describe('building the paywall rows', () => {
  it('pairs the admin copy with the store price', () => {
    const [first, second] = buildMembershipRows([yearly, monthly], plans, DEFAULT_CODE);

    assert.equal(first.name, 'Yearly');
    assert.equal(first.priceString, 'Rs 3,900.00');
    assert.equal(first.interval, 'year');
    assert.deepEqual(first.features, ['Every book, unlimited', 'Offline downloads']);

    assert.equal(second.name, 'Monthly');
    assert.equal(second.priceString, 'Rs 490.00');
    assert.equal(second.recommended, true);
  });

  it('keeps the store order, so the admin decides how plans are listed', () => {
    const rows = buildMembershipRows([monthly, yearly], plans, DEFAULT_CODE);

    assert.deepEqual(
      rows.map(row => row.id),
      ['$rc_monthly', '$rc_annual'],
    );
  });

  it('builds a row from a package with no plan behind it', () => {
    // The package is still buyable; it just carries the store's own title.
    const [row] = buildMembershipRows([monthly], [], DEFAULT_CODE);

    assert.equal(row.name, 'Premium (Ilm o Irfan)');
    assert.equal(row.priceString, 'Rs 490.00');
    assert.equal(row.interval, null);
    assert.deepEqual(row.features, []);
    assert.equal(row.recommended, false);
  });

  it('never invents a row for a plan with no package', () => {
    // A plan nobody can buy is not an offer: a row for it would be a button
    // with no price and no product behind it.
    assert.deepEqual(buildMembershipRows([], plans, DEFAULT_CODE), []);
  });

  it('carries the package the row was built from, for the purchase call', () => {
    // The row's id and its package must describe the same product, or the sheet
    // opens on a plan other than the one the reader chose.
    const rows = buildMembershipRows([monthly, yearly], plans, DEFAULT_CODE);

    assert.deepEqual(
      rows.map(row => [row.id, row.purchasable.productId, row.priceString]),
      [
        ['$rc_monthly', 'ilm_premium_monthly', 'Rs 490.00'],
        ['$rc_annual', 'ilm_premium_yearly', 'Rs 3,900.00'],
      ],
    );
  });

  it('drops empty feature strings rather than drawing blank bullets', () => {
    const sparse: PlanLike[] = [
      { ...plans[1], features: ['Every book, unlimited', '', null as unknown as string] },
    ];
    const [row] = buildMembershipRows([monthly], sparse, DEFAULT_CODE);

    assert.deepEqual(row.features, ['Every book, unlimited']);
  });
});

describe('the "from …" price', () => {
  it('is the cheapest, not the first the store listed', () => {
    const rows = buildMembershipRows([yearly, monthly], plans, DEFAULT_CODE);

    assert.equal(cheapestRow(rows)?.priceString, 'Rs 490.00');
  });

  it('is null when there is nothing to sell', () => {
    assert.equal(cheapestRow([]), null);
  });
});

describe('the default pitch bullets', () => {
  it('prefers the default plan', () => {
    assert.deepEqual(defaultFeatures(plans, DEFAULT_CODE), ['Every book, unlimited']);
  });

  it('falls back to the first plan when the default is absent', () => {
    assert.deepEqual(defaultFeatures([plans[0]], DEFAULT_CODE), [
      'Every book, unlimited',
      'Offline downloads',
    ]);
  });

  it('is empty rather than undefined with no plans', () => {
    assert.deepEqual(defaultFeatures(undefined, DEFAULT_CODE), []);
  });
});
