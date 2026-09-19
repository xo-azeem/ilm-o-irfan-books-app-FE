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
import { resumeAfterAuth, waitForAccessCheck } from '@/lib/access';
import {
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

  const [form, setForm] = useState<SignUpForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleBusy, setIsGoogleBusy] = useState(false);

  const updateField = useCallback((key: keyof SignUpForm, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
  }, []);

  const validateForm = useCallback((): boolean => {
    if (!form.fullName.trim()) {
      showDialog({
        title: 'Missing details',
        message: 'Please enter your full name.',
        tone: 'warning',
      });
      return false;
    }
    if (!isValidEmail(form.email)) {
      showDialog({
        title: 'Invalid email',
        message: 'Please enter a valid email address.',
        tone: 'warning',
      });
      return false;
    }
    if (form.phone.trim().length < 7) {
      showDialog({
        title: 'Invalid phone',
        message: 'Please enter a valid phone number.',
        tone: 'warning',
      });
      return false;
    }
    if (form.password.length < 8) {
      showDialog({
        title: 'Weak password',
        message: 'Password must be at least 8 characters.',
        tone: 'warning',
      });
      return false;
    }
    if (form.password !== form.confirmPassword) {
      showDialog({
        title: 'Password mismatch',
        message: 'Passwords do not match.',
        tone: 'warning',
      });
      return false;
    }
    return true;
  }, [form]);

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
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to create account. Try again.';
      showDialog({ title: 'Sign up failed', message, tone: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  }, [form, navigation, returnTo, validateForm]);

  const handleGoogleSignUp = useCallback(async () => {
    if (!isGoogleSignInAvailable()) {
      showDialog({
        title: 'Google sign-up unavailable',
        message:
          'This build has no Google client configured. Create an account with your email instead.',
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
        title: 'Google sign-up failed',
        message: error instanceof Error ? error.message : 'Please try again.',
        tone: 'danger',
      });
    } finally {
      setIsGoogleBusy(false);
    }
  }, [navigation, returnTo]);

  const goToSignIn = useCallback(
    () =>
      navigation.navigate(ROUTES.LOGIN, returnTo ? { returnTo } : undefined),
    [navigation, returnTo],
  );

  if (!signupOpen) {
    return (
      <AuthLayout
        title="Sign-ups are paused."
        subtitle="New accounts are not being created right now. Existing accounts work as usual, and the whole catalogue is open to browse."
        onBack={() => navigation.goBack()}
        footer={
          <View style={styles.footer}>
            <Text size={fontSize.bodySmall} leading={1} tone="muted">
              Already have an account?
            </Text>
            <TextButton
              label="Sign in"
              onPress={goToSignIn}
              size={fontSize.bodySmall}
            />
          </View>
        }
      >
        <Button label="Sign in instead" onPress={goToSignIn} />
        <Button
          label="Browse the library"
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
      title="Start your shelf."
      subtitle="A few details, then seven decades of Ilm-o-Irfan are yours to browse."
      onBack={() => navigation.goBack()}
      footer={
        <View style={styles.footer}>
          <Text size={fontSize.bodySmall} leading={1} tone="muted">
            Already have an account?
          </Text>
          <TextButton
            label="Sign in"
            onPress={goToSignIn}
            size={fontSize.bodySmall}
          />
        </View>
      }
    >
      <View style={styles.fields}>
        <AuthField
          label="Full name"
          value={form.fullName}
          onChangeText={value => updateField('fullName', value)}
          placeholder="Your full name"
          autoCapitalize="words"
          textContentType="name"
          autoComplete="name"
          returnKeyType="next"
          editable={!isSubmitting}
        />

        <AuthField
          label="Email"
          value={form.email}
          onChangeText={value => updateField('email', value)}
          placeholder="name@example.com"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          returnKeyType="next"
          editable={!isSubmitting}
        />

        <AuthField
          label="Phone"
          value={form.phone}
          onChangeText={value => updateField('phone', value)}
          placeholder="+92 300 123 4567"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          returnKeyType="next"
          editable={!isSubmitting}
        />

        <AuthField
          label="Password"
          value={form.password}
          onChangeText={value => updateField('password', value)}
          placeholder="At least 8 characters"
          secure
          textContentType="newPassword"
          autoComplete="password-new"
          returnKeyType="next"
          editable={!isSubmitting}
        />

        <AuthField
          label="Confirm password"
          value={form.confirmPassword}
          onChangeText={value => updateField('confirmPassword', value)}
          placeholder="Repeat your password"
          secure
          textContentType="newPassword"
          autoComplete="password-new"
          returnKeyType="go"
          onSubmitEditing={handleCreateAccount}
          editable={!isSubmitting}
        />
      </View>

      <Button
        label={isSubmitting ? 'Creating account…' : 'Create account'}
        onPress={handleCreateAccount}
        loading={isSubmitting}
      />

      <AuthDivider />

      <GoogleSignInButton
        label={isGoogleBusy ? 'Opening Google…' : 'Sign up with Google'}
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
