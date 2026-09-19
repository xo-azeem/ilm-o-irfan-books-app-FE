import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyRound } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/app/navigation/types';
import { Button, showDialog, Text, TextButton } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { AuthField } from '@/features/auth/components/AuthField';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { useStrings } from '@/i18n';
import { resumeAfterAuth, waitForAccessCheck } from '@/lib/access';
import {
  describeAuthError,
  requestPasswordReset,
  resetPasswordWithCode,
  setNewPassword,
} from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { fontSize } from '@/theme/typography';

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Set a new password.
 *
 * Two ways in, one form. From the email's six-digit code: the code proves the
 * address (a `recovery` OTP, which also signs the reader in) and the password
 * is set on that session — usually on the shared code screen first, which
 * then lands here with `viaLink` set, since the session already exists; the
 * inline code fields remain for a reader who arrives with a code in hand.
 * From the email's link opened on this phone: AuthLinkProvider has already
 * set the session, so only the password is asked for. Either way the reader ends up signed in with the new password,
 * on every device — Supabase keeps the other sessions, which is why the
 * Signed-in devices screen exists.
 */
export function ResetPasswordScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ResetPassword'>>();
  const { email: initialEmail, viaLink = false, returnTo } = route.params;

  const sessionEmail = useAuthStore(state => state.email);
  const s = useStrings();
  const [email, setEmail] = useState(initialEmail ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setTimeout(() => setCooldown(current => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const validatePassword = useCallback((): boolean => {
    if (password.length < 8) {
      showDialog({
        title: s.auth.weakPassword,
        message: s.auth.passwordTooShort,
        tone: 'warning',
      });
      return false;
    }
    if (password !== confirm) {
      showDialog({
        title: s.auth.passwordMismatch,
        message: s.auth.passwordsDoNotMatchLong,
        tone: 'warning',
      });
      return false;
    }
    return true;
  }, [confirm, password, s]);

  const finish = useCallback(async () => {
    const userId = useAuthStore.getState().userId;
    if (userId) {
      await waitForAccessCheck(userId);
    }
    showDialog({
      title: s.auth.reset.updatedTitle,
      message: s.auth.reset.updatedMessage,
      tone: 'success',
      icon: KeyRound,
    });
    resumeAfterAuth(navigation, returnTo);
  }, [navigation, returnTo, s]);

  const handleSave = useCallback(async () => {
    if (!validatePassword()) {
      return;
    }
    if (!viaLink) {
      const digits = code.replace(/\D/g, '');
      if (!email.trim() || digits.length < 6) {
        showDialog({
          title: s.auth.reset.enterCodeTitle,
          message: s.auth.reset.enterCodeMessage,
          tone: 'warning',
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      if (viaLink) {
        await setNewPassword(password);
      } else {
        await resetPasswordWithCode(email, code, password);
      }
      await finish();
    } catch (error) {
      showDialog({
        title: s.auth.reset.failedTitle,
        message: describeAuthError(error, s.auth.reset.failedFallback),
        tone: 'danger',
      });
    } finally {
      setIsSaving(false);
    }
  }, [code, email, finish, password, s, validatePassword, viaLink]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || isResending || !email.trim()) {
      return;
    }
    setIsResending(true);
    try {
      await requestPasswordReset(email);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      showDialog({
        title: s.auth.reset.emailSent,
        message: s.auth.reset.newCodeOnWay(email.trim()),
        tone: 'success',
      });
    } catch (error) {
      showDialog({
        title: s.auth.reset.couldNotResend,
        message: describeAuthError(error, s.auth.login.waitAMinute),
        tone: 'danger',
      });
    } finally {
      setIsResending(false);
    }
  }, [cooldown, email, isResending, s]);

  return (
    <AuthLayout
      title={s.auth.reset.title}
      subtitle={
        viaLink
          ? s.auth.reset.confirmedSubtitle(
              sessionEmail ?? initialEmail ?? s.auth.reset.yourAccount,
            )
          : s.auth.reset.codeSubtitle(initialEmail ?? null)
      }
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      footer={
        viaLink ? undefined : (
          <View style={styles.footer}>
            <Text size={fontSize.bodySmall} leading={1} tone="muted">
              {s.auth.reset.noCode}
            </Text>
            <TextButton
              label={
                cooldown > 0
                  ? s.auth.reset.resendIn(cooldown)
                  : isResending
                    ? s.auth.forgot.sending
                    : s.auth.reset.resendEmail
              }
              onPress={handleResend}
              disabled={cooldown > 0 || isResending}
              size={fontSize.bodySmall}
            />
          </View>
        )
      }
    >
      <View style={styles.fields}>
        {!viaLink ? (
          <>
            <AuthField
              label={s.auth.email}
              value={email}
              onChangeText={setEmail}
              placeholder={s.auth.emailPlaceholder}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              editable={!isSaving && !initialEmail}
            />
            <AuthField
              label={s.auth.reset.resetCode}
              value={code}
              onChangeText={value =>
                setCode(value.replace(/\D/g, '').slice(0, 6))
              }
              placeholder={s.auth.reset.resetCodePlaceholder}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={6}
              editable={!isSaving}
            />
          </>
        ) : null}

        <AuthField
          label={s.auth.reset.newPassword}
          value={password}
          onChangeText={setPassword}
          placeholder={s.auth.atLeastEightCharacters}
          secure
          textContentType="newPassword"
          autoComplete="new-password"
          editable={!isSaving}
        />
        <AuthField
          label={s.auth.reset.confirmNewPassword}
          value={confirm}
          onChangeText={setConfirm}
          placeholder={s.auth.reset.typeItAgain}
          secure
          textContentType="newPassword"
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={handleSave}
          editable={!isSaving}
        />
      </View>

      <Button
        label={isSaving ? s.common.saving : s.auth.reset.setNewPassword}
        onPress={handleSave}
        loading={isSaving}
      />

      {!viaLink ? (
        <View style={styles.back}>
          <TextButton
            label={s.auth.forgot.backToSignIn}
            tone="muted"
            onPress={() =>
              navigation.navigate(
                ROUTES.LOGIN,
                returnTo ? { returnTo } : undefined,
              )
            }
          />
        </View>
      ) : null}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 14,
  },
  back: {
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
});
