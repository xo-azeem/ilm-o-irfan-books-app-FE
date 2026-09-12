import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Lock } from 'lucide-react-native';

import { Screen } from '@/components/layout';
import { Button, Display, Icon, Text, TextButton } from '@/components/ui';
import type { AccessReason } from '@/services/api/types';
import { reasonCopy } from '@/services/entitlements';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/**
 * The membership ran out while the book was open.
 *
 * Shown over the reader rather than by bouncing back to the catalogue, because
 * the reader did nothing wrong and was mid-sentence. The page they reached is
 * already saved — nothing about locking deletes progress, highlights, saved
 * books or downloads, and renewing puts all of it back exactly as it was.
 */
export const ReaderLocked = memo(function ReaderLocked({
  page,
  reason,
  onRenew,
  onClose,
}: {
  /** The page they reached, so it is visibly not lost. */
  page?: number;
  reason: AccessReason | null;
  onRenew: () => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const copy = reasonCopy(reason);

  return (
    <Screen scrollable={false}>
      <View style={styles.root}>
        <View
          style={[styles.badge, { backgroundColor: colors.primaryFillSoft }]}
        >
          <Icon icon={Lock} size={22} tone="primary" />
        </View>

        <Display size={26} align="center">
          {copy.title}
        </Display>

        <Text
          size={fontSize.bodySmall}
          leading={1.7}
          tone="muted"
          align="center"
        >
          {copy.message}
        </Text>

        {page && page > 1 ? (
          <Text
            size={fontSize.caption}
            leading={1.6}
            tone="soft"
            align="center"
          >
            {`You were on page ${page}. It is saved.`}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Button label="Renew membership" onPress={onRenew} size="md" />
          <TextButton label="Back to library" tone="muted" onPress={onClose} />
        </View>
      </View>
    </Screen>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 12,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actions: {
    alignSelf: 'stretch',
    gap: 12,
    marginTop: 18,
  },
});
