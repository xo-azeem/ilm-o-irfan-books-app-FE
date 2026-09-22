import { useCallback, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  requestSubscriptionCancellation,
  withdrawSubscriptionCancellation,
} from '@/services/account';
import { getPlans } from '@/services/catalog';
import {
  BILLING_STORE,
  PREMIUM_PLAN_CODE,
  billingKey,
  getBillingOffering,
  isBillingAvailable,
  openManageSubscriptions,
  presentHostedPaywall,
  purchaseMembership,
  restoreMembership,
  type BillingPackage,
  type HostedPaywallOutcome,
  type ManageSubscriptionsOutcome,
  type PurchaseOutcome,
} from '@/services/billing';
import type { CancellationReceipt } from '@/services/api/types';
import {
  buildMembershipRows,
  cheapestRow,
  defaultFeatures,
  type MembershipRow,
} from '@/services/billing/options';
import { useAccessStore } from '@/stores/accessStore';
import { useAuthStore } from '@/stores/authStore';
import { useBillingKeyStore } from '@/stores/billingKeyStore';

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
 * The two are matched on `revenuecat_product_id` / `app_store_product_id` /
 * `play_store_product_id`, which is exactly how the backend webhook matches.
 * When a plan has none, or the product is not in the current offering, the
 * package still stands on its own — the store price is what the reader pays.
 *
 * Checkout opens the native App Store / Play sheet (Apple Pay / Google Pay
 * appear there when available). There is no separate wallet SDK in this app.
 */

/**
 * Whether checkout can open, as a subscription: the key may arrive with
 * `app-status` after the first render, and the paywall has to notice.
 */
export function useBillingAvailable(): boolean {
  const runtimeKey = useBillingKeyStore(state => state.runtimeKey);
  // `runtimeKey` is read only to subscribe; the decision is the service's.
  return Boolean(runtimeKey) || isBillingAvailable();
}

/** The store's packages. Refetched rarely; prices do not move hour to hour. */
export function useBillingOffering() {
  const available = useBillingAvailable();
  return useQuery({
    // The key is part of the identity: an offering read under one key is
    // not the answer for another.
    queryKey: ['billing', 'offering', billingKey()],
    queryFn: getBillingOffering,
    enabled: available,
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
  const available = useBillingAvailable();

  const options = useMemo<MembershipOption[]>(
    () =>
      buildMembershipRows(
        offering?.packages ?? [],
        plans,
        PREMIUM_PLAN_CODE,
        BILLING_STORE,
      ),
    [offering?.packages, plans],
  );

  return {
    options,
    /** The cheapest package, for a "from …" line. */
    cheapest: cheapestRow(options),
    /** The bullets to show when no single plan is selected yet. */
    features: defaultFeatures(plans, PREMIUM_PLAN_CODE),
    isPending: available && offeringPending,
    /**
     * True when there is nothing to sell: no key in this build, no current
     * offering, or the store could not be reached. The paywall says so instead
     * of opening a sheet that cannot complete.
     */
    unavailable: !available || Boolean(offeringError) || options.length === 0,
    /**
     * The store answered but none of its packages matches a plan the admin
     * has set up, so the in-app paywall has nothing to quote. RevenueCat's
     * own paywall still can — it sells the offering as the dashboard
     * describes it — and is offered in that one case.
     */
    hostedPaywallOnly:
      available &&
      !offeringPending &&
      !offeringError &&
      (offering?.packages.length ?? 0) > 0 &&
      options.length === 0,
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
 * RevenueCat's hosted paywall, then the same re-read the in-app one does.
 *
 * A purchase or a restore from the sheet asks the backend whether it took,
 * exactly as `usePurchaseMembership` does — the sheet's own "purchased" is
 * not what unlocks a book.
 */
export function usePresentHostedPaywall() {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);
  const refresh = useAccessStore(state => state.refresh);

  return useMutation({
    mutationFn: async (
      params: { requireEntitlement?: boolean } = {},
    ): Promise<HostedPaywallOutcome> => {
      const outcome = await presentHostedPaywall(params);
      if (outcome.status === 'purchased' || outcome.status === 'restored') {
        await refresh();
      }
      return outcome;
    },
    onSuccess: outcome => {
      if (outcome.status === 'purchased' || outcome.status === 'restored') {
        void client.invalidateQueries({ queryKey: ['subscription', userId] });
      }
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

/** What "cancel" did. None of these is an error. */
export type CancelOutcome =
  /** The request is on record and the store's surface was opened. */
  | {
      status: 'opened';
      receipt: CancellationReceipt;
      opened: ManageSubscriptionsOutcome;
    }
  /** The store had already confirmed; there was nothing to request. */
  | { status: 'already_cancelled'; receipt: CancellationReceipt };

/**
 * Cancels — as far as an app can.
 *
 * Two steps, in this order and not the other: the request is recorded on the
 * backend *first*, then the store's manage-subscriptions surface opens. The
 * store is what actually stops the renewal, and it tells the backend by
 * webhook; the record is what lets the backend show the request as pending,
 * and email the reader an hour later if the store never confirms — the case
 * that otherwise ends in an unexpected charge. Opening the sheet first would
 * lose the record for every reader who cancels and then closes the app.
 *
 * The subscription views are refreshed on the way out so the screen shows
 * "pending" the moment the reader is back, without waiting for the webhook.
 */
export function useCancelMembership() {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);
  const refresh = useAccessStore(state => state.refresh);

  return useMutation({
    mutationFn: async (): Promise<CancelOutcome> => {
      const receipt = await requestSubscriptionCancellation();

      if (receipt.alreadyCancelled) {
        // The store has already confirmed — the screen may simply be stale.
        await refresh();
        return { status: 'already_cancelled', receipt };
      }

      const opened = await openManageSubscriptions(receipt.store);
      return { status: 'opened', receipt, opened };
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ['subscription', userId] });
    },
  });
}

/** Clears a pending request. The store is not involved. */
export function useWithdrawCancellation() {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);
  const refresh = useAccessStore(state => state.refresh);

  return useMutation({
    mutationFn: async () => {
      const result = await withdrawSubscriptionCancellation();
      await refresh();
      return result;
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ['subscription', userId] });
    },
  });
}

/** How often, and for how long, to ask the backend whether the store spoke. */
const CONFIRMATION_POLL_MS = 15_000;
const CONFIRMATION_POLL_FOR_MS = 10 * 60_000;

/**
 * Watches for the store's answer while a cancel request is pending.
 *
 * The change feed and the foreground poll already cover the common case: the
 * reader comes back from the store sheet, the app foregrounds, the backend is
 * re-read. What they do not cover is the webhook landing thirty seconds
 * *after* that, on a device whose socket happens to be down — so while the
 * Membership screen is open with a request pending, the backend is re-read
 * every fifteen seconds for ten minutes. Bounded, because a reader who backed
 * out of the sheet is not worth polling for an hour; the reminder email is
 * what reaches them then.
 */
export function useStoreConfirmationWatch(pending: boolean) {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);
  const refresh = useAccessStore(state => state.refresh);

  useEffect(() => {
    if (!pending || !userId) {
      return;
    }

    const startedAt = Date.now();
    let inFlight = false;

    const timer = setInterval(() => {
      if (Date.now() - startedAt > CONFIRMATION_POLL_FOR_MS) {
        clearInterval(timer);
        return;
      }
      if (inFlight) {
        return;
      }
      inFlight = true;
      void refresh()
        .then(landed => {
          if (landed) {
            void client.invalidateQueries({
              queryKey: ['subscription', userId],
            });
          }
        })
        .finally(() => {
          inFlight = false;
        });
    }, CONFIRMATION_POLL_MS);

    return () => clearInterval(timer);
  }, [client, pending, refresh, userId]);
}
