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
import { useAuthLayoutMetrics } from '@/features/auth/hooks/useAuthLayoutMetrics';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const signIn = useAuthStore(state => state.signIn);
  const layout = useAuthLayoutMetrics(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const completeSignIn = useCallback(() => {
    signIn();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: ROUTES.MAIN_TABS }],
      }),
    );
  }, [navigation, signIn]);

  const handleSignIn = useCallback(() => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing details', 'Please enter your email and password.');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    completeSignIn();
  }, [completeSignIn, email, password]);

  const handleGoogleSignIn = useCallback(() => {
    completeSignIn();
  }, [completeSignIn]);

  return (
    <AuthLayout
      scrollable={false}
      title="Welcome back"
      subtitle="Sign in to continue your journey of knowledge and reflection."
      footer={
        <Pressable
          onPress={() => navigation.navigate(ROUTES.SIGN_UP)}
          className="px-2 py-1 active:opacity-70">
          <Text className="text-center text-[15px] leading-[22px] text-app-muted dark:text-app-muted-dark">
            New here?{' '}
            <Text className="font-semibold text-app-primary dark:text-app-primary-dark">
              Create an account
            </Text>
          </Text>
        </Pressable>
      }>
      <View style={{ gap: layout.fieldGap }}>
        <AuthField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress"
          autoComplete="email"
        />

        <AuthField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry
          textContentType="password"
          autoComplete="password"
        />
      </View>

      <View style={{ gap: layout.actionGap }}>
        <Pressable
          onPress={handleSignIn}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          style={{ backgroundColor: colors.primary }}
          className="items-center rounded-[14px] py-3.5 active:opacity-90">
          <Text className="text-[16px] font-semibold text-white">Sign in</Text>
        </Pressable>

        <AuthDivider />

        <GoogleSignInButton onPress={handleGoogleSignIn} />
      </View>
    </AuthLayout>
  );
}
