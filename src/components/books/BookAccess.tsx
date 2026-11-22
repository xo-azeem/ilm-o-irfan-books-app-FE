import { memo } from 'react';
import { StyleSheet } from 'react-native';

import { Badge, Text } from '@/components/ui';
import { useStrings } from '@/i18n';
import { fontSize } from '@/theme/typography';

/**
 * Every book row states its access reality — the reader should never tap
 * through to a paywall they could have seen coming.
 *
 * Three states: already in the reader's library, free for any signed-in
 * reader, or included with membership. `useAccess` + `canOpenCatalogBook`
 * mirror this: free rows open without a subscription; premium rows need one.
 *
 * `books.price_cents` still exists for admin tooling and reporting, and is
 * read here by nothing. Rendering it "only when it is non-zero" would be a
 * trapdoor: one number typed into an admin field and a "buy this book"
 * affordance appears beside a book nobody can buy.
 */
export type BookAccess =
  | { kind: 'membership' }
  | { kind: 'free' }
  | { kind: 'owned' };

export function accessFor(book: {
  isPremium?: boolean;
  inLibrary?: boolean;
}): BookAccess {
  if (book.inLibrary) {
    return { kind: 'owned' };
  }
  if (book.isPremium === false) {
    return { kind: 'free' };
  }
  return { kind: 'membership' };
}

/**
 * The one-line access marker under a title. Gold for membership, green for
 * something the reader already owns, soft for free.
 */
export const AccessLabel = memo(function AccessLabel({
  access,
  variant = 'text',
}: {
  access: BookAccess;
  /** `badge` draws the bordered pill used on the book detail hero. */
  variant?: 'text' | 'badge';
}) {
  const s = useStrings();
  const label =
    access.kind === 'membership'
      ? variant === 'badge'
        ? s.catalog.access.includedWithMembership
        : s.catalog.access.inMembership
      : access.kind === 'free'
        ? s.catalog.access.free
        : s.catalog.access.inYourLibrary;

  const tone =
    access.kind === 'membership'
      ? 'gold'
      : access.kind === 'owned'
        ? 'primary'
        : 'soft';

  if (variant === 'badge') {
    return (
      <Badge
        label={label}
        tone={access.kind === 'membership' ? 'gold' : 'primary'}
        bordered
        // Badge pins itself to the leading edge by default; under a centred
        // title and author it has to sit on the same axis as they do.
        style={styles.centred}
      />
    );
  }

  return (
    <Text
      size={fontSize.labelSmall}
      leading={1}
      weight="600"
      tone={tone}
    >
      {label}
    </Text>
  );
});

const styles = StyleSheet.create({
  centred: {
    alignSelf: 'center',
  },
});
