import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MailCheck } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/app/navigation/types';
import { Button, showDialog, Text, TextButton } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { AuthField } from '@/features/auth/components/AuthField';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { resumeAfterAuth, waitForAccessCheck } from '@/lib/access';
import { resendSignUpConfirmation, verifyEmailCode } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { fontSize } from '@/theme/typography';

/** Supabase's resend rate limit is per address; a shorter cooldown just fails. */
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Confirm your email.
 *
 * Reached after a sign-up while confirmations are on, and after a sign-in the
 * server refused with `email_not_confirmed`. The email carries two ways in:
 * a link, which lands in AuthLinkProvider when opened on this phone, and a
 * six-digit code, which is what this screen takes — so an email read on a
 * laptop still gets the reader through.
 *
 * Either route ends in a session, and the auth listener does the rest; this
 * screen only has to notice it and move on.
 */
export function VerifyEmailScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'VerifyEmail'>>();
  const { email, returnTo } = route.params;

  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const userId = useAuthStore(state => state.userId);
  const finished = useRef(false);

  // The link path: a session appears without this screen doing anything.
  useEffect(() => {
    if (!userId || finished.current) {
      return;
    }
    finished.current = true;
    void waitForAccessCheck(userId).then(() =>
      resumeAfterAuth(navigation, returnTo),
    );
  }, [navigation, returnTo, userId]);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setTimeout(() => setCooldown(current => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = useCallback(async () => {
    const digits = code.replace(/\D/g, '');
    if (digits.length < 6) {
      showDialog({
        title: 'Enter the code',
        message: 'Type the six-digit code from the email we sent you.',
        tone: 'warning',
      });
      return;
    }

    setIsVerifying(true);
    try {
      const data = await verifyEmailCode(email, digits, 'signup');
      const id = data.user?.id;
      if (id) {
        finished.current = true;
        await waitForAccessCheck(id);
      }
      resumeAfterAuth(navigation, returnTo);
    } catch (error) {
      showDialog({
        title: 'Code not accepted',
        message:
          error instanceof Error
            ? error.message
            : 'The code is wrong or has expired. Request a new one.',
        tone: 'danger',
      });
    } finally {
      setIsVerifying(false);
    }
  }, [code, email, navigation, returnTo]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || isResending) {
      return;
    }
    setIsResending(true);
    try {
      await resendSignUpConfirmation(email);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      showDialog({
        title: 'Email sent',
        message: `A new code is on its way to ${email}. Check spam if it does not arrive.`,
        tone: 'success',
        icon: MailCheck,
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

  const goToSignIn = useCallback(
    () =>
      navigation.navigate(ROUTES.LOGIN, returnTo ? { returnTo } : undefined),
    [navigation, returnTo],
  );

  return (
    <AuthLayout
      title="Check your email."
      subtitle={`We sent a six-digit code and a link to ${email}. Enter the code here, or open the link on this phone.`}
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      footer={
        <View style={styles.footer}>
          <Text size={fontSize.bodySmall} leading={1} tone="muted">
            Wrong address?
          </Text>
          <TextButton
            label="Back to sign in"
            onPress={goToSignIn}
            size={fontSize.bodySmall}
          />
        </View>
      }
    >
      <View style={styles.fields}>
        <AuthField
          label="Verification code"
          value={code}
          onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={6}
          returnKeyType="done"
          onSubmitEditing={handleVerify}
          editable={!isVerifying}
        />
      </View>

      <Button
        label={isVerifying ? 'Verifying…' : 'Verify email'}
        onPress={handleVerify}
        loading={isVerifying}
      />

      <View style={styles.resend}>
        <TextButton
          label={
            cooldown > 0
              ? `Resend in ${cooldown}s`
              : isResending
                ? 'Sending…'
                : 'Resend email'
          }
          tone="muted"
          onPress={handleResend}
          disabled={cooldown > 0 || isResending}
        />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 14,
  },
  resend: {
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
});
