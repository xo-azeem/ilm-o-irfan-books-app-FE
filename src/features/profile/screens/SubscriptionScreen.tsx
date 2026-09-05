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
import { MembershipPaywall } from '@/features/profile/components/MembershipPaywall';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { subscriptionIncludes } from '@/features/profile/data/profileContent';
import { useLibrary, useSubscription } from '@/hooks/useAccount';
import { asNumber } from '@/services/mappers';
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
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** `price_cents` is a Postgres `numeric`, which the API serialises as a string. */
function formatPrice(
  cents?: number | string | null,
  currency = 'PKR',
  interval?: string | null,
): string {
  const amount = asNumber(cents);
  if (amount == null) {
    return '—';
  }
  const symbol = currency === 'PKR' ? 'Rs' : currency;
  return `${symbol} ${(amount / 100).toLocaleString('en-US')}${interval ? ` / ${interval}` : ''}`;
}

/**
 * Subscription.
 *
 * A member sees what they have and what it costs; everyone else sees the offer.
 * Usage sits above the exit so cancelling is a considered act rather than a
 * hidden one.
 */
export function SubscriptionScreen() {
  const { colors } = useTheme();
  const { data: subscription, isLoading } = useSubscription();
  const { data: library } = useLibrary();

  const isMember = subscription?.active ?? false;

  const handleSubscribe = useCallback((planId: string) => {
    Alert.alert(
      'Almost there',
      `Checkout for the ${planId} plan opens once billing is connected to the store.`,
    );
  }, []);

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
            Alert.alert('Manage in store', 'Cancel from your App Store or Play Store subscriptions.'),
        },
      ],
    );
  }, []);

  // Server totals, not the length of a capped shelf: "books opened" is every
  // title the reader has started, finished ones included.
  const booksOpened = (library?.readingCount ?? 0) + (library?.finishedCount ?? 0);

  const usage = useMemo(
    () => [
      { value: String(booksOpened), label: 'BOOKS\nOPENED' },
      { value: String(library?.downloadsCount ?? 0), label: 'FILES\nOFFLINE' },
      { value: String(library?.highlightsCount ?? 0), label: 'PAGES\nBOOKMARKED' },
    ],
    [booksOpened, library?.downloadsCount, library?.highlightsCount],
  );

  if (!isLoading && !isMember) {
    return (
      <ProfileSubScreenLayout title="Membership" gap={0}>
        <MembershipPaywall onSubscribe={handleSubscribe} />
      </ProfileSubScreenLayout>
    );
  }

  const plan = subscription?.plan;

  return (
    <ProfileSubScreenLayout title="Subscription" gap={20}>
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
            <Text size={13.5} leading={1.2} tone="muted">
              {formatPrice(plan?.price_cents, plan?.currency ?? 'PKR', plan?.interval)}
            </Text>
          </View>
          <Badge label="ACTIVE" tone="primary" bordered />
        </View>

        <Divider />

        <DetailRow label="Renews on" value={formatDate(subscription?.expiresAt)} />
        <DetailRow label="Billing" value={plan?.interval ? `${plan.interval}ly` : '—'} />
      </View>

      <View style={styles.section}>
        <Label size={fontSize.labelSmall + 0.5} tracking={1.5}>
          What’s included
        </Label>
        <Card tone="surface" padded={16} gap={10}>
          {subscriptionIncludes.map(feature => (
            <View key={feature} style={styles.feature}>
              <Icon icon={Check} size={13} tone="primary" strokeWidth={2.6} />
              <Text size={fontSize.bodySmall} leading={1.3} tone="soft" style={styles.grow}>
                {feature}
              </Text>
            </View>
          ))}
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
        <Button
          label="Switch to yearly · save 34%"
          variant="secondary"
          size="md"
          onPress={() => handleSubscribe('yearly')}
        />
        <View style={styles.footerLinks}>
          <TextButton
            label="Payment method"
            tone="muted"
            onPress={() =>
              Alert.alert('Payment method', 'Managed by your App Store or Play Store account.')
            }
          />
          <TextButton label="Cancel subscription" tone="danger" onPress={handleCancel} />
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
    gap: 11,
    marginTop: 2,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
});
