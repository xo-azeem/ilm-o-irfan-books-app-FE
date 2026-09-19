import { useCallback, useMemo } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import {
  Badge,
  Button,
  Callout,
  Card,
  Display,
  Divider,
  Icon,
  Label,
  LinearGradient,
  showDialog,
  StatTile,
  Text,
  TextButton,
} from '@/components/ui';
import {
  CalendarClock,
  Check,
  CreditCard,
  Hourglass,
  Mail,
  Store,
} from 'lucide-react-native';
import { MembershipNotice } from '@/features/home/components/MembershipNotice';
import { MembershipPaywall } from '@/features/profile/components/MembershipPaywall';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { supportContact } from '@/features/profile/data/profileContent';
import { useLibrary, useSubscription } from '@/hooks/useAccount';
import {
  useCancelMembership,
  useMembershipOptions,
  usePurchaseMembership,
  useRestorePurchases,
  useStoreConfirmationWatch,
  useWithdrawCancellation,
  type MembershipOption,
} from '@/hooks/useBilling';
import { useHomeCatalog } from '@/hooks/useCatalog';
import { useDateLocale, useStrings } from '@/i18n';
import { useAccess } from '@/lib/access';
import { ApiError } from '@/services/api/errors';
import {
  cancellationAvailability,
  openManageSubscriptions,
  storeName,
} from '@/services/billing';
import { radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

function formatDate(
  iso: string | null | undefined,
  locale: string,
): string | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

/**
 * Subscription.
 *
 * A member sees what they have and when it renews; everyone else sees the offer.
 * Usage sits above the exit so cancelling is a considered act rather than a
 * hidden one.
 *
 * Two things this screen deliberately does not do:
 *
 *   · quote `plans.price_cents`. That column is catalogue copy an admin edits;
 *     the figure a reader is actually charged is the store's `priceString`, so
 *     where the two disagree only the store's is shown — and where there is no
 *     store price to show, no price is shown at all.
 *   · decide access from `status`. A cancelled membership is paid through to its
 *     end date and a failing card is inside a period already paid for, so both
 *     still read books. `canAccessPremium` is the only gate, and `reason` only
 *     chooses the words.
 *
 * Cancelling is the store's, not ours — neither Apple nor Google lets an app or
 * its backend stop a subscription renewing. So "Cancel membership" records the
 * request on the backend, opens the store's own sheet, and the screen then
 * shows one of three truths: the request is *pending* (the store has not
 * confirmed; it still renews), the membership is *ending* (the store confirmed;
 * paid through its date), or the reader kept it. The backend emails the reader
 * at each step, so nothing here needs to.
 */
export function SubscriptionScreen() {
  const { colors } = useTheme();
  const s = useStrings();
  const locale = useDateLocale();
  const words = s.account.subscription;
  const { data: subscription, isLoading } = useSubscription();
  const { data: library } = useLibrary();
  const { reason, expiresAt } = useAccess();

  const { options, features, unavailable } = useMembershipOptions();
  const purchase = usePurchaseMembership();
  const { restore, isPending: isRestoring } = useRestorePurchases();
  const cancel = useCancelMembership();
  const withdraw = useWithdrawCancellation();
  // The address an admin set, falling back to the bundled one offline.
  const { data: home } = useHomeCatalog();
  const supportEmail = home?.supportEmail || supportContact.email;

  // The CTA follows access, not billing — `get-signed-pdf` serves an admin with
  // no subscription, and offering them a plan would be wrong. The renewal
  // details below still come from the entitlement itself.
  const isMember = subscription?.canAccessPremium ?? false;

  /**
   * Opens the store sheet and reports what came back.
   *
   * Cancelling is silent: the reader made a decision and does not need an alert
   * confirming it. A deferred payment — Play's slow-card flow, Apple's Ask to
   * Buy — gets its own message, because the money has not moved yet and the
   * entitlement will arrive by webhook, possibly much later.
   */
  const handleSubscribe = useCallback(
    (option: MembershipOption) => {
      if (!option.purchasable) {
        return;
      }

      purchase.mutate(option.purchasable, {
        onSuccess: outcome => {
          if (outcome.status === 'pending') {
            showDialog({
              title: words.paymentPending,
              message: words.paymentPendingMessage,
              tone: 'info',
              icon: Hourglass,
            });
          }
          // `purchased` needs no alert: the entitlement has already been
          // re-read, so the screen itself has changed underneath the sheet.
        },
        onError: error =>
          showDialog({
            title: words.purchaseFailed,
            message:
              error instanceof Error ? error.message : s.common.pleaseTryAgain,
            tone: 'danger',
          }),
      });
    },
    [purchase, s, words],
  );

  /**
   * Restore purchases — required by Apple review, and the only way back for a
   * reader who has reinstalled.
   *
   * What is reported is the *backend's* verdict, not the SDK's: the restore
   * re-fires the webhook, and if that has not landed yet the honest answer is
   * "found it, still applying it" rather than an unlock the reader cannot use.
   */
  const handleRestore = useCallback(() => {
    restore().then(
      ({ restored, granted }) => {
        if (granted) {
          showDialog({
            title: words.restored,
            message: words.restoredMessage,
            tone: 'success',
          });
          return;
        }
        showDialog({
          title: restored ? words.almostThere : words.nothingToRestore,
          message: restored ? words.stillApplying : words.noPrevious,
          tone: 'info',
          icon: restored ? Hourglass : undefined,
        });
      },
      error =>
        showDialog({
          title: words.couldNotRestore,
          message:
            error instanceof Error ? error.message : s.common.pleaseTryAgain,
          tone: 'danger',
        }),
    );
  }, [restore, s, words]);

  /**
   * Which cancel control to draw. Decided from the subscription itself —
   * `active`, never `canAccessPremium`, so an admin with no subscription is
   * offered nothing to cancel — and from the store that bills it.
   */
  const availability = cancellationAvailability({
    active: subscription?.active ?? false,
    status: subscription?.status ?? null,
    store: subscription?.store ?? null,
    cancelRequestedAt: subscription?.cancelRequestedAt ?? null,
  });
  const store = subscription?.store ?? null;
  const storeLabel = storeName(store);
  // `null` for a lifetime comp — a sentence must not say "until —".
  const accessUntil = formatDate(expiresAt, locale);

  // While a request is pending, keep asking whether the store has spoken.
  useStoreConfirmationWatch(availability === 'pending');

  /**
   * Puts the reader on the store's subscriptions page.
   *
   * Used to finish a pending cancellation and to resume an ending one — both
   * are the store's to do. If neither the sheet nor the browser can open, the
   * URL is shown so the reader can get there by hand.
   */
  const openStore = useCallback(() => {
    void openManageSubscriptions(store).then(outcome => {
      if (outcome.status === 'unavailable') {
        showDialog({
          title: words.openStore(storeLabel),
          message: outcome.url
            ? words.manageAt(outcome.url)
            : words.openInStoreApp,
          tone: 'info',
          icon: Store,
        });
      }
    });
  }, [store, storeLabel, words]);

  const emailSupport = useCallback(() => {
    void Linking.openURL(
      `mailto:${supportEmail}?subject=${encodeURIComponent(words.mailSubject)}`,
    ).catch(() =>
      showDialog({
        title: words.noMailApp,
        message: words.writeToUs(supportEmail),
        tone: 'info',
        icon: Mail,
      }),
    );
  }, [supportEmail, words]);

  /**
   * Explains a refusal from the backend in the reader's terms.
   *
   * `NOT_STORE_MANAGED` is the one worth its own words: a comp or a Stripe row
   * has no store sheet, and sending the reader to look for one would be worse
   * than saying so. `NO_SUBSCRIPTION` means the screen was stale — the row
   * lapsed, or was revoked, since it loaded — and a refresh is the fix.
   */
  const explainCancelError = useCallback(
    (error: unknown) => {
      const code = error instanceof ApiError ? error.code : undefined;
      if (code === 'NOT_STORE_MANAGED') {
        showDialog({
          title: words.managedByUs,
          message: words.managedByUsMessage,
          tone: 'info',
          icon: Mail,
          actions: [
            { label: words.notNow, style: 'cancel' },
            { label: words.emailSupport, onPress: emailSupport },
          ],
        });
        return;
      }
      if (code === 'NO_SUBSCRIPTION') {
        showDialog({
          title: words.noActive,
          message: words.noActiveMessage,
          tone: 'info',
        });
        return;
      }
      showDialog({
        title: words.couldNotStartCancel,
        message:
          error instanceof Error ? error.message : s.common.pleaseTryAgain,
        tone: 'danger',
      });
    },
    [emailSupport, s, words],
  );

  /**
   * Records the request, then hands the reader to the store.
   *
   * The dialog says exactly what will happen, because the words are the
   * product's one chance to be honest about it: the current period is already
   * paid for and stays open; the store — not the app — is where the renewal
   * is switched off; and an email confirms it once the store has said so.
   */
  const handleCancel = useCallback(() => {
    if (availability === 'not_store_managed') {
      explainCancelError(new ApiError('', 409, 'NOT_STORE_MANAGED'));
      return;
    }

    showDialog({
      title: words.cancelTitle,
      message: [
        accessUntil
          ? words.cancelKeepUntil(accessUntil)
          : words.cancelKeepPeriod,
        words.billedByOpensNext(storeLabel),
      ].join('\n\n'),
      icon: CalendarClock,
      actions: [
        { label: words.keepMembership, style: 'cancel' },
        {
          label: words.continueToCancel,
          style: 'destructive',
          onPress: () =>
            cancel.mutate(undefined, {
              onSuccess: outcome => {
                if (outcome.status === 'already_cancelled') {
                  showDialog({
                    title: words.alreadyCancelled,
                    message: accessUntil
                      ? words.alreadyEndsOn(accessUntil)
                      : words.alreadyEnds,
                    tone: 'info',
                    icon: CalendarClock,
                  });
                  return;
                }
                if (outcome.opened.status === 'unavailable') {
                  showDialog({
                    title: words.finishIn(storeLabel),
                    message: outcome.opened.url
                      ? words.finishAt(outcome.opened.url)
                      : words.finishInApp,
                    tone: 'info',
                    icon: Store,
                  });
                }
                // The sheet opened: nothing to say. The screen shows the
                // request as pending the moment the reader is back.
              },
              onError: explainCancelError,
            }),
        },
      ],
    });
  }, [
    accessUntil,
    availability,
    cancel,
    explainCancelError,
    storeLabel,
    words,
  ]);

  /** The reader changed their mind before the store confirmed. */
  const handleKeep = useCallback(() => {
    withdraw.mutate(undefined, {
      onSuccess: ({ withdrawn }) => {
        showDialog({
          title: withdrawn ? words.kept : words.nothingToWithdraw,
          message: withdrawn ? words.keptMessage : words.noPending,
          tone: 'success',
        });
      },
      onError: error =>
        showDialog({
          title: words.couldNotWithdraw,
          message:
            error instanceof Error ? error.message : s.common.pleaseTryAgain,
          tone: 'danger',
        }),
    });
  }, [s, withdraw, words]);

  /**
   * Turning auto-renew back on is also the store's. The backend hears it as
   * an UNCANCELLATION and the membership reads as active again.
   */
  const handleResume = useCallback(() => {
    showDialog({
      title: words.resume,
      message: words.resumeMessage(storeLabel),
      tone: 'info',
      icon: Store,
      actions: [
        { label: words.notNow, style: 'cancel' },
        { label: words.openStore(storeLabel), onPress: openStore },
      ],
    });
  }, [openStore, storeLabel, words]);

  // Server totals, not the length of a capped shelf: "books opened" is every
  // title the reader has started, finished ones included.
  const booksOpened =
    (library?.readingCount ?? 0) + (library?.finishedCount ?? 0);

  const usage = useMemo(
    () => [
      { value: String(booksOpened), label: words.usage.booksOpened },
      {
        value: String(library?.downloadsCount ?? 0),
        label: words.usage.filesOffline,
      },
      {
        value: String(library?.highlightsCount ?? 0),
        label: words.usage.pagesBookmarked,
      },
    ],
    [booksOpened, library?.downloadsCount, library?.highlightsCount, words],
  );

  if (!isLoading && !isMember) {
    return (
      <ProfileSubScreenLayout title={words.membershipTitle} gap={0}>
        <MembershipPaywall
          options={options}
          features={features}
          reason={reason}
          unavailable={unavailable}
          isPurchasing={purchase.isPending}
          isRestoring={isRestoring}
          onSubscribe={handleSubscribe}
          onRestore={handleRestore}
        />
      </ProfileSubScreenLayout>
    );
  }

  const plan = subscription?.plan;

  // The store's price for the plan the reader holds, where the two can be
  // matched. No match means no price line — a number nobody is charging is
  // worse than none.
  const heldOption = options.find(
    option => option.purchasable?.productId === plan?.revenuecat_product_id,
  );

  // A cancelled membership does not renew, so saying "renews on" would be a
  // plain untruth on the one screen that has to be exact about dates.
  const ending = reason === 'cancelled_paid_through';
  const trialing = reason === 'trial';

  return (
    <ProfileSubScreenLayout title={words.title} gap={20}>
      {/* A failing card or a membership running out still reads books — the
          notice says so without taking anything away. */}
      <MembershipNotice reason={reason} expiresAt={expiresAt} />

      <View style={[styles.planCard, { borderColor: colors.goldBorder }]}>
        <LinearGradient
          angle={140}
          stops={[
            { offset: 0, color: colors.gold, opacity: 0.16 },
            { offset: 1, color: colors.background, opacity: 0.95 },
          ]}
        />

        <View style={styles.planHeader}>
          <View style={styles.planText}>
            <Label tone="gold" tracking={1.4}>
              {words.currentPlan}
            </Label>
            <Display size={30}>{plan?.name ?? words.premium}</Display>
            {heldOption ? (
              <Text size={13.5} leading={1.2} tone="muted">
                {`${heldOption.priceString}${plan?.interval ? ` / ${plan.interval}` : ''}`}
              </Text>
            ) : null}
          </View>
          <Badge
            label={
              ending ? words.ending : trialing ? words.trial : words.active
            }
            tone="primary"
            bordered
          />
        </View>

        <Divider />

        <DetailRow
          label={
            ending
              ? words.accessUntil
              : trialing
                ? words.trialEnds
                : words.renewsOn
          }
          // `null` is a lifetime comp or an admin — nothing to show a date for.
          value={accessUntil ?? words.neverExpires}
        />
        <DetailRow
          label={words.billing}
          value={plan?.interval ? words.interval(plan.interval) : '—'}
        />
      </View>

      <View style={styles.section}>
        <Label size={fontSize.labelSmall + 0.5} tracking={1.5}>
          {words.whatsIncluded}
        </Label>
        <Card tone="surface" padded={16} gap={10}>
          {(plan?.features?.length ? plan.features : words.includes).map(
            feature => (
              <View key={feature} style={styles.feature}>
                <Icon icon={Check} size={13} tone="primary" strokeWidth={2.6} />
                <Text
                  size={fontSize.bodySmall}
                  leading={1.3}
                  tone="soft"
                  style={styles.grow}
                >
                  {feature}
                </Text>
              </View>
            ),
          )}
        </Card>
      </View>

      <View style={styles.section}>
        <Label size={fontSize.labelSmall + 0.5} tracking={1.5}>
          {words.thisMonth}
        </Label>
        <View style={styles.usage}>
          {usage.map(stat => (
            <StatTile key={stat.label} value={stat.value} label={stat.label} />
          ))}
        </View>
      </View>

      {/* The reader asked to cancel and the store has not confirmed. Said
          plainly, because the membership still renews until it does — and a
          reader who believes they have cancelled is the one who gets a charge
          they did not expect. */}
      {availability === 'pending' ? (
        <Callout
          title={words.notFinished}
          message={words.notFinishedMessage(storeLabel, accessUntil)}
          tone="warning"
          icon={Hourglass}
          action={
            <View style={styles.calloutActions}>
              <Button
                label={words.openStore(storeLabel)}
                variant="secondary"
                size="sm"
                onPress={openStore}
              />
              <TextButton
                label={
                  withdraw.isPending ? words.keeping : words.keepMyMembership
                }
                tone="muted"
                disabled={withdraw.isPending}
                onPress={handleKeep}
              />
            </View>
          }
        />
      ) : null}

      <View style={styles.footer}>
        {/* The store confirmed: paid through the date above, and the way back
            is the store's auto-renew switch. */}
        {availability === 'ending' ? (
          <Button
            label={words.resume}
            variant="secondary"
            size="md"
            onPress={handleResume}
          />
        ) : null}
        {/* Only offered when the store is actually selling something else, and
            labelled with that package's own price rather than a saving the app
            has worked out for itself. */}
        {options
          .filter(option => option.purchasable && option.id !== heldOption?.id)
          .map(option => (
            <Button
              key={option.id}
              label={words.switchTo(option.name, option.priceString)}
              variant="secondary"
              size="md"
              disabled={purchase.isPending}
              onPress={() => handleSubscribe(option)}
            />
          ))}
        <View style={styles.footerLinks}>
          <TextButton
            label={words.paymentMethod}
            tone="muted"
            onPress={() =>
              showDialog({
                title: words.paymentMethod,
                message: words.paymentMethodMessage,
                tone: 'info',
                icon: CreditCard,
              })
            }
          />
          <TextButton
            label={isRestoring ? words.restoring : words.restorePurchases}
            tone="muted"
            disabled={isRestoring}
            onPress={handleRestore}
          />
          {/* Nothing to cancel for an admin without a subscription, a lapsed
              reader, or one whose request is pending — and a comp gets the
              support dialog rather than a store sheet with nothing in it. */}
          {availability === 'cancellable' ||
          availability === 'not_store_managed' ? (
            <TextButton
              label={
                cancel.isPending ? words.openingStore : words.cancelMembership
              }
              tone="danger"
              disabled={cancel.isPending}
              onPress={handleCancel}
            />
          ) : null}
        </View>
      </View>
    </ProfileSubScreenLayout>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text size={13.5} leading={1} tone="muted">
        {label}
      </Text>
      <Text size={13.5} leading={1} weight="500">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  planCard: {
    borderRadius: radius.cardLarge,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
    padding: 20,
    gap: 16,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  planText: {
    gap: 7,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  section: {
    gap: 11,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  grow: {
    flex: 1,
  },
  usage: {
    flexDirection: 'row',
    gap: 11,
  },
  footer: {
    gap: 14,
    paddingTop: 4,
  },
  footerLinks: {
    alignItems: 'center',
    gap: 12,
  },
  calloutActions: {
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
  },
});
