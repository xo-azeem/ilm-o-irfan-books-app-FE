import { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { LogOut, Smartphone, Tablet, Monitor } from 'lucide-react-native';

import {
  Button,
  Callout,
  IconButton,
  SettingsGroup,
  SettingsRow,
  showDialog,
  Text,
} from '@/components/ui';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { useSessions } from '@/hooks/useSessions';
import { parseDeviceAppVersion, parseDeviceUserAgent } from '@/lib/device';
import type { AuthSession } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize } from '@/theme/typography';

function relative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return '';
  }
  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 2) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function iconFor(label: string) {
  if (/ipad|tablet/i.test(label)) return Tablet;
  if (/browser/i.test(label)) return Monitor;
  return Smartphone;
}

/**
 * Signed-in devices.
 *
 * One row per Supabase session, named from the User-Agent the app sends,
 * with the last time it minted a token. Signing another device out deletes
 * its session on the server: it cannot refresh again, and its current token
 * runs out within the hour. This device is signed out from Profile, which
 * also clears what the app keeps locally.
 */
export function DevicesScreen() {
  const { colors } = useTheme();
  const { sessions, revoke, signOutOthers } = useSessions();
  const rows = sessions.data ?? [];
  const others = rows.filter(session => !session.isCurrent);

  const showError = useCallback((title: string, error: unknown) => {
    showDialog({
      title,
      message:
        error instanceof Error ? error.message : 'Please try again shortly.',
      tone: 'danger',
    });
  }, []);

  const handleRevoke = useCallback(
    (session: AuthSession) => {
      const label = parseDeviceUserAgent(session.userAgent);
      showDialog({
        title: `Sign out ${label}?`,
        message:
          'That device will need to sign in again. It may keep working for up to an hour.',
        actions: [
          { label: 'Keep', style: 'cancel' },
          {
            label: 'Sign out',
            style: 'destructive',
            onPress: () =>
              revoke.mutate(session.id, {
                onError: error => showError('Could not sign it out', error),
              }),
          },
        ],
      });
    },
    [revoke, showError],
  );

  const handleSignOutOthers = useCallback(() => {
    showDialog({
      title: 'Sign out every other device?',
      message: `${others.length} other ${others.length === 1 ? 'device' : 'devices'} will need to sign in again. This one stays signed in.`,
      actions: [
        { label: 'Cancel', style: 'cancel' },
        {
          label: 'Sign them out',
          style: 'destructive',
          onPress: () =>
            signOutOthers.mutate(undefined, {
              onError: error =>
                showError('Could not sign the others out', error),
            }),
        },
      ],
    });
  }, [others.length, showError, signOutOthers]);

  return (
    <ProfileSubScreenLayout
      title="Signed-in devices"
      subtitle="Everywhere your account is open right now."
    >
      {sessions.isPending ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : sessions.error ? (
        <Callout
          title="Could not load devices"
          message={
            sessions.error instanceof Error
              ? sessions.error.message
              : 'Please try again.'
          }
          tone="warning"
          action={
            <Button
              label="Retry"
              size="sm"
              variant="secondary"
              onPress={() => void sessions.refetch()}
            />
          }
        />
      ) : (
        <>
          <SettingsGroup title="This device">
            {rows
              .filter(session => session.isCurrent)
              .map(session => (
                <DeviceRow key={session.id} session={session} />
              ))}
          </SettingsGroup>

          <SettingsGroup
            title={
              others.length === 0
                ? 'Other devices'
                : `Other devices · ${others.length}`
            }
          >
            {others.length === 0 ? (
              <View style={styles.empty}>
                <Text size={fontSize.bodySmall} tone="muted">
                  No other device is signed in.
                </Text>
              </View>
            ) : (
              others.map(session => (
                <DeviceRow
                  key={session.id}
                  session={session}
                  onSignOut={() => handleRevoke(session)}
                  busy={revoke.isPending}
                />
              ))
            )}
          </SettingsGroup>

          {others.length > 0 ? (
            <Button
              label={
                signOutOthers.isPending
                  ? 'Signing out…'
                  : 'Sign out all other devices'
              }
              variant="danger"
              size="md"
              onPress={handleSignOutOthers}
              loading={signOutOthers.isPending}
            />
          ) : null}

          <Text size={fontSize.caption} tone="muted" style={styles.note}>
            Do not recognise a device? Sign it out, then change your password
            from Privacy & security.
          </Text>
        </>
      )}
    </ProfileSubScreenLayout>
  );
}

function DeviceRow({
  session,
  onSignOut,
  busy,
}: {
  session: AuthSession;
  onSignOut?: () => void;
  busy?: boolean;
}) {
  const label = parseDeviceUserAgent(session.userAgent);
  const version = parseDeviceAppVersion(session.userAgent);
  const subtitle = [
    session.isCurrent
      ? 'Active now'
      : `Active ${relative(session.lastActiveAt)}`,
    version ? `app ${version}` : null,
    `signed in ${relative(session.createdAt)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SettingsRow
      title={label}
      subtitle={subtitle}
      icon={iconFor(label)}
      iconTone={session.isCurrent ? 'primary' : 'neutral'}
      chevron={false}
      trailing={
        onSignOut ? (
          <IconButton
            icon={LogOut}
            accessibilityLabel={`Sign out ${label}`}
            onPress={onSignOut}
            disabled={busy}
          />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  empty: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  note: {
    paddingHorizontal: 4,
  },
});
