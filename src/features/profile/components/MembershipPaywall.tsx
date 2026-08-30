import { memo, useCallback, useState } from 'react';
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
import {
  membershipBenefits,
  membershipPlans,
} from '@/features/profile/data/profileContent';
import { radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/**
 * The membership offer.
 *
 * This is the only gold screen in the app, and the only place a gradient button
 * appears. That scarcity is what makes it read as a threshold rather than as
 * another page.
 */
export const MembershipPaywall = memo(function MembershipPaywall({
  onSubscribe,
  onRestore,
}: {
  onSubscribe: (planId: string) => void;
  onRestore?: () => void;
}) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState(
    membershipPlans.find(plan => plan.recommended)?.id ?? membershipPlans[0].id,
  );

  const handleSubscribe = useCallback(() => onSubscribe(selected), [onSubscribe, selected]);

  const chosen = membershipPlans.find(plan => plan.id === selected);

  return (
    <View style={styles.root}>
      <RadialGlow
        color={colors.gold}
        opacity={0.22}
        size={520}
        top={-160}
        style={styles.glow}
      />
      <DiagonalTexture color={colors.gold} opacity={0.05} angle={120} spacing={18} />

      <View style={styles.content}>
        <Label tone="gold" tracking={1.5}>
          Membership
        </Label>

        <Display size="hero" leading={1.08}>
          {'Unlimited reading.\nOne membership.'}
        </Display>

        <Text size={14.5} leading={1.6} tone="muted">
          Full access to the whole Ilm-o-Irfan catalogue, offline on every device you own.
        </Text>

        <View style={styles.benefits}>
          {membershipBenefits.map(benefit => (
            <View key={benefit} style={styles.benefit}>
              <Icon icon={Check} size={13} tone="gold" strokeWidth={2.6} />
              <Text size={fontSize.bodySmall} leading={1.3} tone="soft" style={styles.grow}>
                {benefit}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
          {membershipPlans.map(plan => (
            <PlanCard
              key={plan.id}
              id={plan.id}
              name={plan.name}
              price={plan.price}
              detail={plan.detail}
              badge={plan.badge}
              selected={selected === plan.id}
              onSelect={setSelected}
            />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start your free trial"
          onPress={handleSubscribe}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
          <LinearGradient
            angle={120}
            stops={[
              { offset: 0, color: colors.goldBright },
              { offset: 1, color: colors.gold },
            ]}
          />
          <Text size={fontSize.body} leading={1} weight="700" tone="onGold">
            Start 7 days free
          </Text>
        </Pressable>

        <Text size={11.5} leading={1.5} align="center" tone="faint">
          {`Then ${chosen?.price ?? ''} ${chosen?.id === 'yearly' ? '/ year' : '/ month'}. Cancel any time from Profile.`}
        </Text>

        {onRestore ? (
          <Pressable accessibilityRole="button" onPress={onRestore} hitSlop={8}>
            <Text size={11.5} leading={1.4} align="center" tone="muted">
              Restore purchase
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

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
      ]}>
      {selected ? (
        <LinearGradient
          angle={140}
          stops={[
            { offset: 0, color: colors.gold, opacity: 0.16 },
            { offset: 1, color: colors.background, opacity: 0.95 },
          ]}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceAlt }]} />
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
