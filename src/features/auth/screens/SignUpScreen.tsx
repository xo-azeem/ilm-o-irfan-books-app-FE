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
  GoogleSignInCancelled,
  isGoogleSignInAvailable,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '@/lib/supabase';
import { fontSize } from '@/theme/typography';

type SignUpForm = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

const initialForm: SignUpForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function SignUpScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'SignUp'>>();
  const returnTo = route.params?.returnTo;
  // An admin can close sign-ups from System → App settings. The screen still
  // exists — a link may point here — but it explains rather than accepts.
  const signupOpen = useSignupOpen();
  const s = useStrings();

  const [form, setForm] = useState<SignUpForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleBusy, setIsGoogleBusy] = useState(false);

  const updateField = useCallback((key: keyof SignUpForm, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
  }, []);

  const validateForm = useCallback((): boolean => {
    if (!form.fullName.trim()) {
      showDialog({
        title: s.auth.missingDetails,
        message: s.auth.enterFullName,
        tone: 'warning',
      });
      return false;
    }
    if (!isValidEmail(form.email)) {
      showDialog({
        title: s.auth.invalidEmail,
        message: s.auth.enterValidEmail,
        tone: 'warning',
      });
      return false;
    }
    if (form.phone.trim().length < 7) {
      showDialog({
        title: s.auth.invalidPhone,
        message: s.auth.enterValidPhone,
        tone: 'warning',
      });
      return false;
    }
    if (form.password.length < 8) {
      showDialog({
        title: s.auth.weakPassword,
        message: s.auth.passwordTooShort,
        tone: 'warning',
      });
      return false;
    }
    if (form.password !== form.confirmPassword) {
      showDialog({
        title: s.auth.passwordMismatch,
        message: s.auth.passwordsDoNotMatch,
        tone: 'warning',
      });
      return false;
    }
    return true;
  }, [form, s]);

  const handleCreateAccount = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      let data = await signUpWithEmail({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });

      // With email confirmation on, `signUp` answers without a session. It
      // also does so for Supabase's enumeration guard — a bare user for an
      // address that already exists — so a password sign-in settles which it
      // was: it either lands the reader in the app, or fails and the verify
      // screen takes over (a real duplicate fails there too, with the real
      // reason, once the reader tries the code).
      if (!data.session) {
        try {
          data = await signInWithEmail({
            email: form.email,
            password: form.password,
          });
        } catch {
          // Fall through to the confirmation prompt below.
        }
      }

      if (!data.session) {
        navigation.navigate(ROUTES.VERIFY_EMAIL, {
          email: form.email.trim(),
          ...(returnTo ? { returnTo } : null),
        });
        return;
      }

      const userId = data.user?.id;
      if (userId) {
        await waitForAccessCheck(userId);
      }
      resumeAfterAuth(navigation, returnTo);
    } catch (error) {
      showDialog({
        title: s.auth.signUp.failedTitle,
        message: describeAuthError(error, s.auth.signUp.failedFallback),
        tone: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [form, navigation, returnTo, s, validateForm]);

  const handleGoogleSignUp = useCallback(async () => {
    if (!isGoogleSignInAvailable()) {
      showDialog({
        title: s.auth.signUp.googleUnavailableTitle,
        message: s.auth.signUp.googleUnavailable,
        tone: 'info',
      });
      return;
    }

    setIsGoogleBusy(true);
    try {
      // Google has already verified the address, so there is no code step;
      // an existing account with the same email is simply signed in.
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
      showDialog({
        title: s.auth.signUp.googleFailedTitle,
        message: describeAuthError(error, s.common.pleaseTryAgain),
        tone: 'danger',
      });
    } finally {
      setIsGoogleBusy(false);
    }
  }, [navigation, returnTo, s]);

  const goToSignIn = useCallback(
    () =>
      navigation.navigate(ROUTES.LOGIN, returnTo ? { returnTo } : undefined),
    [navigation, returnTo],
  );

  if (!signupOpen) {
    return (
      <AuthLayout
        title={s.auth.signUp.pausedTitle}
        subtitle={s.auth.signUp.pausedSubtitle}
        onBack={() => navigation.goBack()}
        footer={
          <View style={styles.footer}>
            <Text size={fontSize.bodySmall} leading={1} tone="muted">
              {s.auth.signUp.alreadyHaveAccount}
            </Text>
            <TextButton
              label={s.common.signIn}
              onPress={goToSignIn}
              size={fontSize.bodySmall}
            />
          </View>
        }
      >
        <Button label={s.auth.signUp.signInInstead} onPress={goToSignIn} />
        <Button
          label={s.auth.signUp.browseLibrary}
          variant="secondary"
          onPress={() =>
            navigation.reset({ index: 0, routes: [{ name: ROUTES.MAIN_TABS }] })
          }
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={s.auth.signUp.title}
      subtitle={s.auth.signUp.subtitle}
      onBack={() => navigation.goBack()}
      footer={
        <View style={styles.footer}>
          <Text size={fontSize.bodySmall} leading={1} tone="muted">
            {s.auth.signUp.alreadyHaveAccount}
          </Text>
          <TextButton
            label={s.common.signIn}
            onPress={goToSignIn}
            size={fontSize.bodySmall}
          />
        </View>
      }
    >
      <View style={styles.fields}>
        <AuthField
          label={s.auth.fullName}
          value={form.fullName}
          onChangeText={value => updateField('fullName', value)}
          placeholder={s.auth.fullNamePlaceholder}
          autoCapitalize="words"
          textContentType="name"
          autoComplete="name"
          returnKeyType="next"
          editable={!isSubmitting}
        />

        <AuthField
          label={s.auth.email}
          value={form.email}
          onChangeText={value => updateField('email', value)}
          placeholder={s.auth.emailPlaceholder}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          returnKeyType="next"
          editable={!isSubmitting}
        />

        <AuthField
          label={s.auth.phone}
          value={form.phone}
          onChangeText={value => updateField('phone', value)}
          placeholder={s.auth.phonePlaceholder}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          returnKeyType="next"
          editable={!isSubmitting}
        />

        <AuthField
          label={s.auth.password}
          value={form.password}
          onChangeText={value => updateField('password', value)}
          placeholder={s.auth.atLeastEightCharacters}
          secure
          textContentType="newPassword"
          autoComplete="password-new"
          returnKeyType="next"
          editable={!isSubmitting}
        />

        <AuthField
          label={s.auth.confirmPassword}
          value={form.confirmPassword}
          onChangeText={value => updateField('confirmPassword', value)}
          placeholder={s.auth.confirmPasswordPlaceholder}
          secure
          textContentType="newPassword"
          autoComplete="password-new"
          returnKeyType="go"
          onSubmitEditing={handleCreateAccount}
          editable={!isSubmitting}
        />
      </View>

      <Button
        label={isSubmitting ? s.auth.signUp.creating : s.auth.signUp.create}
        onPress={handleCreateAccount}
        loading={isSubmitting}
      />

      <AuthDivider />

      <GoogleSignInButton
        label={isGoogleBusy ? s.auth.openingGoogle : s.auth.signUp.withGoogle}
        onPress={handleGoogleSignUp}
        disabled={isGoogleBusy || isSubmitting}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
});
