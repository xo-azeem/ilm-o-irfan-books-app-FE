import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/app/navigation/types';
import { Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { AuthDivider } from '@/features/auth/components/AuthDivider';
import { AuthField } from '@/features/auth/components/AuthField';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton';
import { useAuthLayoutMetrics } from '@/features/auth/hooks/useAuthLayoutMetrics';
import { signUpWithEmail } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeContext';

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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const layout = useAuthLayoutMetrics(true);

  const [form, setForm] = useState<SignUpForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = useCallback((key: keyof SignUpForm, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
  }, []);

  const goToApp = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: ROUTES.MAIN_TABS }],
      }),
    );
  }, [navigation]);

  const validateForm = useCallback((): boolean => {
    if (!form.fullName.trim()) {
      Alert.alert('Missing details', 'Please enter your full name.');
      return false;
    }

    if (!isValidEmail(form.email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return false;
    }

    if (form.phone.trim().length < 7) {
      Alert.alert('Invalid phone', 'Please enter a valid phone number.');
      return false;
    }

    if (form.password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return false;
    }

    if (form.password !== form.confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
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
      const data = await signUpWithEmail({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });

      if (!data.session) {
        Alert.alert(
          'Check your email',
          'Account created. Confirm your email if required, then sign in.',
          [{ text: 'OK', onPress: () => navigation.navigate(ROUTES.LOGIN) }],
        );
        return;
      }

      goToApp();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to create account. Try again.';
      Alert.alert('Sign up failed', message);
    } finally {
      setIsSubmitting(false);
    }
  }, [form, goToApp, navigation, validateForm]);

  const handleGoogleSignUp = useCallback(() => {
    Alert.alert(
      'Coming soon',
      'Google sign-up will be enabled after OAuth is configured in Supabase.',
    );
  }, []);

  return (
    <AuthLayout
      scrollable
      title="Create account"
      subtitle="Build your personal Islamic library in a few steps."
      onBack={() => navigation.goBack()}
      footer={
        <Pressable
          onPress={() => navigation.navigate(ROUTES.LOGIN)}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>
          <Text
            className="text-center text-app-muted dark:text-app-muted-dark"
            style={styles.footerText}>
            Already have an account?{' '}
            <Text className="font-semibold text-app-primary dark:text-app-primary-dark">
              Sign in
            </Text>
          </Text>
        </Pressable>
      }>
      <View style={{ gap: layout.fieldGap }}>
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
          autoCapitalize="none"
          textContentType="emailAddress"
          autoComplete="email"
          returnKeyType="next"
          editable={!isSubmitting}
        />

        <AuthField
          label="Phone"
          value={form.phone}
          onChangeText={value => updateField('phone', value)}
          placeholder="+1 555 000 0000"
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
          secureTextEntry
          textContentType="newPassword"
          autoComplete="password-new"
          returnKeyType="next"
          editable={!isSubmitting}
        />

        <AuthField
          label="Confirm password"
          value={form.confirmPassword}
          onChangeText={value => updateField('confirmPassword', value)}
          placeholder="Re-enter your password"
          secureTextEntry
          textContentType="newPassword"
          autoComplete="password-new"
          returnKeyType="go"
          onSubmitEditing={handleCreateAccount}
          editable={!isSubmitting}
        />
      </View>

      <View style={{ gap: layout.fieldGap + 4 }}>
        <Pressable
          onPress={handleCreateAccount}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Create account"
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              height: layout.buttonHeight,
              borderRadius: layout.radius,
              backgroundColor: colors.primary,
              opacity: pressed || isSubmitting ? 0.75 : 1,
            },
          ]}>
          <Text
            className="font-semibold"
            style={{ fontSize: 17, color: colors.onPrimary }}>
            {isSubmitting ? 'Creating…' : 'Create account'}
          </Text>
        </Pressable>

        <AuthDivider />

        <GoogleSignInButton
          onPress={handleGoogleSignUp}
          label="Sign up with Google"
        />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 15,
    lineHeight: 22,
  },
});
