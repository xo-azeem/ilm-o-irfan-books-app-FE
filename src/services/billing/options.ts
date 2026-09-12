/**
 * Pairing the catalogue's plans with the store's packages.
 *
 * Kept free of React and of the RevenueCat SDK so the matching rule can be
 * tested directly — it is the rule a mispriced or unbuyable paywall comes down
 * to, and it has two halves worth locking in:
 *
 *   · a row is only ever built from a *package*. A plan with no package behind
 *     it is not an offer, and putting one on screen means a button with no price.
 *   · the price on a row is always the store's `priceString`. `plans.price_cents`
 *     is never read here, and deliberately is not even accepted as an input —
 *     the only number the reader is ever shown is the one the store will charge.
 */

/** The fields of a store package this module needs. */
export type PackageLike = {
  id: string;
  productId: string;
  /** The store's localized price, e.g. "Rs 1,200.00". */
  priceString: string;
  /** The same amount as a number, for ordering only. */
  price: number;
  period: string | null;
  title: string;
};

/** The fields of a `plans-list` row this module needs. */
export type PlanLike = {
  code: string | null;
  name: string;
  interval: string | null;
  features: string[] | null;
  /** What the webhook matches `event.product_id` against. */
  revenuecat_product_id?: string | null;
};

export type MembershipRow<P extends PackageLike> = {
  id: string;
  name: string;
  priceString: string;
  price: number;
  interval: string | null;
  features: string[];
  period: string | null;
  purchasable: P;
  recommended: boolean;
};

/**
 * The plan a package belongs to.
 *
 * Matched on `revenuecat_product_id`, which is how the backend's webhook decides
 * the same thing — so the copy beside a price describes the plan the purchase
 * will actually grant. A product no plan claims falls back to the default plan
 * code, mirroring the webhook's own fallback, and failing that to nothing: the
 * package is still perfectly buyable, it just carries the store's own title.
 */
export function planForPackage<P extends PackageLike, T extends PlanLike>(
  item: P,
  plans: T[] | undefined,
  defaultPlanCode: string,
): T | undefined {
  return (
    plans?.find(plan => plan.revenuecat_product_id === item.productId) ??
    plans?.find(plan => plan.code === defaultPlanCode)
  );
}

function featuresOf(plan: PlanLike | undefined): string[] {
  return (plan?.features ?? []).filter((feature): feature is string =>
    Boolean(feature),
  );
}

/** One row per purchasable package, in the order the store offered them. */
export function buildMembershipRows<P extends PackageLike, T extends PlanLike>(
  packages: P[],
  plans: T[] | undefined,
  defaultPlanCode: string,
): MembershipRow<P>[] {
  return packages.map(item => {
    const plan = planForPackage(item, plans, defaultPlanCode);

    return {
      id: item.id,
      name: plan?.name ?? item.title,
      priceString: item.priceString,
      price: item.price,
      interval: plan?.interval ?? null,
      features: featuresOf(plan),
      period: item.period,
      purchasable: item,
      recommended: plan?.code === defaultPlanCode,
    };
  });
}

/**
 * The cheapest row, for a "from …" line.
 *
 * Ordered on the numeric price rather than on the offering's own order, which is
 * the admin's display order and says nothing about cost — so "from" cannot end
 * up naming the dearest plan.
 */
export function cheapestRow<R extends { price: number }>(rows: R[]): R | null {
  return rows.reduce<R | null>(
    (lowest, row) =>
      lowest == null || row.price < lowest.price ? row : lowest,
    null,
  );
}

/** The pitch bullets to show before a plan is picked. */
export function defaultFeatures<T extends PlanLike>(
  plans: T[] | undefined,
  defaultPlanCode: string,
): string[] {
  return featuresOf(
    plans?.find(plan => plan.code === defaultPlanCode) ?? plans?.[0],
  );
}
