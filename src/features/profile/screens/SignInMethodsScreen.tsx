import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyRound, Link2, MailCheck, MailWarning } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  Button,
  Callout,
  SettingsGroup,
  SettingsRow,
  showDialog,
  Text,
} from '@/components/ui';
import { GoogleLogoIcon } from '@/features/auth/components/GoogleLogoIcon';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import type { ProfileStackParamList } from '@/features/profile/navigation/types';
import { useSignInMethods } from '@/hooks/useSignInMethods';
import { GoogleSignInCancelled, isGoogleSignInAvailable } from '@/lib/supabase';
import { fontSize } from '@/theme/typography';

/**
 * Sign-in methods.
 *
 * One account, two doors: the email/password the reader signed up with, and
 * Google. A reader who signed up with a password can add Google here — once
 * their address is verified, because a Google account must not be attachable
 * to an address nobody has proven they own — and a reader who came in through
 * Google sees that, and can drop it only while a password remains.
 */
export function SignInMethodsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { methods, link, unlink, resendVerification } = useSignInMethods();
  const data = methods.data;
  const googleAvailable = isGoogleSignInAvailable();

  const handleResend = useCallback(() => {
    if (!data?.email) {
      return;
    }
    resendVerification.mutate(data.email, {
      onSuccess: () =>
        showDialog({
          title: 'Verification email sent',
          message: `Open the link on this phone, or enter the code at sign-in, to verify ${data.email}.`,
          tone: 'success',
          icon: MailCheck,
        }),
      onError: error =>
        showDialog({
          title: 'Could not send',
          message:
            error instanceof Error
              ? error.message
              : 'Please wait a minute and try again.',
          tone: 'danger',
        }),
    });
  }, [data?.email, resendVerification]);

  const handleLink = useCallback(() => {
    if (!data) {
      return;
    }
    if (!data.emailVerified) {
      showDialog({
        title: 'Verify your email first',
        message:
          'Linking Google needs the email on this account to be verified, so that a Google account can only be attached by whoever owns the address.',
        tone: 'warning',
        icon: MailWarning,
        actions: [
          { label: 'Not now', style: 'cancel' },
          { label: 'Send verification email', onPress: handleResend },
        ],
      });
      return;
    }

    link.mutate(undefined, {
      onSuccess: result =>
        showDialog({
          title: 'Google linked',
          message: result.googleEmail
            ? `You can now sign in with ${result.googleEmail} as well as your password.`
            : 'You can now sign in with Google as well as your password.',
          tone: 'success',
          icon: Link2,
        }),
      onError: error => {
        if (error instanceof GoogleSignInCancelled) {
          return;
        }
        showDialog({
          title: 'Could not link Google',
          message: error instanceof Error ? error.message : 'Please try again.',
          tone: 'danger',
        });
      },
    });
  }, [data, handleResend, link]);

  const handleUnlink = useCallback(() => {
    if (!data) {
      return;
    }
    if (!data.hasPassword) {
      showDialog({
        title: 'Google is your only way in',
        message:
          'This account has no password yet. Set one first, then Google can be removed.',
        tone: 'warning',
        icon: KeyRound,
      });
      return;
    }
    showDialog({
      title: 'Remove Google?',
      message:
        'You will sign in with your email and password only. You can link Google again at any time.',
      actions: [
        { label: 'Keep', style: 'cancel' },
        {
          label: 'Remove',
          style: 'destructive',
          onPress: () =>
            unlink.mutate(undefined, {
              onError: error =>
                showDialog({
                  title: 'Could not remove Google',
                  message:
                    error instanceof Error
                      ? error.message
                      : 'Please try again.',
                  tone: 'danger',
                }),
            }),
        },
      ],
    });
  }, [data, unlink]);

  return (
    <ProfileSubScreenLayout
      title="Sign-in methods"
      subtitle="One account, however you sign in."
    >
      {data && !data.emailVerified ? (
        <Callout
          title="Email not verified"
          message={`We have not yet confirmed ${data.email ?? 'your address'}. Verify it to link Google and to recover your account.`}
          tone="warning"
          icon={MailWarning}
          action={
            <Button
              label={
                resendVerification.isPending
                  ? 'Sending…'
                  : 'Send verification email'
              }
              size="sm"
              variant="secondary"
              onPress={handleResend}
              loading={resendVerification.isPending}
            />
          }
        />
      ) : null}

      <SettingsGroup title="Email">
        <SettingsRow
          title={data?.email ?? (methods.isPending ? 'Loading…' : '—')}
          subtitle={
            data
              ? data.emailVerified
                ? data.hasPassword
                  ? 'Verified · password sign-in'
                  : 'Verified · no password set'
                : 'Not verified'
              : undefined
          }
          icon={data?.emailVerified ? MailCheck : MailWarning}
          iconTone={data?.emailVerified ? 'primary' : 'warning'}
          chevron={false}
        />
        <SettingsRow
          title="Change email address"
          subtitle="A code to your current address and one to the new"
          onPress={() => navigation.navigate('ChangeEmail')}
        />
      </SettingsGroup>

      <SettingsGroup title="Google">
        <SettingsRow
          title={
            data?.google.linked ? (data.google.email ?? 'Linked') : 'Not linked'
          }
          subtitle={
            !googleAvailable
              ? 'Not available in this build'
              : data?.google.linked
                ? 'Sign in with one tap'
                : 'Add Google to sign in without a password'
          }
          trailing={<GoogleLogoIcon size={18} />}
          chevron={false}
        />
        <View style={styles.actions}>
          {data?.google.linked ? (
            <Button
              label={unlink.isPending ? 'Removing…' : 'Remove Google'}
              variant="secondary"
              size="md"
              onPress={handleUnlink}
              loading={unlink.isPending}
              disabled={!data}
            />
          ) : (
            <Button
              label={link.isPending ? 'Opening Google…' : 'Link Google'}
              size="md"
              onPress={handleLink}
              loading={link.isPending}
              disabled={!data || !googleAvailable}
            />
          )}
        </View>
      </SettingsGroup>

      <Text size={fontSize.caption} tone="muted" style={styles.note}>
        Signing in with Google using the same verified email as an existing
        account always lands on that account — you never end up with two.
      </Text>
    </ProfileSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  actions: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
  },
  note: {
    paddingHorizontal: 4,
  },
});
