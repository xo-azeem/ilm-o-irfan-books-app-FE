import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';

import { Button, SettingsGroup, SettingsRow } from '@/components/ui';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import {
  accountSecurityRows,
  legalRows,
  privacyOptions,
} from '@/features/profile/data/profileContent';

const PRIVACY_POLICY_URL = 'https://ilmoirfan.com/privacy';
const TERMS_URL = 'https://ilmoirfan.com/terms';

/**
 * Privacy & security.
 *
 * The three privacy toggles, then the account and legal rows a store review
 * expects to find here — including account deletion, which both stores now
 * require to be reachable in-app.
 */
export function PrivacySecurityScreen() {
  const [options, setOptions] = useState(() =>
    Object.fromEntries(privacyOptions.map(option => [option.id, option.defaultValue])),
  );

  const setOption = useCallback((id: string, value: boolean) => {
    setOptions(current => ({ ...current, [id]: value }));
  }, []);

  const openUrl = useCallback((url: string) => {
    void Linking.openURL(url).catch(() =>
      Alert.alert('Could not open link', 'Please try again from a browser.'),
    );
  }, []);

  const handleSecurityRow = useCallback((id: string) => {
    switch (id) {
      case 'change-password':
        Alert.alert(
          'Change password',
          'We will email you a secure link once password recovery is enabled.',
        );
        break;
      case 'devices':
        Alert.alert('Signed-in devices', 'Signing out here signs you out everywhere.');
        break;
      case 'export':
        Alert.alert(
          'Download my data',
          'We will email a copy of your profile, library and reading history within 30 days.',
        );
        break;
    }
  }, []);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete account?',
      'This removes your profile, library, downloads and reading history. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Request received',
              'Your account will be deleted within 30 days. Sign in before then to cancel.',
            ),
        },
      ],
    );
  }, []);

  return (
    <ProfileSubScreenLayout
      title="Privacy & security"
      subtitle="You decide what leaves this device.">
      <SettingsGroup>
        {privacyOptions.map(option => (
          <SettingsRow
            key={option.id}
            title={option.label}
            subtitle={option.description}
            toggle={{
              value: options[option.id] ?? option.defaultValue,
              onValueChange: value => setOption(option.id, value),
            }}
          />
        ))}
      </SettingsGroup>

      <SettingsGroup title="Account security">
        {accountSecurityRows.map(row => (
          <SettingsRow
            key={row.id}
            title={row.label}
            value={row.value}
            onPress={() => handleSecurityRow(row.id)}
          />
        ))}
      </SettingsGroup>

      <SettingsGroup title="Legal">
        {legalRows.map(row => (
          <SettingsRow
            key={row.id}
            title={row.label}
            onPress={() => openUrl(row.id === 'terms' ? TERMS_URL : PRIVACY_POLICY_URL)}
          />
        ))}
      </SettingsGroup>

      <Button label="Delete account" variant="danger" size="md" onPress={handleDelete} />
    </ProfileSubScreenLayout>
  );
}
