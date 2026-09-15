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
import { resumeAfterAuth, waitForAccessCheck } from '@/lib/access';
import {
  GoogleSignInCancelled,
  isEmailNotConfirmed,
  isGoogleSignInAvailable,
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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleBusy, setIsGoogleBusy] = useState(false);

  const handleSignIn = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      showDialog({
        title: 'Missing details',
        message: 'Please enter your email and password.',
        tone: 'warning',
      });
      return;
    }

    if (!isValidEmail(email)) {
      showDialog({
        title: 'Invalid email',
        message: 'Please enter a valid email address.',
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
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to sign in. Try again.';
      showDialog({ title: 'Sign in failed', message, tone: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  }, [email, navigation, password, returnTo]);

  const handleGoogleSignIn = useCallback(async () => {
    if (!isGoogleSignInAvailable()) {
      showDialog({
        title: 'Google sign-in unavailable',
        message:
          'This build has no Google client configured. Sign in with your email and password.',
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
      showDialog({
        title: 'Google sign-in failed',
        message: error instanceof Error ? error.message : 'Please try again.',
        tone: 'danger',
      });
    } finally {
      setIsGoogleBusy(false);
    }
  }, [navigation, returnTo]);

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

  const handleForgotPassword = useCallback(() => {
    navigation.navigate(ROUTES.FORGOT_PASSWORD, {
      ...(isValidEmail(email) ? { email: email.trim() } : null),
      ...(returnTo ? { returnTo } : null),
    });
  }, [email, navigation, returnTo]);

  return (
    <AuthLayout
      title="Welcome back."
      subtitle="Your shelf is where you left it."
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      footer={
        <View style={styles.footer}>
          <Text size={fontSize.bodySmall} leading={1} tone="muted">
            New here?
          </Text>
          <TextButton
            label="Create an account"
            onPress={goToSignUp}
            size={fontSize.bodySmall}
          />
        </View>
      }
    >
      <View style={styles.fields}>
        <AuthField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="name@example.com"
          keyboardType="email-address"
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
          secure
          textContentType="password"
          autoComplete="password"
          returnKeyType="go"
          onSubmitEditing={handleSignIn}
          editable={!isSubmitting}
        />

        <TextButton
          label="Forgot password?"
          tone="muted"
          onPress={handleForgotPassword}
          style={styles.forgot}
        />
      </View>

      <Button
        label={isSubmitting ? 'Signing in…' : 'Sign in'}
        onPress={handleSignIn}
        loading={isSubmitting}
      />

      <AuthDivider />

      <View style={styles.alternatives}>
        <GoogleSignInButton
          label={isGoogleBusy ? 'Opening Google…' : 'Continue with Google'}
          onPress={handleGoogleSignIn}
          disabled={isGoogleBusy || isSubmitting}
        />
        <GoogleSignInButton
          label="Continue as guest"
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
