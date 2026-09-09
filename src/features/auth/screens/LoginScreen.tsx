import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const signInWithPassword = useAuthStore(state => state.signInWithPassword);
  const layout = useAuthLayoutMetrics(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const goMain = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: ROUTES.MAIN_TABS }],
      }),
    );
  }, [navigation]);

  const handleSignIn = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing details', 'Please enter your email and password.');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    setBusy(true);
    try {
      await signInWithPassword(email, password);
      goMain();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      Alert.alert('Sign in failed', message);
    } finally {
      setBusy(false);
    }
  }, [email, password, signInWithPassword, goMain]);

  const handleGoogleSignIn = useCallback(() => {
    Alert.alert(
      'Coming soon',
      'Google sign-in will be available after OAuth is configured in Supabase.',
    );
  }, []);

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
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <AuthField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable
          onPress={() => void handleSignIn()}
          disabled={busy}
          className="mt-2 items-center rounded-[14px] bg-app-primary py-3.5 active:opacity-90 dark:bg-app-primary-dark">
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-[16px] font-semibold text-app-on-primary dark:text-app-on-primary-dark">
              Sign in
            </Text>
          )}
        </Pressable>

        <AuthDivider />
        <GoogleSignInButton onPress={handleGoogleSignIn} />
      </View>
    </AuthLayout>
  );
}
