/**
 * RevenueCat Purchases helpers for App Store / Play Billing.
 *
 * Configure with public SDK keys only. Never put REVENUECAT_WEBHOOK_AUTH here.
 * Entitlement truth still comes from Supabase `entitlements-status` after the webhook.
 */
import { Linking, Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
  type PurchasesPackage,
} from 'react-native-purchases';

import { ENV } from '@/config/env';

let configured = false;

export function isPurchasesConfigured(): boolean {
  return configured;
}

export function hasPurchasesApiKey(): boolean {
  return Boolean(ENV.REVENUECAT_API_KEY);
}

export async function configurePurchases(): Promise<boolean> {
  if (configured) {
    return true;
  }
  if (!ENV.REVENUECAT_API_KEY) {
    return false;
  }

  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);
  Purchases.configure({ apiKey: ENV.REVENUECAT_API_KEY });
  configured = true;
  return true;
}

/** Must use Supabase Auth UUID — webhook rejects anything else. */
export async function identifyPurchasesUser(userId: string): Promise<void> {
  if (!(await configurePurchases())) {
    return;
  }
  await Purchases.logIn(userId);
}

export async function resetPurchasesUser(): Promise<void> {
  if (!configured) {
    return;
  }
  try {
    await Purchases.logOut();
  } catch {
    // Already anonymous or SDK not ready — ignore.
  }
}

export async function getMonthlyPackage(): Promise<PurchasesPackage | null> {
  if (!(await configurePurchases())) {
    return null;
  }
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) {
    return null;
  }
  return (
    current.monthly ??
    current.availablePackages.find(p => p.packageType === PACKAGE_TYPE.MONTHLY) ??
    current.availablePackages[0] ??
    null
  );
}

export async function purchaseMonthlyPackage(): Promise<{
  cancelled: boolean;
  customerInfo: Awaited<ReturnType<typeof Purchases.purchasePackage>>['customerInfo'] | null;
}> {
  const pkg = await getMonthlyPackage();
  if (!pkg) {
    throw new Error(
      'No subscription package is available yet. Configure App Store / Play products in RevenueCat.',
    );
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { cancelled: false, customerInfo };
  } catch (error) {
    if (isUserCancelled(error)) {
      return { cancelled: true, customerInfo: null };
    }
    throw error;
  }
}

export async function restorePurchases(): Promise<
  Awaited<ReturnType<typeof Purchases.restorePurchases>>
> {
  if (!(await configurePurchases())) {
    throw new Error('RevenueCat API keys are not set in the app env.');
  }
  return Purchases.restorePurchases();
}

export async function openManageSubscriptions(): Promise<void> {
  const url =
    Platform.OS === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';
  await Linking.openURL(url);
}

function isUserCancelled(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const e = error as { userCancelled?: boolean; code?: string | number };
  if (e.userCancelled === true) {
    return true;
  }
  // PurchasesErrorCode.PURCHASE_CANCELLED_ERROR === 1
  return e.code === 1 || e.code === '1' || e.code === 'PURCHASE_CANCELLED_ERROR';
}
