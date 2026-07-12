import { useCallback, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';

import type { RootStackParamList } from '@/app/navigation/types';
import { Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { AuthDivider } from '@/features/auth/components/AuthDivider';
import { AuthField } from '@/features/auth/components/AuthField';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton';
import { useAuthStore } from '@/stores/authStore';
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
  const signIn = useAuthStore(state => state.signIn);

  const [form, setForm] = useState<SignUpForm>(initialForm);

  const updateField = useCallback(
    (key: keyof SignUpForm, value: string) => {
      setForm(current => ({ ...current, [key]: value }));
    },
    [],
  );

  const completeSignUp = useCallback(() => {
    signIn();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: ROUTES.MAIN_TABS }],
      }),
    );
  }, [navigation, signIn]);

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

  const handleCreateAccount = useCallback(() => {
    if (!validateForm()) {
      return;
    }

    completeSignUp();
  }, [completeSignUp, validateForm]);

  const handleGoogleSignUp = useCallback(() => {
    completeSignUp();
  }, [completeSignUp]);

  return (
    <AuthLayout
      scrollable
      title="Create account"
      subtitle="Join Ilm o Irfan and start building your personal Islamic library."
      onBack={() => navigation.goBack()}
      footer={
        <Pressable
          onPress={() => navigation.navigate(ROUTES.LOGIN)}
          className="py-2 active:opacity-70">
          <Text className="text-[15px] text-app-muted dark:text-app-muted-dark">
            Already have an account?{' '}
            <Text className="font-semibold text-app-primary dark:text-app-primary-dark">
              Sign in
            </Text>
          </Text>
        </Pressable>
      }>
      <AuthField
        label="Full name"
        value={form.fullName}
        onChangeText={value => updateField('fullName', value)}
        placeholder="Your full name"
        autoCapitalize="words"
        textContentType="name"
        autoComplete="name"
      />

      <AuthField
        label="Email"
        value={form.email}
        onChangeText={value => updateField('email', value)}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        textContentType="emailAddress"
        autoComplete="email"
      />

      <AuthField
        label="Phone number"
        value={form.phone}
        onChangeText={value => updateField('phone', value)}
        placeholder="+1 555 000 0000"
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
      />

      <AuthField
        label="Password"
        value={form.password}
        onChangeText={value => updateField('password', value)}
        placeholder="At least 8 characters"
        secureTextEntry
        textContentType="newPassword"
        autoComplete="password-new"
      />

      <AuthField
        label="Confirm password"
        value={form.confirmPassword}
        onChangeText={value => updateField('confirmPassword', value)}
        placeholder="Re-enter your password"
        secureTextEntry
        textContentType="newPassword"
        autoComplete="password-new"
      />

      <View className="gap-3 pt-1">
        <Pressable
          onPress={handleCreateAccount}
          accessibilityRole="button"
          accessibilityLabel="Create account"
          style={{ backgroundColor: colors.primary }}
          className="items-center rounded-[14px] py-4 active:opacity-90">
          <Text className="text-[16px] font-semibold text-white">Create account</Text>
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
