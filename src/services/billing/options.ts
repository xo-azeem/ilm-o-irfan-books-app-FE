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
  /** Shared / legacy SKU — webhook also checks store-specific columns. */
  revenuecat_product_id?: string | null;
  app_store_product_id?: string | null;
  play_store_product_id?: string | null;
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

/** Which store the packages came from. `unknown` outside iOS and Android. */
export type BillingStore = 'app_store' | 'play_store' | 'unknown';

type PlanProductColumn =
  'revenuecat_product_id' | 'app_store_product_id' | 'play_store_product_id';

/**
 * The columns a product id may be matched against, in order of preference.
 *
 * Quoted from the backend's `preferredPlanProductColumns` so the label beside a
 * price names the plan the webhook will actually grant. A known store never
 * falls back to the *other* store's column: App Store and Play SKUs are
 * independent namespaces, so a match there is a coincidence rather than the
 * plan the reader is buying. The shared `revenuecat_product_id` alias stays in
 * every list — it is what a catalogue that has not split its SKUs still uses.
 */
function productColumnsFor(store: BillingStore): PlanProductColumn[] {
  if (store === 'app_store') {
    return ['app_store_product_id', 'revenuecat_product_id'];
  }
  if (store === 'play_store') {
    return ['play_store_product_id', 'revenuecat_product_id'];
  }
  return [
    'revenuecat_product_id',
    'app_store_product_id',
    'play_store_product_id',
  ];
}

/**
 * The plan a package belongs to.
 *
 * Matched the way the backend webhook matches — store-specific SKU first, then
 * the shared alias — so the copy beside a price describes the plan the purchase
 * will actually grant. A product no plan claims falls back to the default plan
 * code, mirroring the webhook's own fallback, and failing that to nothing: the
 * package is still perfectly buyable, it just carries the store's own title.
 *
 * Column order matters rather than merely which columns are searched: a plan
 * that claims this id on the store's own column wins over one that only claims
 * it on the shared alias, which is the webhook's resolution too.
 *
 * Apple Pay and Google Pay are payment methods inside the App Store / Play
 * sheets — not separate product ids.
 */
/** A store product id, then the same without its `:basePlan` / `:offer` suffixes. */
export function productIdCandidates(productId: string): string[] {
  const out = [productId];
  let cut = productId.lastIndexOf(':');
  while (cut > 0) {
    out.push(productId.slice(0, cut));
    cut = productId.lastIndexOf(':', cut - 1);
  }
  return out;
}

export function planForPackage<P extends PackageLike, T extends PlanLike>(
  item: P,
  plans: T[] | undefined,
  defaultPlanCode: string,
  store: BillingStore = 'unknown',
): T | undefined {
  // A package with no product id matches nothing. Without this an absent id
  // would equal the `undefined` a plan carries for a column it does not set,
  // handing the reader the first plan in the list.
  if (item.productId) {
    // Google Play reports a subscription as `subscriptionId:basePlanId`, so
    // `premium_monthly:monthly` is the plan an admin entered as
    // `premium_monthly`. The full id is tried first, then each shorter form.
    for (const productId of productIdCandidates(item.productId)) {
      for (const column of productColumnsFor(store)) {
        const match = plans?.find(plan => plan[column] === productId);
        if (match) {
          return match;
        }
      }
    }
  }

  return plans?.find(plan => plan.code === defaultPlanCode);
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
  store: BillingStore = 'unknown',
): MembershipRow<P>[] {
  return packages.map(item => {
    const plan = planForPackage(item, plans, defaultPlanCode, store);

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
