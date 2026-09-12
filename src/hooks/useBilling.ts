import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getPlans } from '@/services/catalog';
import {
  PREMIUM_PLAN_CODE,
  getBillingOffering,
  isBillingAvailable,
  purchaseMembership,
  restoreMembership,
  type BillingPackage,
  type PurchaseOutcome,
} from '@/services/billing';
import {
  buildMembershipRows,
  cheapestRow,
  defaultFeatures,
  type MembershipRow,
} from '@/services/billing/options';
import { useAccessStore } from '@/stores/accessStore';
import { useAuthStore } from '@/stores/authStore';

/**
 * Checkout, as the paywall sees it.
 *
 * Two sources, each answering what only it can:
 *
 *   · `plans-list` — the pitch. Name, interval and the `features[]` bullets, all
 *     editable by an admin without a release.
 *   · RevenueCat — the price. `priceString` is the store's own localized figure,
 *     and the only number that may appear on a button. `plans.price_cents` is
 *     marketing copy: charging from it, or showing it beside a store button,
 *     states a price the store is not about to take.
 *
 * The two are matched on `revenuecat_product_id`, which is exactly how the
 * backend's webhook matches them. When a plan has none, or the product is not in
 * the current offering, the package still stands on its own — the store price is
 * what the reader is paying either way.
 */

/** The store's packages. Refetched rarely; prices do not move hour to hour. */
export function useBillingOffering() {
  return useQuery({
    queryKey: ['billing', 'offering'],
    queryFn: getBillingOffering,
    enabled: isBillingAvailable(),
    staleTime: 30 * 60_000,
    retry: 1,
  });
}

/** The catalogue copy behind the pitch. Public, so it loads for anyone. */
export function usePlans() {
  return useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: ({ signal }) => getPlans(signal),
    staleTime: 30 * 60_000,
  });
}

/**
 * One row of the paywall: the admin's copy, the store's price.
 *
 * `purchasable` is a real package, never null — a row only exists because the
 * store offered something to buy.
 */
export type MembershipOption = MembershipRow<BillingPackage>;

/**
 * The rows the paywall draws, and the one it preselects.
 *
 * Built from the store's packages rather than from the plan table, because a
 * plan nobody can buy is not an offer. A plan whose product is missing from the
 * offering simply does not appear, which is the correct outcome: showing it
 * would be a button with no price behind it.
 */
export function useMembershipOptions() {
  const {
    data: offering,
    isPending: offeringPending,
    error: offeringError,
  } = useBillingOffering();
  const { data: plans } = usePlans();

  const options = useMemo<MembershipOption[]>(
    () =>
      buildMembershipRows(offering?.packages ?? [], plans, PREMIUM_PLAN_CODE),
    [offering?.packages, plans],
  );

  return {
    options,
    /** The cheapest package, for a "from …" line. */
    cheapest: cheapestRow(options),
    /** The bullets to show when no single plan is selected yet. */
    features: defaultFeatures(plans, PREMIUM_PLAN_CODE),
    isPending: isBillingAvailable() && offeringPending,
    /**
     * True when there is nothing to sell: no key in this build, no current
     * offering, or the store could not be reached. The paywall says so instead
     * of opening a sheet that cannot complete.
     */
    unavailable:
      !isBillingAvailable() || Boolean(offeringError) || options.length === 0,
  };
}

/**
 * Buys a membership, then asks the backend whether it took.
 *
 * The order matters and is not negotiable: the sheet completes, and *then*
 * `entitlements-status` is re-read. The RevenueCat SDK saying "entitled" is not
 * permission to open a PDF — `get-signed-pdf` asks the backend, which learns
 * about the purchase from the webhook, so the app has to learn it from the same
 * place. A broadcast on the reader's private channel usually arrives within the
 * minute as well; this is what makes the unlock immediate rather than eventual.
 */
export function usePurchaseMembership() {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);
  const refresh = useAccessStore(state => state.refresh);

  return useMutation({
    mutationFn: async (item: BillingPackage): Promise<PurchaseOutcome> => {
      const outcome = await purchaseMembership(item);

      // A cancelled sheet changed nothing, and a deferred payment has not
      // happened yet — neither is worth a round trip, and neither unlocks.
      if (outcome.status === 'purchased') {
        await refresh();
      }

      return outcome;
    },
    onSuccess: outcome => {
      if (outcome.status !== 'purchased') {
        return;
      }
      void client.invalidateQueries({ queryKey: ['subscription', userId] });
    },
  });
}

/**
 * Restores a membership bought before a reinstall or on another device.
 *
 * Required by Apple review, and the only route back for a reader whose receipt
 * is on the store but not on this phone. The restore re-sends it to RevenueCat,
 * which re-fires the webhook — so, as with a purchase, the answer that counts
 * comes from re-reading `entitlements-status` afterwards.
 */
export function useRestorePurchases() {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);
  const refresh = useAccessStore(state => state.refresh);

  const mutation = useMutation({
    mutationFn: async () => {
      const { restored } = await restoreMembership();
      await refresh();

      // The backend's verdict, not the SDK's — the webhook may still be in
      // flight, and what the reader is told should match what the app will do.
      const granted = useAccessStore.getState().state.canAccessPremium;

      return { restored, granted };
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['subscription', userId] });
    },
  });

  const restore = useCallback(() => mutation.mutateAsync(), [mutation]);

  return { ...mutation, restore };
}
