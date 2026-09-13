import { useCallback } from 'react';
import { Linking } from 'react-native';
import {
  Download,
  Hourglass,
  KeyRound,
  Smartphone,
  Trash2,
} from 'lucide-react-native';

import {
  Button,
  SettingsGroup,
  SettingsRow,
  showDialog,
} from '@/components/ui';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import {
  accountSecurityRows,
  legalRows,
} from '@/features/profile/data/profileContent';

const PRIVACY_POLICY_URL = 'https://ilmoirfan.com/privacy';
const TERMS_URL = 'https://ilmoirfan.com/terms';

/**
 * Privacy & security.
 *
 * The account and legal rows a store review expects to find here — including
 * account deletion, which both stores now require to be reachable in-app.
 */
export function PrivacySecurityScreen() {
  const openUrl = useCallback((url: string) => {
    void Linking.openURL(url).catch(() =>
      showDialog({
        title: 'Could not open link',
        message: 'Please try again from a browser.',
        tone: 'warning',
      }),
    );
  }, []);

  const handleSecurityRow = useCallback((id: string) => {
    switch (id) {
      case 'change-password':
        showDialog({
          title: 'Change password',
          message:
            'We will email you a secure link once password recovery is enabled.',
          tone: 'info',
          icon: KeyRound,
        });
        break;
      case 'devices':
        showDialog({
          title: 'Signed-in devices',
          message: 'Signing out here signs you out everywhere.',
          tone: 'info',
          icon: Smartphone,
        });
        break;
      case 'export':
        showDialog({
          title: 'Download my data',
          message:
            'We will email a copy of your profile, library and reading history within 30 days.',
          tone: 'info',
          icon: Download,
        });
        break;
    }
  }, []);

  const handleDelete = useCallback(() => {
    showDialog({
      title: 'Delete account?',
      message:
        'This removes your profile, library, downloads and reading history. It cannot be undone.',
      icon: Trash2,
      actions: [
        { label: 'Cancel', style: 'cancel' },
        {
          label: 'Delete',
          style: 'destructive',
          onPress: () =>
            showDialog({
              title: 'Request received',
              message:
                'Your account will be deleted within 30 days. Sign in before then to cancel.',
              tone: 'info',
              icon: Hourglass,
            }),
        },
      ],
    });
  }, []);

  return (
    <ProfileSubScreenLayout
      title="Privacy & security"
      subtitle="You decide what leaves this device."
    >
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
            onPress={() =>
              openUrl(row.id === 'terms' ? TERMS_URL : PRIVACY_POLICY_URL)
            }
          />
        ))}
      </SettingsGroup>

      <Button
        label="Delete account"
        variant="danger"
        size="md"
        onPress={handleDelete}
      />
    </ProfileSubScreenLayout>
  );
}
