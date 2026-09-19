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
import { useStrings } from '@/i18n';

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
  const s = useStrings();
  const words = s.profile.notifications;
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
    <ProfileSubScreenLayout title={words.title} subtitle={words.subtitle}>
      {!available ? (
        <Callout
          tone="info"
          title={words.unavailableTitle}
          message={words.unavailableBody}
        />
      ) : permission === 'denied' ? (
        <Callout
          tone="warning"
          title={words.deniedTitle}
          message={words.deniedBody}
          action={
            <TextButton
              label={words.openSettings}
              tone="gold"
              onPress={openSystemSettings}
            />
          }
        />
      ) : permission === 'undetermined' ? (
        <Callout
          tone="info"
          title={words.askTitle}
          message={words.askBody}
          action={<TextButton label={words.turnOn} onPress={askPermission} />}
        />
      ) : null}

      <SettingsGroup title={words.library}>
        <SettingsRow
          title={words.newBooks}
          subtitle={words.newBooksHint}
          toggle={{
            value: newReleases,
            onValueChange: setSwitch('newReleases'),
          }}
        />
        <SettingsRow
          title={words.changes}
          subtitle={isAuthenticated ? words.changesHint : words.changesSignIn}
          toggle={{
            value: libraryUpdates,
            onValueChange: setSwitch('libraryUpdates'),
          }}
        />
      </SettingsGroup>

      <SettingsGroup title={words.account}>
        <SettingsRow
          title={words.membership}
          subtitle={
            isAuthenticated ? words.membershipHint : words.membershipSignIn
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
            {words.footer}
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
