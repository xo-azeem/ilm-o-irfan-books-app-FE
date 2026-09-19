import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { LayoutDashboard, ShieldCheck } from 'lucide-react-native';

import { Button, Card, IconTile, Text } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { fontSize } from '@/theme/typography';
import { useStrings } from '@/i18n';

/**
 * The way back to the admin tool, for an admin using the app as a reader.
 *
 * Sits under the identity block on the profile tab — the one screen that is
 * about the account rather than the catalogue, and so the one place an admin
 * would look for something about their role. It renders nothing for anyone
 * who is not an admin, so the profile screen can mount it unconditionally.
 *
 * It also says, in a line, why this account reads every book without a
 * membership: otherwise an admin checking the paywall would wonder why it
 * never appears for them.
 */
export const AdminSwitchCard = memo(function AdminSwitchCard() {
  const s = useStrings();
  const isAdmin = useAuthStore(state => state.isAdmin);
  const setViewingAsReader = useAuthStore(state => state.setViewingAsReader);

  const backToAdmin = useCallback(
    () => setViewingAsReader(false),
    [setViewingAsReader],
  );

  if (!isAdmin) {
    return null;
  }

  return (
    <Card padded={16} gap={14}>
      <View style={styles.row}>
        <IconTile icon={ShieldCheck} tileTone="primary" />
        <View style={styles.body}>
          <Text size={fontSize.bodySmall} leading={1.3} weight="600">
            {s.profile.adminCard.title}
          </Text>
          <Text size={fontSize.captionSmall} leading={1.45} tone="muted">
            {s.profile.adminCard.body}
          </Text>
        </View>
      </View>
      <Button
        label={s.profile.adminCard.back}
        icon={LayoutDashboard}
        variant="secondary"
        size="md"
        onPress={backToAdmin}
      />
    </Card>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  body: {
    flex: 1,
    gap: 4,
  },
});
