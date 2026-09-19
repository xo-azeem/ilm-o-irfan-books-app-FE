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
import { useDateLocale, useStrings, type Strings } from '@/i18n';
import { parseDeviceAppVersion, parseDeviceUserAgent } from '@/lib/device';
import type { AuthSession } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeContext';
import { fontSize } from '@/theme/typography';

function relative(iso: string, s: Strings, locale: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return '';
  }
  const words = s.account.devices;
  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 2) return words.justNow;
  if (minutes < 60) return words.minAgo(minutes);
  const hours = Math.round(minutes / 60);
  if (hours < 24) return words.hoursAgo(hours);
  const days = Math.round(hours / 24);
  if (days < 30) return words.daysAgo(days);
  return new Date(iso).toLocaleDateString(locale, {
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
  const s = useStrings();
  const words = s.account.devices;
  const { sessions, revoke, signOutOthers } = useSessions();
  const rows = sessions.data ?? [];
  const others = rows.filter(session => !session.isCurrent);

  const showError = useCallback(
    (title: string, error: unknown) => {
      showDialog({
        title,
        message: error instanceof Error ? error.message : words.tryShortly,
        tone: 'danger',
      });
    },
    [words],
  );

  const handleRevoke = useCallback(
    (session: AuthSession) => {
      const label = parseDeviceUserAgent(session.userAgent);
      showDialog({
        title: session.isCurrent
          ? words.signOutThis
          : words.signOutNamed(label),
        message: session.isCurrent
          ? words.thisSessionEnds
          : words.thatDeviceEnds,
        actions: [
          { label: words.keep, style: 'cancel' },
          {
            label: words.signOut,
            style: 'destructive',
            onPress: () =>
              revoke.mutate(session.id, {
                onError: error => showError(words.couldNotSignOut, error),
              }),
          },
        ],
      });
    },
    [revoke, showError, words],
  );

  const handleSignOutOthers = useCallback(() => {
    showDialog({
      title: words.signOutOthersTitle,
      message: words.signOutOthersMessage(others.length),
      actions: [
        { label: s.common.cancel, style: 'cancel' },
        {
          label: words.signThemOut,
          style: 'destructive',
          onPress: () =>
            signOutOthers.mutate(undefined, {
              onError: error => showError(words.couldNotSignOutOthers, error),
            }),
        },
      ],
    });
  }, [others.length, s, showError, signOutOthers, words]);

  return (
    <ProfileSubScreenLayout title={words.title} subtitle={words.subtitle}>
      {sessions.isPending ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : sessions.error ? (
        <Callout
          title={words.couldNotLoad}
          message={
            sessions.error instanceof Error
              ? sessions.error.message
              : s.common.pleaseTryAgain
          }
          tone="warning"
          action={
            <Button
              label={words.retry}
              size="sm"
              variant="secondary"
              onPress={() => void sessions.refetch()}
            />
          }
        />
      ) : (
        <>
          <SettingsGroup title={words.thisDevice}>
            {rows
              .filter(session => session.isCurrent)
              .map(session => (
                <DeviceRow
                  key={session.id}
                  session={session}
                  onSignOut={() => handleRevoke(session)}
                  busy={revoke.isPending}
                />
              ))}
          </SettingsGroup>

          <SettingsGroup
            title={
              others.length === 0
                ? words.otherDevices
                : words.otherDevicesCount(others.length)
            }
          >
            {others.length === 0 ? (
              <View style={styles.empty}>
                <Text size={fontSize.bodySmall} tone="muted">
                  {words.noOther}
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
                  ? words.signingOut
                  : words.signOutAllOthers
              }
              variant="danger"
              size="md"
              onPress={handleSignOutOthers}
              loading={signOutOthers.isPending}
            />
          ) : null}

          <Text size={fontSize.caption} tone="muted" style={styles.note}>
            {words.note}
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
  const s = useStrings();
  const locale = useDateLocale();
  const words = s.account.devices;
  const label = parseDeviceUserAgent(session.userAgent);
  const version = parseDeviceAppVersion(session.userAgent);
  const subtitle = [
    session.isCurrent
      ? words.activeNow
      : words.active(relative(session.lastActiveAt, s, locale)),
    version ? words.app(version) : null,
    words.signedIn(relative(session.createdAt, s, locale)),
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
            accessibilityLabel={words.signOutA11y(label)}
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
