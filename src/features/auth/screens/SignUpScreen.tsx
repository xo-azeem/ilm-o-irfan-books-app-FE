import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MailCheck } from 'lucide-react-native';
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
import { resumeAfterAuth, waitForAccessCheck } from '@/lib/access';
import { signInWithEmail, signUpWithEmail } from '@/lib/supabase';
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

  const [form, setForm] = useState<SignUpForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      // The backend has email confirmation off, so `signUp` normally answers
      // with a session. When it does not — an older project with confirmation
      // on, or Supabase's enumeration guard handing back a bare user for an
      // address that already exists — a password sign-in settles it: it either
      // lands the reader in the app or fails with the real reason, and only
      // then is the "check your email" route worth showing.
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
        // Not dismissable: the only way on is the button, which lands the
        // reader on sign-in rather than leaving them on a form already sent.
        showDialog({
          title: 'Check your email',
          message:
            'Account created. Confirm your email if required, then sign in.',
          tone: 'success',
          icon: MailCheck,
          dismissable: false,
          actions: [
            {
              label: 'OK',
              onPress: () =>
                navigation.navigate(
                  ROUTES.LOGIN,
                  returnTo ? { returnTo } : undefined,
                ),
            },
          ],
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

  const handleGoogleSignUp = useCallback(() => {
    showDialog({
      title: 'Coming soon',
      message:
        'Google sign-up will be enabled after OAuth is configured in Supabase.',
      tone: 'info',
    });
  }, []);

  const goToSignIn = useCallback(
    () =>
      navigation.navigate(ROUTES.LOGIN, returnTo ? { returnTo } : undefined),
    [navigation, returnTo],
  );

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
        label="Sign up with Google"
        onPress={handleGoogleSignUp}
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
