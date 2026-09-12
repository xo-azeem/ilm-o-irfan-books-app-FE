import { useCallback, useMemo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  Display,
  Divider,
  Icon,
  Label,
  LinearGradient,
  StatTile,
  Text,
  TextButton,
} from '@/components/ui';
import { Check } from 'lucide-react-native';
import { MembershipNotice } from '@/features/home/components/MembershipNotice';
import { MembershipPaywall } from '@/features/profile/components/MembershipPaywall';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { subscriptionIncludes } from '@/features/profile/data/profileContent';
import { useLibrary, useSubscription } from '@/hooks/useAccount';
import {
  useMembershipOptions,
  usePurchaseMembership,
  useRestorePurchases,
  type MembershipOption,
} from '@/hooks/useBilling';
import { useAccess } from '@/lib/access';
import { radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-GB', {
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
 */
export function SubscriptionScreen() {
  const { colors } = useTheme();
  const { data: subscription, isLoading } = useSubscription();
  const { data: library } = useLibrary();
  const { reason, expiresAt } = useAccess();

  const { options, features, unavailable } = useMembershipOptions();
  const purchase = usePurchaseMembership();
  const { restore, isPending: isRestoring } = useRestorePurchases();

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
            Alert.alert(
              'Payment pending',
              'Your store is still processing the payment. Your membership unlocks as soon as it clears — there is nothing more to do.',
            );
          }
          // `purchased` needs no alert: the entitlement has already been
          // re-read, so the screen itself has changed underneath the sheet.
        },
        onError: error =>
          Alert.alert(
            'Purchase failed',
            error instanceof Error ? error.message : 'Please try again.',
          ),
      });
    },
    [purchase],
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
          Alert.alert(
            'Membership restored',
            'Your membership is active on this device.',
          );
          return;
        }
        Alert.alert(
          restored ? 'Almost there' : 'Nothing to restore',
          restored
            ? 'We found your purchase and are still applying it. This usually takes a few seconds.'
            : 'No previous membership was found for this store account.',
        );
      },
      error =>
        Alert.alert(
          'Could not restore',
          error instanceof Error ? error.message : 'Please try again.',
        ),
    );
  }, [restore]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Cancel membership?',
      'You will keep full access until the end of the current period.',
      [
        { text: 'Keep membership', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Manage in store',
              'Cancel from your App Store or Play Store subscriptions.',
            ),
        },
      ],
    );
  }, []);

  // Server totals, not the length of a capped shelf: "books opened" is every
  // title the reader has started, finished ones included.
  const booksOpened =
    (library?.readingCount ?? 0) + (library?.finishedCount ?? 0);

  const usage = useMemo(
    () => [
      { value: String(booksOpened), label: 'BOOKS\nOPENED' },
      { value: String(library?.downloadsCount ?? 0), label: 'FILES\nOFFLINE' },
      {
        value: String(library?.highlightsCount ?? 0),
        label: 'PAGES\nBOOKMARKED',
      },
    ],
    [booksOpened, library?.downloadsCount, library?.highlightsCount],
  );

  if (!isLoading && !isMember) {
    return (
      <ProfileSubScreenLayout title="Membership" gap={0}>
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
    <ProfileSubScreenLayout title="Subscription" gap={20}>
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
              Current plan
            </Label>
            <Display size={30}>{plan?.name ?? 'Premium'}</Display>
            {heldOption ? (
              <Text size={13.5} leading={1.2} tone="muted">
                {`${heldOption.priceString}${plan?.interval ? ` / ${plan.interval}` : ''}`}
              </Text>
            ) : null}
          </View>
          <Badge
            label={ending ? 'ENDING' : trialing ? 'TRIAL' : 'ACTIVE'}
            tone="primary"
            bordered
          />
        </View>

        <Divider />

        <DetailRow
          label={
            ending ? 'Access until' : trialing ? 'Trial ends' : 'Renews on'
          }
          // `null` is a lifetime comp or an admin — nothing to show a date for.
          value={expiresAt ? formatDate(expiresAt) : 'Never expires'}
        />
        <DetailRow
          label="Billing"
          value={plan?.interval ? `${plan.interval}ly` : '—'}
        />
      </View>

      <View style={styles.section}>
        <Label size={fontSize.labelSmall + 0.5} tracking={1.5}>
          What’s included
        </Label>
        <Card tone="surface" padded={16} gap={10}>
          {(plan?.features?.length ? plan.features : subscriptionIncludes).map(
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
          This month
        </Label>
        <View style={styles.usage}>
          {usage.map(stat => (
            <StatTile key={stat.label} value={stat.value} label={stat.label} />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        {/* Only offered when the store is actually selling something else, and
            labelled with that package's own price rather than a saving the app
            has worked out for itself. */}
        {options
          .filter(option => option.purchasable && option.id !== heldOption?.id)
          .map(option => (
            <Button
              key={option.id}
              label={`Switch to ${option.name} · ${option.priceString}`}
              variant="secondary"
              size="md"
              disabled={purchase.isPending}
              onPress={() => handleSubscribe(option)}
            />
          ))}
        <View style={styles.footerLinks}>
          <TextButton
            label="Payment method"
            tone="muted"
            onPress={() =>
              Alert.alert(
                'Payment method',
                'Managed by your App Store or Play Store account.',
              )
            }
          />
          <TextButton
            label={isRestoring ? 'Restoring…' : 'Restore purchases'}
            tone="muted"
            disabled={isRestoring}
            onPress={handleRestore}
          />
          <TextButton
            label="Cancel subscription"
            tone="danger"
            onPress={handleCancel}
          />
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
});
