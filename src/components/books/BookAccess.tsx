import { memo } from 'react';

import { Badge, Text } from '@/components/ui';
import { fontSize } from '@/theme/typography';

/**
 * Every book row states its access reality — the reader should never tap
 * through to a paywall they could have seen coming.
 */
export type BookAccess =
  | { kind: 'membership' }
  | { kind: 'owned' }
  | { kind: 'price'; label: string }
  | { kind: 'free' };

export function accessFor(book: {
  isPremium?: boolean;
  price?: number;
  currency?: string;
  inLibrary?: boolean;
}): BookAccess {
  if (book.inLibrary) {
    return { kind: 'owned' };
  }
  if (book.isPremium) {
    return { kind: 'membership' };
  }
  if (book.price && book.price > 0) {
    return { kind: 'price', label: formatPrice(book.price, book.currency) };
  }
  return { kind: 'free' };
}

export function formatPrice(amount: number, currency = 'PKR'): string {
  const symbol = currency === 'PKR' ? 'Rs' : currency;
  return `${symbol} ${Math.round(amount).toLocaleString('en-US')}`;
}

/**
 * The one-line access marker under a title. Gold for membership, green for
 * something the reader already owns, plain text for a price.
 */
export const AccessLabel = memo(function AccessLabel({
  access,
  variant = 'text',
}: {
  access: BookAccess;
  /** `badge` draws the bordered pill used on the book detail hero. */
  variant?: 'text' | 'badge';
}) {
  if (access.kind === 'free') {
    return null;
  }

  if (access.kind === 'price') {
    return (
      <Text size={fontSize.labelSmall} leading={1} weight="600" tone="muted">
        {access.label}
      </Text>
    );
  }

  const label =
    access.kind === 'membership'
      ? variant === 'badge'
        ? 'INCLUDED WITH MEMBERSHIP'
        : 'IN MEMBERSHIP'
      : 'IN YOUR LIBRARY';

  if (variant === 'badge') {
    return <Badge label={label} tone={access.kind === 'membership' ? 'gold' : 'primary'} bordered />;
  }

  return (
    <Text
      size={fontSize.labelSmall}
      leading={1}
      weight="600"
      tone={access.kind === 'membership' ? 'gold' : 'primary'}>
      {label}
    </Text>
  );
});
