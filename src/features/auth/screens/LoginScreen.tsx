import { useCallback, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/app/navigation/types';
import { Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { AuthDivider } from '@/features/auth/components/AuthDivider';
import { AuthField } from '@/features/auth/components/AuthField';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton';
import { signInWithEmail } from '@/lib/supabase';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const goToApp = useCallback(() => {
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

    setIsSubmitting(true);
    try {
      await signInWithEmail({ email, password });
      goToApp();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to sign in. Try again.';
      Alert.alert('Sign in failed', message);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, goToApp, password]);

  const handleGoogleSignIn = useCallback(() => {
    Alert.alert(
      'Coming soon',
      'Google sign-in will be enabled after OAuth is configured in Supabase.',
    );
  }, []);

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Continue your library of knowledge and reflection."
      footer={
        <Pressable
          onPress={() => navigation.navigate(ROUTES.SIGN_UP)}
          hitSlop={8}
          className="active:opacity-65">
          <Text className="text-center text-[15px] leading-[22px] text-app-muted dark:text-app-muted-dark">
            New here?{' '}
            <Text className="font-semibold text-app-primary dark:text-app-primary-dark">
              Create account
            </Text>
          </Text>
        </Pressable>
      }>
      <View className="gap-3">
        <AuthField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="name@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress"
          autoComplete="email"
          returnKeyType="next"
          editable={!isSubmitting}
        />

        <AuthField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
          textContentType="password"
          autoComplete="password"
          returnKeyType="go"
          onSubmitEditing={handleSignIn}
          editable={!isSubmitting}
        />
      </View>

      <View className="gap-4">
        <Pressable
          onPress={handleSignIn}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          className="h-[52px] items-center justify-center rounded-[14px] bg-app-primary dark:bg-app-primary-dark"
          style={({ pressed }) => ({
            opacity: pressed || isSubmitting ? 0.75 : 1,
          })}>
          <Text className="text-[17px] font-semibold text-app-on-primary dark:text-app-on-primary-dark">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Text>
        </Pressable>

        <AuthDivider />

        <GoogleSignInButton onPress={handleGoogleSignIn} />
      </View>
    </AuthLayout>
  );
}
