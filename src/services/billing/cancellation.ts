/**
 * What the Membership screen may offer a reader who wants out.
 *
 * Kept free of React and of the store SDK so the rule can be tested directly —
 * it decides whether a "Cancel membership" control exists at all, and getting
 * it wrong sends a reader to a store sheet with nothing in it (a comp), or
 * offers an admin the chance to cancel a subscription they do not hold.
 *
 * The rule itself is the backend's (`request_subscription_cancellation`): this
 * is the same decision made ahead of the round trip, so the screen draws the
 * right control on first paint instead of learning it from a 409.
 */

import { strings } from '@/i18n/strings';

/** `entitlements.store`, in the backend's vocabulary. */
export type EntitlementStore =
  'app_store' | 'play_store' | 'stripe' | 'promotional' | 'unknown';

/** The subscription facts the decision reads. */
export type CancellationFacts = {
  /** The subscription alone — never `canAccessPremium`, which an admin has. */
  active: boolean;
  status: string | null;
  store: string | null;
  /** Set by `subscription-cancel` until the store confirms by webhook. */
  cancelRequestedAt: string | null;
};

/**
 * The control the screen draws, and the only five it can draw.
 *
 *   · `cancellable` — a renewing membership billed by a store: offer to cancel.
 *   · `pending` — the reader asked, the store has not confirmed; the membership
 *     still renews. Offer to reopen the store, say it is not finished.
 *   · `ending` — the store confirmed. Paid through `expiresAt`; offer to resume.
 *   · `not_store_managed` — a comp or a Stripe row. Nothing a store sheet can
 *     end, so point at support instead.
 *   · `none` — no subscription to cancel (an admin, a lapsed reader, no row).
 */
export type CancellationAvailability =
  'cancellable' | 'pending' | 'ending' | 'not_store_managed' | 'none';

const RENEWING = new Set(['active', 'trial', 'grace', 'billing_issue']);

export function isStoreManaged(store: string | null | undefined): boolean {
  return store === 'app_store' || store === 'play_store';
}

/** Mirrors `private.entitlement_is_renewing` on the backend. */
export function isRenewing(status: string | null | undefined): boolean {
  return Boolean(status && RENEWING.has(status));
}

export function cancellationAvailability(
  facts: CancellationFacts,
): CancellationAvailability {
  if (!facts.active || !facts.status) {
    return 'none';
  }
  if (facts.status === 'cancelled') {
    return 'ending';
  }
  if (!isRenewing(facts.status)) {
    return 'none';
  }
  if (!isStoreManaged(facts.store)) {
    return 'not_store_managed';
  }
  return facts.cancelRequestedAt ? 'pending' : 'cancellable';
}

/** The store, as a reader would name it, in the interface language. */
export function storeName(store: string | null | undefined): string {
  const s = strings().account.stores;
  switch (store) {
    case 'app_store':
      return s.appStore;
    case 'play_store':
      return s.googlePlay;
    default:
      return s.yourAppStore;
  }
}

/**
 * Where a store lists the account's subscriptions.
 *
 * Both open the account's whole list rather than one product: the App Store
 * has no per-product URL, and Play's takes a package and SKU the app would have
 * to guess at. The native sheet (`openManageSubscriptions`) is preferred; this
 * is what a dialog can fall back to when the sheet cannot open.
 */
export function manageSubscriptionsUrl(
  store: string | null | undefined,
): string | null {
  switch (store) {
    case 'app_store':
      return 'https://apps.apple.com/account/subscriptions';
    case 'play_store':
      return 'https://play.google.com/store/account/subscriptions';
    default:
      return null;
  }
}
