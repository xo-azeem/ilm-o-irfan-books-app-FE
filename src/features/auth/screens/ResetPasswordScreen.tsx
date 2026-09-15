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
import { resumeAfterAuth, waitForAccessCheck } from '@/lib/access';
import {
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
 * is set on that session. From the email's link opened on this phone:
 * AuthLinkProvider has already set the session, so only the password is
 * asked for. Either way the reader ends up signed in with the new password,
 * on every device — Supabase keeps the other sessions, which is why the
 * Signed-in devices screen exists.
 */
export function ResetPasswordScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ResetPassword'>>();
  const { email: initialEmail, viaLink = false, returnTo } = route.params;

  const sessionEmail = useAuthStore(state => state.email);
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
        title: 'Weak password',
        message: 'Password must be at least 8 characters.',
        tone: 'warning',
      });
      return false;
    }
    if (password !== confirm) {
      showDialog({
        title: 'Password mismatch',
        message: 'The two passwords do not match.',
        tone: 'warning',
      });
      return false;
    }
    return true;
  }, [confirm, password]);

  const finish = useCallback(async () => {
    const userId = useAuthStore.getState().userId;
    if (userId) {
      await waitForAccessCheck(userId);
    }
    showDialog({
      title: 'Password updated',
      message: 'You are signed in with your new password.',
      tone: 'success',
      icon: KeyRound,
    });
    resumeAfterAuth(navigation, returnTo);
  }, [navigation, returnTo]);

  const handleSave = useCallback(async () => {
    if (!validatePassword()) {
      return;
    }
    if (!viaLink) {
      const digits = code.replace(/\D/g, '');
      if (!email.trim() || digits.length < 6) {
        showDialog({
          title: 'Enter the code',
          message:
            'Type your email and the six-digit code from the reset email.',
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
        title: 'Could not reset the password',
        message:
          error instanceof Error
            ? error.message
            : 'The code may be wrong or expired. Request a new one.',
        tone: 'danger',
      });
    } finally {
      setIsSaving(false);
    }
  }, [code, email, finish, password, validatePassword, viaLink]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || isResending || !email.trim()) {
      return;
    }
    setIsResending(true);
    try {
      await requestPasswordReset(email);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      showDialog({
        title: 'Email sent',
        message: `A new code is on its way to ${email.trim()}.`,
        tone: 'success',
      });
    } catch (error) {
      showDialog({
        title: 'Could not resend',
        message:
          error instanceof Error
            ? error.message
            : 'Please wait a minute and try again.',
        tone: 'danger',
      });
    } finally {
      setIsResending(false);
    }
  }, [cooldown, email, isResending]);

  return (
    <AuthLayout
      title="Set a new password."
      subtitle={
        viaLink
          ? `You opened the reset link for ${sessionEmail ?? 'your account'}. Choose a new password below.`
          : `Enter the six-digit code we emailed${initialEmail ? ` to ${initialEmail}` : ''}, then choose a new password.`
      }
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      footer={
        viaLink ? undefined : (
          <View style={styles.footer}>
            <Text size={fontSize.bodySmall} leading={1} tone="muted">
              No code?
            </Text>
            <TextButton
              label={
                cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : isResending
                    ? 'Sending…'
                    : 'Resend email'
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
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              editable={!isSaving && !initialEmail}
            />
            <AuthField
              label="Reset code"
              value={code}
              onChangeText={value =>
                setCode(value.replace(/\D/g, '').slice(0, 6))
              }
              placeholder="123456"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={6}
              editable={!isSaving}
            />
          </>
        ) : null}

        <AuthField
          label="New password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secure
          textContentType="newPassword"
          autoComplete="new-password"
          editable={!isSaving}
        />
        <AuthField
          label="Confirm new password"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Type it again"
          secure
          textContentType="newPassword"
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={handleSave}
          editable={!isSaving}
        />
      </View>

      <Button
        label={isSaving ? 'Saving…' : 'Set new password'}
        onPress={handleSave}
        loading={isSaving}
      />

      {!viaLink ? (
        <View style={styles.back}>
          <TextButton
            label="Back to sign in"
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
