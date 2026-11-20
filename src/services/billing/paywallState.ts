/**
 * Pure predicates for the membership paywall CTA.
 *
 * Kept free of React so the rules that decide Subscribe vs hosted vs
 * unavailable can be tested without mounting the screen. The hook only
 * gathers inputs; these decide what the button may say.
 */

export type PaywallOfferInput = {
  /** A RevenueCat public key is present for this platform. */
  available: boolean;
  /** The offering query has not settled yet. */
  offeringPending: boolean;
  /** The offering query failed after settle. */
  offeringError: boolean;
  /** Packages returned by the current offering. */
  packageCount: number;
  /** Rows the in-app paywall can quote (always ≤ packageCount). */
  optionCount: number;
};

export type PaywallCtaKind =
  /** Billing is up and the offering is still loading. */
  | 'loading'
  /** In-app packages with prices — gold Subscribe. */
  | 'subscribe'
  /** Store has packages but in-app rows cannot quote them — hosted paywall. */
  | 'hosted'
  /** Nothing to sell on this device. */
  | 'unavailable';

/**
 * Which primary CTA the non-member paywall should draw.
 *
 * Loading is never conflated with unavailable: an empty option list while the
 * offering is still in flight is "still fetching", not "cannot purchase".
 */
export function paywallCtaKind(input: PaywallOfferInput): PaywallCtaKind {
  const {
    available,
    offeringPending,
    offeringError,
    packageCount,
    optionCount,
  } = input;

  if (!available) {
    return 'unavailable';
  }

  if (offeringPending) {
    return 'loading';
  }

  if (offeringError) {
    return 'unavailable';
  }

  if (optionCount > 0) {
    return 'subscribe';
  }

  if (packageCount > 0) {
    return 'hosted';
  }

  return 'unavailable';
}

/** True while billing can sell but the offering has not arrived yet. */
export function isPaywallPending(input: PaywallOfferInput): boolean {
  return paywallCtaKind(input) === 'loading';
}

/**
 * True only after settle, when there is genuinely nothing to buy.
 * Does not fire while the offering is still pending.
 */
export function isPaywallUnavailable(input: PaywallOfferInput): boolean {
  return paywallCtaKind(input) === 'unavailable';
}

/**
 * True when RevenueCat's own paywall is the only workable checkout —
 * packages exist, but the in-app list has nothing to quote.
 */
export function isHostedPaywallOnly(input: PaywallOfferInput): boolean {
  return paywallCtaKind(input) === 'hosted';
}
