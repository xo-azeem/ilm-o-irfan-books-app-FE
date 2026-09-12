import { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  Badge,
  DiagonalTexture,
  Display,
  Icon,
  Label,
  LinearGradient,
  RadialGlow,
  RadioDot,
  Text,
} from '@/components/ui';
import { Check } from 'lucide-react-native';
import { membershipBenefits } from '@/features/profile/data/profileContent';
import { reasonCopy } from '@/services/entitlements';
import type { AccessReason } from '@/services/api/types';
import type { MembershipOption } from '@/hooks/useBilling';
import { radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/**
 * The membership offer.
 *
 * This is the only gold screen in the app, and the only place a gradient button
 * appears. That scarcity is what makes it read as a threshold rather than as
 * another page.
 *
 * Two rules hold the content together:
 *
 *   · every price shown is the store's own localized `priceString`. Nothing here
 *     formats a currency or reads `plans.price_cents` — that column is catalogue
 *     copy, and a button quoting it would name a figure the store is not about
 *     to charge.
 *   · the heading and the blurb are driven by `reason`, which is why a lapsed
 *     member is asked to renew while a newcomer gets the full pitch. `reason`
 *     never decides anything; it only decides the wording.
 */
export const MembershipPaywall = memo(function MembershipPaywall({
  options,
  features,
  reason,
  unavailable,
  isPurchasing,
  isRestoring,
  onSubscribe,
  onRestore,
}: {
  /** The packages the store is actually offering. Empty means nothing to sell. */
  options: MembershipOption[];
  /** The plan's own `features[]`, for the pitch bullets. */
  features: string[];
  /** Why the reader is here — never subscribed, lapsed, expired. Copy only. */
  reason: AccessReason | null;
  /** No store key, no current offering, or the store could not be reached. */
  unavailable?: boolean;
  isPurchasing?: boolean;
  isRestoring?: boolean;
  onSubscribe: (option: MembershipOption) => void;
  onRestore?: () => void;
}) {
  const { colors } = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Lead with the recommended plan once the offering lands, without overriding
  // a choice the reader has already made.
  useEffect(() => {
    setSelectedId(current => {
      if (current && options.some(option => option.id === current)) {
        return current;
      }
      return (
        (options.find(option => option.recommended) ?? options[0])?.id ?? null
      );
    });
  }, [options]);

  const chosen = options.find(option => option.id === selectedId) ?? null;

  const handleSubscribe = useCallback(() => {
    if (chosen) {
      onSubscribe(chosen);
    }
  }, [chosen, onSubscribe]);

  // The plan's own bullets where it has them, the app's standing list otherwise,
  // so an admin can rewrite the pitch without a release and nothing goes blank
  // if they have not.
  const bullets = chosen?.features.length
    ? chosen.features
    : features.length
      ? features
      : membershipBenefits;

  const copy = reasonCopy(reason);
  // A reader who has subscribed before is being asked to come back, not sold to
  // from scratch — `reason` is what tells those two apart.
  const returning = reason === 'lapsed' || reason === 'expired';

  return (
    <View style={styles.root}>
      <RadialGlow
        color={colors.gold}
        opacity={0.22}
        size={520}
        top={-160}
        style={styles.glow}
      />
      <DiagonalTexture
        color={colors.gold}
        opacity={0.05}
        angle={120}
        spacing={18}
      />

      <View style={styles.content}>
        <Label tone="gold" tracking={1.5}>
          Membership
        </Label>

        <Display size="hero" leading={1.08}>
          {returning
            ? 'Pick up where\nyou left off.'
            : 'Unlimited reading.\nOne membership.'}
        </Display>

        <Text size={14.5} leading={1.6} tone="muted">
          {returning
            ? copy.message
            : 'Full access to the whole Ilm-o-Irfan catalogue, offline on every device you own.'}
        </Text>

        <View style={styles.benefits}>
          {bullets.map(benefit => (
            <View key={benefit} style={styles.benefit}>
              <Icon icon={Check} size={13} tone="gold" strokeWidth={2.6} />
              <Text
                size={fontSize.bodySmall}
                leading={1.3}
                tone="soft"
                style={styles.grow}
              >
                {benefit}
              </Text>
            </View>
          ))}
        </View>

        {options.length > 0 ? (
          <View style={styles.plans}>
            {options.map(option => (
              <PlanCard
                key={option.id}
                id={option.id}
                name={option.name}
                price={option.priceString}
                detail={detailFor(option)}
                badge={option.recommended ? 'RECOMMENDED' : undefined}
                selected={selectedId === option.id}
                onSelect={setSelectedId}
              />
            ))}
          </View>
        ) : null}

        {unavailable ? (
          <Text size={12.5} leading={1.5} align="center" tone="muted">
            Membership cannot be purchased on this device right now. Check your
            connection and try again.
          </Text>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                chosen ? `Subscribe for ${chosen.priceString}` : 'Subscribe'
              }
              accessibilityState={{
                disabled: !chosen || Boolean(isPurchasing),
              }}
              disabled={!chosen || isPurchasing}
              onPress={handleSubscribe}
              style={({ pressed }) => [
                styles.cta,
                (pressed || isPurchasing) && styles.pressed,
              ]}
            >
              <LinearGradient
                angle={120}
                stops={[
                  { offset: 0, color: colors.goldBright },
                  { offset: 1, color: colors.gold },
                ]}
              />
              <Text size={fontSize.body} leading={1} weight="700" tone="onGold">
                {isPurchasing
                  ? 'Opening the store…'
                  : chosen
                    ? `Subscribe · ${chosen.priceString}`
                    : 'Subscribe'}
              </Text>
            </Pressable>

            {/* The store's price, stated once more in words, and the store's own
                cancellation route — which is the only one that works. */}
            <Text size={11.5} leading={1.5} align="center" tone="faint">
              {chosen
                ? `${chosen.priceString}${chosen.interval ? ` / ${chosen.interval}` : ''}, billed by the store. Cancel any time from your store subscriptions.`
                : 'Billed by the store. Cancel any time from your store subscriptions.'}
            </Text>
          </>
        )}

        {onRestore ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: Boolean(isRestoring) }}
            disabled={isRestoring}
            onPress={onRestore}
            hitSlop={8}
          >
            <Text size={11.5} leading={1.4} align="center" tone="muted">
              {isRestoring ? 'Restoring…' : 'Restore purchase'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

/**
 * The line under a price.
 *
 * The interval comes from the plan the admin maintains; the period the store
 * reports is the fallback, so a plan with no copy still says what it renews on.
 */
function detailFor(option: MembershipOption): string {
  if (option.interval) {
    return `Renews every ${option.interval}. Cancel any time.`;
  }
  if (option.period === 'P1Y') {
    return 'Renews yearly. Cancel any time.';
  }
  if (option.period === 'P1M') {
    return 'Renews monthly. Cancel any time.';
  }
  return 'Cancel any time.';
}

const PlanCard = memo(function PlanCard({
  id,
  name,
  price,
  detail,
  badge,
  selected,
  onSelect,
}: {
  id: string;
  name: string;
  price: string;
  detail: string;
  badge?: string;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const { colors } = useTheme();
  const handlePress = useCallback(() => onSelect(id), [id, onSelect]);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${name}, ${price}, ${detail}`}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.plan,
        {
          borderColor: selected ? colors.goldBorder : colors.border,
          borderWidth: selected ? 1.5 : 1,
        },
        selected && {
          transform: [{ translateY: -2 }],
          shadowColor: colors.gold,
          shadowOpacity: 0.12,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 6,
        },
        pressed && styles.pressed,
      ]}
    >
      {selected ? (
        <LinearGradient
          angle={140}
          stops={[
            { offset: 0, color: colors.gold, opacity: 0.16 },
            { offset: 1, color: colors.background, opacity: 0.95 },
          ]}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.surfaceAlt },
          ]}
        />
      )}

      {badge ? (
        <View style={styles.planBadge}>
          <Badge label={badge} tone="gold" />
        </View>
      ) : null}

      <View style={styles.planBody}>
        <View style={styles.planText}>
          <Text size={fontSize.body} leading={1} weight="500">
            {name}
          </Text>
          <Display size={30}>{price}</Display>
          <Text size={12.5} leading={1.2} tone="muted">
            {detail}
          </Text>
        </View>
        <RadioDot selected={selected} size={24} />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  glow: {
    left: '50%',
    marginLeft: -260,
  },
  content: {
    gap: 18,
  },
  benefits: {
    gap: 11,
    paddingVertical: 4,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  grow: {
    flex: 1,
  },
  plans: {
    gap: 12,
    marginTop: 2,
  },
  plan: {
    borderRadius: radius.cardLarge,
    overflow: 'hidden',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  planBadge: {
    position: 'absolute',
    top: 0,
    left: 20,
  },
  planBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  planText: {
    gap: 7,
  },
  cta: {
    height: 54,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 2,
  },
  pressed: {
    opacity: 0.85,
  },
});
