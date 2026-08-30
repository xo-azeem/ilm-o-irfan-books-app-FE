import { useCallback, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Callout, Card, SettingsGroup, SettingsRow, Text, TextButton } from '@/components/ui';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import {
  notificationGroups,
  quietHoursDefault,
} from '@/features/profile/data/profileContent';

/** The default state, derived once from the content model. */
function initialToggles(): Record<string, boolean> {
  return Object.fromEntries(
    notificationGroups.flatMap(group =>
      group.toggles.map(toggle => [toggle.id, toggle.defaultValue]),
    ),
  );
}

/**
 * Notifications.
 *
 * The four toggles the app has always had, plus the two things a reminder
 * feature genuinely needs: quiet hours, and an honest warning when the OS has
 * notifications switched off entirely.
 */
export function NotificationsScreen() {
  const [toggles, setToggles] = useState(initialToggles);

  // The OS permission state needs a native module to read; until that lands,
  // the banner is a standing reminder that app settings are not the whole story.
  const [systemEnabled] = useState(true);

  const setToggle = useCallback((id: string, value: boolean) => {
    setToggles(current => ({ ...current, [id]: value }));
  }, []);

  const openSystemSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  return (
    <ProfileSubScreenLayout
      title="Notifications"
      subtitle="Choose what you want to be notified about.">
      {notificationGroups.map(group => (
        <SettingsGroup key={group.id} title={group.title}>
          {group.toggles.map(toggle => (
            <SettingsRow
              key={toggle.id}
              title={toggle.label}
              subtitle={toggle.description}
              toggle={{
                value: toggles[toggle.id] ?? toggle.defaultValue,
                onValueChange: value => setToggle(toggle.id, value),
              }}
            />
          ))}
        </SettingsGroup>
      ))}

      <View style={styles.section}>
        <SettingsGroup title="Quiet hours">
          <SettingsRow
            title="No reminders"
            subtitle={`${quietHoursDefault.from} – ${quietHoursDefault.to}`}
            trailing={<TextButton label="Change" onPress={openSystemSettings} />}
            chevron={false}
          />
        </SettingsGroup>
      </View>

      {!systemEnabled ? (
        <Callout
          tone="warning"
          title="System notifications are off for Ilm o Irfan."
          message="Reminders will not appear until you turn them on for this app."
          action={<TextButton label="Open" tone="gold" onPress={openSystemSettings} />}
        />
      ) : (
        <Card tone="alt" padded={15}>
          <Text size={12.5} leading={1.55} tone="muted">
            Reminders respect your quiet hours and your device’s Do Not Disturb.
          </Text>
        </Card>
      )}
    </ProfileSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 11,
  },
});
