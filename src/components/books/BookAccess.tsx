import { memo } from 'react';

import { Badge, Text } from '@/components/ui';
import { fontSize } from '@/theme/typography';

/**
 * Every book row states its access reality — the reader should never tap
 * through to a paywall they could have seen coming.
 *
 * The catalogue is subscription-only. There are two states a book can be in
 * and no others: already in the reader's library, or included with the
 * membership. There is deliberately no free state and no price state —
 * `useAccess` gates opening a book on the membership alone and never consults
 * `is_premium`, so a label that said anything else would be contradicting the
 * gate a tap away.
 *
 * `books.price_cents` still exists for admin tooling and reporting, and is
 * read here by nothing. Rendering it "only when it is non-zero" would be a
 * trapdoor: one number typed into an admin field and a "buy this book"
 * affordance appears beside a book nobody can buy.
 */
export type BookAccess = { kind: 'membership' } | { kind: 'owned' };

export function accessFor(book: {
  /**
   * Not read. Whether a row is flagged premium cannot change what a reader may
   * open, because the membership gate does not look at it either — so a book
   * left unflagged must not advertise itself as free.
   */
  isPremium?: boolean;
  inLibrary?: boolean;
}): BookAccess {
  return book.inLibrary ? { kind: 'owned' } : { kind: 'membership' };
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
