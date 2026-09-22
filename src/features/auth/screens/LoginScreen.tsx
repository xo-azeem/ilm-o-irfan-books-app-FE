import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/app/navigation/types';
import { Button, showDialog, Text, TextButton } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { AuthDivider } from '@/features/auth/components/AuthDivider';
import { AuthField } from '@/features/auth/components/AuthField';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton';
import { useSignupOpen } from '@/hooks/useAppStatus';
import { useStrings } from '@/i18n';
import { resumeAfterAuth, waitForAccessCheck } from '@/lib/access';
import {
  describeAuthError,
  GoogleEmailConflict,
  GoogleSignInCancelled,
  isEmailNotConfirmed,
  isGoogleSignInAvailable,
  sendSignInCode,
  signInWithEmail,
  signInWithGoogle,
} from '@/lib/supabase';
import { fontSize } from '@/theme/typography';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function LoginScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Login'>>();
  const returnTo = route.params?.returnTo;
  const s = useStrings();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleBusy, setIsGoogleBusy] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

  const handleSignIn = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      showDialog({
        title: s.auth.missingDetails,
        message: s.auth.enterEmailAndPassword,
        tone: 'warning',
      });
      return;
    }

    if (!isValidEmail(email)) {
      showDialog({
        title: s.auth.invalidEmail,
        message: s.auth.enterValidEmail,
        tone: 'warning',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await signInWithEmail({ email, password });
      const userId = data.user?.id;
      if (userId) {
        await waitForAccessCheck(userId);
      }
      resumeAfterAuth(navigation, returnTo);
    } catch (error) {
      // Confirmations are on: the account exists, the address is not yet
      // proven. The verify screen resends and takes the code.
      if (isEmailNotConfirmed(error)) {
        navigation.navigate(ROUTES.VERIFY_EMAIL, {
          email: email.trim(),
          ...(returnTo ? { returnTo } : null),
        });
        return;
      }
      showDialog({
        title: s.auth.login.failedTitle,
        message: describeAuthError(error, s.auth.login.failedFallback),
        tone: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [email, navigation, password, returnTo, s]);

  const handleGoogleSignIn = useCallback(async () => {
    if (!isGoogleSignInAvailable()) {
      showDialog({
        title: s.auth.login.googleUnavailableTitle,
        message: s.auth.login.googleUnavailable,
        tone: 'info',
      });
      return;
    }

    setIsGoogleBusy(true);
    try {
      const data = await signInWithGoogle();
      const userId = data.user?.id;
      if (userId) {
        await waitForAccessCheck(userId);
      }
      resumeAfterAuth(navigation, returnTo);
    } catch (error) {
      if (error instanceof GoogleSignInCancelled) {
        return;
      }
      // An unverified account already holds that address: the way in is to
      // confirm it, which the verify screen does and then returns here.
      if (error instanceof GoogleEmailConflict) {
        const conflictEmail = error.googleEmail;
        showDialog({
          title: s.auth.login.googleFailedTitle,
          message: error.message,
          tone: 'warning',
          actions: conflictEmail
            ? [
                { label: s.common.cancel, style: 'cancel' },
                {
                  label: s.auth.login.verifyEmailAction,
                  onPress: () =>
                    navigation.navigate(ROUTES.VERIFY_EMAIL, {
                      email: conflictEmail,
                      ...(returnTo ? { returnTo } : null),
                    }),
                },
              ]
            : undefined,
        });
        return;
      }
      showDialog({
        title: s.auth.login.googleFailedTitle,
        message: describeAuthError(error, s.common.pleaseTryAgain),
        tone: 'danger',
      });
    } finally {
      setIsGoogleBusy(false);
    }
  }, [navigation, returnTo, s]);

  const handleGuest = useCallback(() => {
    // Guest browsing is preserved from the current build: the catalog is open,
    // the reader is what asks for an account.
    navigation.reset({ index: 0, routes: [{ name: ROUTES.MAIN_TABS }] });
  }, [navigation]);

  const goToSignUp = useCallback(
    () =>
      navigation.navigate(ROUTES.SIGN_UP, returnTo ? { returnTo } : undefined),
    [navigation, returnTo],
  );
  // With sign-ups closed the footer offers nothing: a link to a screen that
  // only says no is worse than no link.
  const signupOpen = useSignupOpen();

  /**
   * Sign in without a password: Supabase emails the address a six-digit code
   * and a link, and the code screen takes either. Only for an account that
   * already exists — a mistyped address gets the same neutral answer rather
   * than a fresh account.
   */
  const handleEmailCode = useCallback(async () => {
    if (!isValidEmail(email)) {
      showDialog({
        title: s.auth.login.enterEmailTitle,
        message: s.auth.login.enterEmailForCode,
        tone: 'warning',
      });
      return;
    }
    setIsSendingCode(true);
    try {
      await sendSignInCode(email);
      navigation.navigate(ROUTES.ENTER_CODE, {
        flow: 'signin',
        email: email.trim(),
        ...(returnTo ? { returnTo } : null),
      });
    } catch (error) {
      // `shouldCreateUser: false` refuses an unknown address as "signups not
      // allowed" — Supabase's words for "no such account".
      const unknown =
        error instanceof Error && /signups? not allowed/i.test(error.message);
      showDialog({
        title: unknown
          ? s.auth.login.noAccountTitle
          : s.auth.login.couldNotSendCode,
        message: unknown
          ? s.auth.login.noAccountMessage
          : describeAuthError(error, s.auth.login.waitAMinute),
        tone: unknown ? 'warning' : 'danger',
      });
    } finally {
      setIsSendingCode(false);
    }
  }, [email, navigation, returnTo, s]);

  const handleForgotPassword = useCallback(() => {
    navigation.navigate(ROUTES.FORGOT_PASSWORD, {
      ...(isValidEmail(email) ? { email: email.trim() } : null),
      ...(returnTo ? { returnTo } : null),
    });
  }, [email, navigation, returnTo]);

  return (
    <AuthLayout
      title={s.auth.login.title}
      subtitle={s.auth.login.subtitle}
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      footer={
        signupOpen ? (
          <View style={styles.footer}>
            <Text size={fontSize.bodySmall} leading={1} tone="muted">
              {s.auth.login.newHere}
            </Text>
            <TextButton
              label={s.common.createAccount}
              onPress={goToSignUp}
              size={fontSize.bodySmall}
            />
          </View>
        ) : undefined
      }
    >
      <View style={styles.fields}>
        <AuthField
          label={s.auth.email}
          value={email}
          onChangeText={setEmail}
          placeholder={s.auth.emailPlaceholder}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          returnKeyType="next"
          editable={!isSubmitting}
        />

        <AuthField
          label={s.auth.password}
          value={password}
          onChangeText={setPassword}
          placeholder={s.auth.passwordPlaceholder}
          secure
          textContentType="password"
          autoComplete="password"
          returnKeyType="go"
          onSubmitEditing={handleSignIn}
          editable={!isSubmitting}
        />

        <TextButton
          label={s.auth.login.forgotPassword}
          tone="muted"
          onPress={handleForgotPassword}
          style={styles.forgot}
        />
      </View>

      <Button
        label={isSubmitting ? s.auth.login.signingIn : s.common.signIn}
        onPress={handleSignIn}
        loading={isSubmitting}
      />

      <AuthDivider />

      <View style={styles.alternatives}>
        <GoogleSignInButton
          label={
            isGoogleBusy ? s.auth.openingGoogle : s.auth.continueWithGoogle
          }
          onPress={handleGoogleSignIn}
          disabled={isGoogleBusy || isSubmitting}
        />
        <GoogleSignInButton
          label={
            isSendingCode ? s.auth.login.sendingCode : s.auth.login.emailMeCode
          }
          showLogo={false}
          onPress={handleEmailCode}
          disabled={isSendingCode || isSubmitting}
        />
        <GoogleSignInButton
          label={s.auth.login.continueAsGuest}
          showLogo={false}
          onPress={handleGuest}
        />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 14,
  },
  forgot: {
    alignSelf: 'flex-end',
  },
  alternatives: {
    gap: 11,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
});
