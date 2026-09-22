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
import { useStrings } from '@/i18n';
import {
  describeAuthError,
  GoogleSignInCancelled,
  isGoogleSignInAvailable,
} from '@/lib/supabase';
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
  const s = useStrings();
  const words = s.account.signInMethods;
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
          title: words.verificationSent,
          message: words.verificationSentMessage(data.email ?? ''),
          tone: 'success',
          icon: MailCheck,
        }),
      onError: error =>
        showDialog({
          title: words.couldNotSend,
          message: describeAuthError(error, s.auth.login.waitAMinute),
          tone: 'danger',
        }),
    });
  }, [data?.email, resendVerification, s, words]);

  const handleLink = useCallback(() => {
    if (!data) {
      return;
    }
    if (!data.emailVerified) {
      showDialog({
        title: words.verifyFirst,
        message: words.verifyFirstMessage,
        tone: 'warning',
        icon: MailWarning,
        actions: [
          { label: words.notNow, style: 'cancel' },
          { label: words.sendVerification, onPress: handleResend },
        ],
      });
      return;
    }

    link.mutate(undefined, {
      onSuccess: result =>
        showDialog({
          title: words.googleLinked,
          message: result.googleEmail
            ? words.googleLinkedWith(result.googleEmail)
            : words.googleLinkedMessage,
          tone: 'success',
          icon: Link2,
        }),
      onError: error => {
        if (error instanceof GoogleSignInCancelled) {
          return;
        }
        showDialog({
          title: words.couldNotLink,
          message: describeAuthError(error, s.common.pleaseTryAgain),
          tone: 'danger',
        });
      },
    });
  }, [data, handleResend, link, s, words]);

  const handleUnlink = useCallback(() => {
    if (!data) {
      return;
    }
    // Google is the only identity: removing it would lock the reader out,
    // so the dialog offers the way forward rather than only refusing.
    if (!data.hasPassword) {
      showDialog({
        title: words.onlyWayIn,
        message: words.onlyWayInMessage,
        tone: 'warning',
        icon: KeyRound,
        actions: [
          { label: words.notNow, style: 'cancel' },
          {
            label: words.setPassword,
            onPress: () => navigation.navigate('ChangePassword'),
          },
        ],
      });
      return;
    }
    showDialog({
      title: words.removeGoogle,
      message: words.removeGoogleMessage,
      actions: [
        { label: words.keep, style: 'cancel' },
        {
          label: s.common.remove,
          style: 'destructive',
          onPress: () =>
            unlink.mutate(undefined, {
              onError: error =>
                showDialog({
                  title: words.couldNotRemove,
                  message: describeAuthError(error, s.common.pleaseTryAgain),
                  tone: 'danger',
                }),
            }),
        },
      ],
    });
  }, [data, navigation, s, unlink, words]);

  return (
    <ProfileSubScreenLayout title={words.title} subtitle={words.subtitle}>
      {data && !data.emailVerified ? (
        <Callout
          title={words.notVerified}
          message={words.notVerifiedMessage(data.email ?? words.yourAddress)}
          tone="warning"
          icon={MailWarning}
          action={
            <Button
              label={
                resendVerification.isPending
                  ? words.sending
                  : words.sendVerification
              }
              size="sm"
              variant="secondary"
              onPress={handleResend}
              loading={resendVerification.isPending}
            />
          }
        />
      ) : null}

      <SettingsGroup title={words.emailGroup}>
        <SettingsRow
          title={data?.email ?? (methods.isPending ? words.loading : '—')}
          subtitle={
            data
              ? data.emailVerified
                ? data.hasPassword
                  ? words.verifiedPassword
                  : words.verifiedNoPassword
                : words.notVerifiedShort
              : undefined
          }
          icon={data?.emailVerified ? MailCheck : MailWarning}
          iconTone={data?.emailVerified ? 'primary' : 'warning'}
          chevron={false}
        />
        <SettingsRow
          title={words.changeEmail}
          subtitle={words.changeEmailHint}
          onPress={() => navigation.navigate('ChangeEmail')}
        />
        {/* A reader who came in through Google has no password at all, and
            needs one before Google can be removed — so the row leads with
            setting one rather than changing it. */}
        <SettingsRow
          title={data?.hasPassword ? words.changePassword : words.setPassword}
          subtitle={
            data?.hasPassword ? words.changePasswordHint : words.setPasswordHint
          }
          icon={KeyRound}
          onPress={() => navigation.navigate('ChangePassword')}
        />
      </SettingsGroup>

      <SettingsGroup title={words.googleGroup}>
        <SettingsRow
          title={
            data?.google.linked
              ? (data.google.email ?? words.linked)
              : words.notLinked
          }
          subtitle={
            !googleAvailable
              ? words.notAvailable
              : data?.google.linked
                ? words.oneTap
                : words.addGoogle
          }
          trailing={<GoogleLogoIcon size={18} />}
          chevron={false}
        />
        <View style={styles.actions}>
          {data?.google.linked ? (
            <Button
              label={
                unlink.isPending ? words.removing : words.removeGoogleButton
              }
              variant="secondary"
              size="md"
              onPress={handleUnlink}
              loading={unlink.isPending}
              disabled={!data}
            />
          ) : (
            <Button
              label={link.isPending ? words.openingGoogle : words.linkGoogle}
              size="md"
              onPress={handleLink}
              loading={link.isPending}
              disabled={!data || !googleAvailable}
            />
          )}
        </View>
      </SettingsGroup>

      <Text size={fontSize.caption} tone="muted" style={styles.note}>
        {words.note}
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
