import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';

import {
  Callout,
  Card,
  SettingsGroup,
  SettingsRow,
  Text,
  TextButton,
} from '@/components/ui';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import {
  checkPushPermission,
  pushAvailable,
  requestPushPermission,
  type PushPermission,
} from '@/services/push';
import { useAuthStore } from '@/stores/authStore';
import { usePushStore } from '@/stores/pushStore';

/**
 * Notifications.
 *
 * Three switches, each of which is a real thing on the wire (see
 * `services/push/registry.ts`), and an honest line about the OS: the app can
 * flip its own switches, but only the device decides whether anything is
 * drawn. So the permission state is read on every visit and on every return
 * from the settings app, and the banner at the top says which of the three
 * states we are in.
 */
export function NotificationsScreen() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const newReleases = usePushStore(state => state.newReleases);
  const libraryUpdates = usePushStore(state => state.libraryUpdates);
  const membershipUpdates = usePushStore(state => state.membershipUpdates);
  const setPreference = usePushStore(state => state.setPreference);

  const available = pushAvailable();
  const [permission, setPermission] = useState<PushPermission>('undetermined');

  const readPermission = useCallback(() => {
    void checkPushPermission().then(setPermission);
  }, []);

  // On mount, and again when the reader comes back from the device's
  // settings — that is the only place a "denied" can be undone.
  useEffect(() => {
    readPermission();
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') {
        readPermission();
      }
    });
    return () => subscription.remove();
  }, [readPermission]);

  const askPermission = useCallback(() => {
    usePushStore.getState().markPrompted();
    void requestPushPermission().then(result => {
      setPermission(result);
      if (result === 'granted') {
        usePushStore.getState().requestSync();
      }
    });
  }, []);

  const openSystemSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  // A switch turned on while the OS is not delivering is a promise the app
  // cannot keep, so the same tap also opens whichever door is still open:
  // the prompt if it has never been shown, the device's settings if it has.
  const setSwitch = useCallback(
    (key: 'newReleases' | 'libraryUpdates' | 'membershipUpdates') =>
      (value: boolean) => {
        setPreference(key, value);
        if (!value || !available) {
          return;
        }
        if (permission === 'undetermined') {
          askPermission();
        } else if (permission === 'denied') {
          openSystemSettings();
        }
      },
    [askPermission, available, openSystemSettings, permission, setPreference],
  );

  return (
    <ProfileSubScreenLayout
      title="Notifications"
      subtitle="Choose what reaches your device."
    >
      {!available ? (
        <Callout
          tone="info"
          title="Notifications are not available in this build."
          message="This copy of the app was built without its Firebase project file."
        />
      ) : permission === 'denied' ? (
        <Callout
          tone="warning"
          title="Notifications are off for Ilm o Irfan."
          message="Nothing below will reach you until you turn them on for this app in your device's settings."
          action={
            <TextButton
              label="Open settings"
              tone="gold"
              onPress={openSystemSettings}
            />
          }
        />
      ) : permission === 'undetermined' ? (
        <Callout
          tone="info"
          title="Allow notifications to hear about new books."
          message="Your device will ask once. You can change your mind in its settings at any time."
          action={<TextButton label="Turn on" onPress={askPermission} />}
        />
      ) : null}

      <SettingsGroup title="Library">
        <SettingsRow
          title="New books & collections"
          subtitle="When fresh titles or a new collection arrive"
          toggle={{
            value: newReleases,
            onValueChange: setSwitch('newReleases'),
          }}
        />
        <SettingsRow
          title="Changes to my books"
          subtitle={
            isAuthenticated
              ? 'When a book you have is removed, updated or gets a new edition'
              : 'Sign in to be told when a book you have changes'
          }
          toggle={{
            value: libraryUpdates,
            onValueChange: setSwitch('libraryUpdates'),
          }}
        />
      </SettingsGroup>

      <SettingsGroup title="Account">
        <SettingsRow
          title="Membership"
          subtitle={
            isAuthenticated
              ? 'When your membership starts or ends'
              : 'Sign in to be told about your membership'
          }
          toggle={{
            value: membershipUpdates,
            onValueChange: setSwitch('membershipUpdates'),
          }}
        />
      </SettingsGroup>

      <View style={styles.footer}>
        <Card tone="alt" padded={15}>
          <Text size={12.5} leading={1.55} tone="muted">
            Delivered to this device’s notification tray. Sounds and importance
            for each kind can be tuned in your device’s notification settings.
          </Text>
        </Card>
      </View>
    </ProfileSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: 11,
  },
});
