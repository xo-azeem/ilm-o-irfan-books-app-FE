import { memo } from 'react';
import { AlertCircle, CalendarClock, CreditCard } from 'lucide-react-native';

import { Callout } from '@/components/ui';
import type { AccessReason } from '@/services/api/types';
import { reasonCopy } from '@/services/entitlements';

/** The three states that warn without taking anything away. */
const SOFT: Partial<
  Record<AccessReason, { icon: typeof AlertCircle; tone: 'warning' | 'info' }>
> = {
  billing_issue_paid_through: { icon: CreditCard, tone: 'warning' },
  grace: { icon: AlertCircle, tone: 'warning' },
  cancelled_paid_through: { icon: CalendarClock, tone: 'info' },
};

function endsOn(expiresAt: string | null): string | undefined {
  if (!expiresAt) {
    return undefined;
  }
  const parsed = new Date(expiresAt);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * A heads-up, not a wall.
 *
 * A card that is failing and a membership that has been cancelled both still
 * grant access — the first is inside a period already paid for, the second runs
 * to its end date. Blocking either would be taking away something the reader
 * has paid for, so this says what is happening and leaves the library open.
 *
 * Renders nothing for the states that need no warning, which is most of them.
 */
export const MembershipNotice = memo(function MembershipNotice({
  reason,
  expiresAt,
  onPress,
}: {
  reason: AccessReason | null;
  expiresAt: string | null;
  onPress?: () => void;
}) {
  const soft = reason ? SOFT[reason] : undefined;
  if (!reason || !soft) {
    return null;
  }

  const copy = reasonCopy(reason);
  const date = endsOn(expiresAt);

  return (
    <Callout
      title={copy.title}
      message={
        date && reason === 'cancelled_paid_through'
          ? `You keep full access until ${date}.`
          : copy.message
      }
      tone={soft.tone}
      icon={soft.icon}
      onPress={onPress}
    />
  );
});
