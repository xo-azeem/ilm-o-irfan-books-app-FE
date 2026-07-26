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
      title="Sign in"
      subtitle="Continue your library of knowledge and reflection."
      footer={
        <Pressable
          onPress={() => navigation.navigate(ROUTES.SIGN_UP)}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>
          <Text
            className="text-center text-app-muted dark:text-app-muted-dark"
            style={styles.footerText}>
            New here?{' '}
            <Text className="font-semibold text-app-primary dark:text-app-primary-dark">
              Create account
            </Text>
          </Text>
        </Pressable>
      }>
      <View style={{ gap: layout.fieldGap }}>
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
        />
      </View>

      <View style={{ gap: layout.fieldGap + 4 }}>
        <Pressable
          onPress={handleSignIn}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              height: layout.buttonHeight,
              borderRadius: layout.radius,
              backgroundColor: colors.primary,
              opacity: pressed ? 0.9 : 1,
            },
          ]}>
          <Text
            className="font-semibold"
            style={{ fontSize: 17, color: colors.onPrimary }}>
            Sign in
          </Text>
        </Pressable>

        <AuthDivider />

        <GoogleSignInButton onPress={handleGoogleSignIn} />
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
