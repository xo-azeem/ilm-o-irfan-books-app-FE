import { Linking, Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesError,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { env } from '@/config/env';
import { strings } from '@/i18n/strings';
import { manageSubscriptionsUrl } from '@/services/billing/cancellation';
import type { BillingStore } from '@/services/billing/options';
import { useBillingKeyStore } from '@/stores/billingKeyStore';

/**
 * Checkout.
 *
 * The store owns the money and RevenueCat owns the receipt; this module owns
 * neither. It opens the native sheet, and the *only* thing it does with a
 * success is ask the backend to re-read the entitlement. Nothing here unlocks a
 * book — `canAccessPremium` from `entitlements-status` does, because that is the
 * flag `get-signed-pdf` is also looking at. Trusting the RevenueCat SDK instead
 * would unlock a reader the backend has not heard about yet, and the first PDF
 * they opened would be refused.
 *
 * The backend's half is a single webhook. It matches the purchase to a reader by
 * `app_user_id`, which is why `identifyPurchaser` below is load-bearing: with an
 * email or an anonymous id in that field the webhook answers 400 USER_NOT_FOUND
 * and the purchase never unlocks anything, having been paid for.
 */

/**
 * The entitlement identifier configured in RevenueCat — `env.revenueCatEntitlement`,
 * from `REVENUECAT_ENTITLEMENT_ID`, so a build and its backend can be pointed
 * at the same dashboard entitlement without a code change.
 *
 * Read from `customerInfo` after a purchase or a restore as a sanity check on
 * the configuration — not as the access decision, which is the backend's.
 */
export const PREMIUM_ENTITLEMENT = env.revenueCatEntitlement;

/** The plan code the backend falls back to when it cannot match a product. */
export const PREMIUM_PLAN_CODE = 'premium_monthly';

/**
 * The store this build buys from, in the backend's own vocabulary.
 *
 * The paywall matches a package to a plan on the SKU column for this store
 * before the shared alias, exactly as the webhook does — see
 * `options.planForPackage`. Anything that is neither iOS nor Android has no
 * store sheet to open, so it matches the way an event with an unknown store
 * does.
 */
export const BILLING_STORE: BillingStore =
  Platform.OS === 'ios'
    ? 'app_store'
    : Platform.OS === 'android'
      ? 'play_store'
      : 'unknown';

/**
 * The public SDK key this install runs on.
 *
 * A key baked into the build (`REVENUECAT_*_KEY` in `.env`) wins, so a
 * release pinned to a key is unaffected by the admin tool. Otherwise the key
 * the backend sent with `app-status` — set by an admin once RevenueCat
 * exists — which is what lets a build made before then sell without a
 * rebuild. `''` means neither: checkout is unavailable.
 */
export function billingKey(): string {
  return env.revenueCatKey || useBillingKeyStore.getState().runtimeKey;
}

/**
 * Whether the store SDK can be used at all.
 *
 * False with no RevenueCat key from either source — a simulator, a CI build,
 * or an install the admin has not yet given a key — and the paywall says so
 * rather than opening a sheet that cannot complete. It is also false on any
 * platform but iOS and Android, neither of which has a store.
 */
export function isBillingAvailable(): boolean {
  return (
    Boolean(billingKey()) &&
    (Platform.OS === 'ios' || Platform.OS === 'android')
  );
}

/** The key the SDK was configured with this launch, or `null` before that. */
let configuredKey: string | null = null;

/**
 * Configures the SDK once per launch.
 *
 * Deliberately called with no `appUserID`: passing one here would bind the
 * device to whoever happened to be signed in at configure time. The binding is
 * `identifyPurchaser`, which runs on every sign-in and can be re-run when the
 * reader changes.
 */
export function configureBilling(): boolean {
  if (!isBillingAvailable()) {
    return false;
  }
  const key = billingKey();
  if (configuredKey !== null) {
    // The SDK takes one key per launch. A key rotated in the admin tool
    // mid-session is picked up on the next launch, not by reconfiguring.
    if (__DEV__ && configuredKey !== key) {
      console.warn('[billing] key changed after configure; restart to apply');
    }
    return true;
  }

  Purchases.configure({ apiKey: key });
  configuredKey = key;

  // Verbose in development, where the SDK's own log is the fastest way to
  // see a misconfigured product or entitlement; quiet in a release build.
  void Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.ERROR);

  return true;
}

/**
 * Binds store purchases to the Supabase user.
 *
 * `app_user_id` **must** be the Supabase Auth UUID. The webhook looks the reader
 * up by it, so an email address or RevenueCat's own `$RCAnonymousID` means the
 * purchase arrives attached to nobody: the backend answers 400 USER_NOT_FOUND,
 * no entitlement is written, and the reader has paid for nothing. It is the one
 * detail in this flow that cannot be fixed after the fact from the app.
 *
 * Safe to call repeatedly — the SDK no-ops when the id is already current.
 */
export async function identifyPurchaser(userId: string): Promise<void> {
  if (!configureBilling() || !userId) {
    return;
  }

  try {
    await Purchases.logIn(userId);
  } catch (error) {
    // A failed identify is not worth blocking sign-in over; the next call,
    // typically the paywall opening, will try again.
    if (__DEV__) {
      console.warn('[billing] could not identify the purchaser', error);
    }
  }
}

/**
 * Unbinds the device on sign-out, returning the SDK to an anonymous id.
 *
 * Without this the next reader to sign in on the same device inherits the
 * previous one's purchases in the SDK's local view of the world.
 */
export async function forgetPurchaser(): Promise<void> {
  if (configuredKey === null) {
    return;
  }

  try {
    await Purchases.logOut();
  } catch (error) {
    // Already anonymous. The SDK treats that as an error; nothing is wrong.
    if (
      __DEV__ &&
      readErrorCode(error) !== PURCHASES_ERROR_CODE.LOG_OUT_ANONYMOUS_USER_ERROR
    ) {
      console.warn('[billing] could not clear the purchaser', error);
    }
  }
}

/**
 * One buyable package, flattened for the paywall.
 *
 * `priceString` is the store's own localized price — "Rs 1,200.00", "$4.99" —
 * already in the reader's currency. It is the only thing a button may show.
 * `plans.price_cents` is catalogue marketing copy maintained by an admin, and
 * charging from it, or even displaying it beside a store button, would state a
 * price the store is not about to take.
 */
export type BillingPackage = {
  id: string;
  /** Handed back to `purchasePackage`; the SDK object, not an identifier. */
  package: PurchasesPackage;
  /** The store's localized price. Render this, always. */
  priceString: string;
  /**
   * The same amount as a number, for ordering only.
   *
   * Never rendered: it carries no currency, and formatting it would reinvent the
   * localization `priceString` already did.
   */
  price: number;
  /** The store product id, which the webhook matches to a plan. */
  productId: string;
  /** e.g. `P1M`. `null` for a product with no subscription period. */
  period: string | null;
  title: string;
};

function toBillingPackage(item: PurchasesPackage): BillingPackage {
  return {
    id: item.identifier,
    package: item,
    priceString: item.product.priceString,
    price: item.product.price,
    productId: item.product.identifier,
    period: item.product.subscriptionPeriod ?? null,
    title: item.product.title,
  };
}

export type BillingOffering = {
  id: string;
  packages: BillingPackage[];
};

/**
 * The current offering, as configured in RevenueCat.
 *
 * `null` when billing is unavailable or no offering is current — both of which
 * the paywall renders as "membership cannot be bought right now" rather than as
 * an empty list of plans. The catalogue copy beside it still comes from
 * `plans-list`; only the prices come from here.
 */
export async function getBillingOffering(): Promise<BillingOffering | null> {
  if (!configureBilling()) {
    return null;
  }

  const offerings = await Purchases.getOfferings();
  const current: PurchasesOffering | null = offerings.current ?? null;
  if (!current || current.availablePackages.length === 0) {
    return null;
  }

  return {
    id: current.identifier,
    packages: current.availablePackages.map(toBillingPackage),
  };
}

/** What happened at the native sheet. None of the three is an error. */
export type PurchaseOutcome =
  | { status: 'purchased'; customerInfo: CustomerInfo }
  | { status: 'cancelled' }
  /**
   * Play's slow-card flow, and Apple's Ask to Buy. The money is not taken yet
   * and the entitlement will arrive by webhook, possibly days later — so this
   * must read as "we will let you know", never as a failure and never as an
   * unlock.
   */
  | { status: 'pending' };

function readErrorCode(error: unknown): string | undefined {
  const code = (error as PurchasesError | undefined)?.code;
  return code == null ? undefined : String(code);
}

/** True when the reader backed out of the sheet. */
function isCancelled(error: unknown): boolean {
  return (
    readErrorCode(error) ===
      String(PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) ||
    Boolean((error as { userCancelled?: boolean } | undefined)?.userCancelled)
  );
}

/** True when the store has taken the order but not yet the money. */
function isPending(error: unknown): boolean {
  return (
    readErrorCode(error) === String(PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR)
  );
}

/**
 * Opens the native payment sheet for one package.
 *
 * On iOS this is StoreKit (Apple Pay appears when the reader has it set up).
 * On Android this is Google Play Billing (Google Pay may appear in the Play
 * sheet). Neither is a separate SDK or Edge Function — RevenueCat opens the
 * store sheet; our webhook unlocks Premium afterward.
 *
 * Cancelling and a deferred payment come back as ordinary outcomes rather than
 * thrown errors, because neither is a fault and both have their own copy. Every
 * other failure throws, carrying the store's own message.
 *
 * A `purchased` result is *not* an unlock. The caller's next step is to re-read
 * `entitlements-status`; the webhook is what writes the entitlement, and the
 * backend is what `get-signed-pdf` will ask.
 */
export async function purchaseMembership(
  item: BillingPackage,
): Promise<PurchaseOutcome> {
  if (!configureBilling()) {
    throw new Error(strings().services.billing.cannotPurchase);
  }

  // Advisory, never a gate of its own: a device that cannot pay is worth
  // saying so before opening a sheet that cannot complete, but the probe
  // failing is not evidence of anything. On some Android builds it throws
  // outright (no Play Services), and refusing the purchase on that would deny
  // checkout to readers whose store is perfectly able to take the money. Only
  // a definite `false` stops us; anything else falls through to the store,
  // which is the authority either way.
  let canPay = true;
  try {
    canPay = await Purchases.canMakePayments();
  } catch (error) {
    if (__DEV__) {
      console.warn(
        '[billing] canMakePayments failed; opening the sheet',
        error,
      );
    }
  }

  if (!canPay) {
    throw new Error(
      Platform.OS === 'ios'
        ? strings().services.billing.unavailableIos
        : strings().services.billing.unavailableAndroid,
    );
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(item.package);
    return { status: 'purchased', customerInfo };
  } catch (error) {
    if (isCancelled(error)) {
      return { status: 'cancelled' };
    }
    if (isPending(error)) {
      return { status: 'pending' };
    }
    throw new Error(storeMessage(error));
  }
}

/**
 * Restores a membership bought on another device or before a reinstall.
 *
 * Required by Apple review, and genuinely needed: a reader who reinstalls has a
 * live subscription and no local receipt. The restore re-sends it to
 * RevenueCat, which re-fires the webhook, which writes the entitlement — so the
 * caller still finishes by re-reading `entitlements-status`.
 *
 * The returned flag is the SDK's view, for the message shown to the reader. It
 * is not what unlocks anything.
 */
export async function restoreMembership(): Promise<{ restored: boolean }> {
  if (!configureBilling()) {
    throw new Error(strings().services.billing.cannotRestore);
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    return { restored: hasPremiumEntitlement(customerInfo) };
  } catch (error) {
    throw new Error(storeMessage(error));
  }
}

/** Where the reader ended up when asked to manage the subscription. */
export type ManageSubscriptionsOutcome =
  /** The native sheet (iOS 15+) or the store app opened. */
  | { status: 'sheet' }
  /** No sheet on this build; the store's web page was opened instead. */
  | { status: 'browser'; url: string }
  /** Nothing could be opened. The caller shows the URL for the reader to visit. */
  | { status: 'unavailable'; url: string | null };

/**
 * Opens the store's own manage-subscriptions surface.
 *
 * This is the whole of "cancel": neither Apple nor Google lets a backend stop
 * a subscription renewing, so the reader has to do it in the store, and the
 * best the app can do is put them on the exact page. On iOS 15+ that is the
 * in-app StoreKit sheet; on Android it is the Play Store's subscription page
 * for this package. Both come back to the app afterwards, which is when the
 * caller re-reads `entitlements-status` — the store's CANCELLATION reaches the
 * backend by webhook, usually within the minute.
 *
 * Nothing here is an error. A build without a store key, or a platform with
 * no store, falls through to the store's web page; if even that cannot open,
 * the URL is handed back so a dialog can show it.
 */
export async function openManageSubscriptions(
  store?: string | null,
): Promise<ManageSubscriptionsOutcome> {
  const url = manageSubscriptionsUrl(store ?? BILLING_STORE);

  if (configureBilling()) {
    try {
      await Purchases.showManageSubscriptions();
      return { status: 'sheet' };
    } catch (error) {
      // The SDK throws when there is no subscription to show, or when the
      // sheet is not supported on this OS version. Neither stops the reader
      // getting to the store — the web page is the same list.
      if (__DEV__) {
        console.warn('[billing] showManageSubscriptions failed', error);
      }
    }
  }

  if (!url) {
    return { status: 'unavailable', url: null };
  }

  try {
    await Linking.openURL(url);
    return { status: 'browser', url };
  } catch {
    return { status: 'unavailable', url };
  }
}

/** What RevenueCat's own paywall came back with. */
export type HostedPaywallOutcome = {
  /** The sheet ended in a purchase or a restore. Still not the unlock: the
   *  caller re-reads `entitlements-status` and that is what opens books. */
  status: 'purchased' | 'restored' | 'cancelled' | 'not_presented' | 'error';
};

/**
 * RevenueCat's hosted paywall — the one designed in the dashboard — for the
 * current offering.
 *
 * The app's own paywall (`MembershipPaywall`) is the front door: it quotes
 * the store's prices against the backend's plans. This is the stand-in for
 * when that has nothing it can sell — the offering's packages match no plan
 * the admin has set up — and for testing a dashboard paywall directly. With
 * `requireEntitlement`, the sheet is skipped for a reader RevenueCat already
 * sees as entitled (`presentPaywallIfNeeded`).
 *
 * As with `purchaseMembership`, a success here is not the unlock. The
 * webhook writes the entitlement and the caller re-reads it from the
 * backend, which is the only thing `get-signed-pdf` will believe.
 */
export async function presentHostedPaywall({
  requireEntitlement = false,
}: { requireEntitlement?: boolean } = {}): Promise<HostedPaywallOutcome> {
  if (!configureBilling()) {
    throw new Error(strings().services.billing.cannotPurchase);
  }

  let result: PAYWALL_RESULT;
  try {
    result = requireEntitlement
      ? await RevenueCatUI.presentPaywallIfNeeded({
          requiredEntitlementIdentifier: PREMIUM_ENTITLEMENT,
          displayCloseButton: true,
        })
      : await RevenueCatUI.presentPaywall({ displayCloseButton: true });
  } catch (error) {
    throw new Error(storeMessage(error));
  }

  switch (result) {
    case PAYWALL_RESULT.PURCHASED:
      return { status: 'purchased' };
    case PAYWALL_RESULT.RESTORED:
      return { status: 'restored' };
    case PAYWALL_RESULT.CANCELLED:
      return { status: 'cancelled' };
    case PAYWALL_RESULT.NOT_PRESENTED:
      return { status: 'not_presented' };
    case PAYWALL_RESULT.ERROR:
    default:
      return { status: 'error' };
  }
}

/** Whether RevenueCat currently considers the entitlement active for this id. */
export function hasPremiumEntitlement(
  customerInfo: CustomerInfo | null | undefined,
): boolean {
  return Boolean(customerInfo?.entitlements.active[PREMIUM_ENTITLEMENT]);
}

/**
 * The store's own wording, which is more use to a reader than ours.
 *
 * "Your card was declined" and "this item is not available in your country" are
 * things only the store knows; a generic "purchase failed" throws that away.
 */
function storeMessage(error: unknown): string {
  const purchasesError = error as PurchasesError | undefined;
  const message =
    purchasesError?.underlyingErrorMessage ||
    purchasesError?.message ||
    (error instanceof Error ? error.message : '');

  return message || strings().services.billing.purchaseFailed;
}
