import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/app/navigation/types';
import { Button, showDialog, Text, TextButton } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { AuthField } from '@/features/auth/components/AuthField';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { requestPasswordReset } from '@/lib/supabase';
import { fontSize } from '@/theme/typography';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Forgot password, step one.
 *
 * Takes the address and asks Supabase to email it a reset code and link, then
 * moves to the reset screen. The wording never says whether the address has
 * an account — Supabase does not tell us, and telling a stranger would be a
 * way to enumerate readers.
 */
export function ForgotPasswordScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ForgotPassword'>>();
  const returnTo = route.params?.returnTo;

  const [email, setEmail] = useState(route.params?.email ?? '');
  const [isSending, setIsSending] = useState(false);

  const handleSend = useCallback(async () => {
    if (!isValidEmail(email)) {
      showDialog({
        title: 'Invalid email',
        message: 'Please enter the email address you signed up with.',
        tone: 'warning',
      });
      return;
    }

    setIsSending(true);
    try {
      await requestPasswordReset(email);
      navigation.replace(ROUTES.ENTER_CODE, {
        flow: 'recovery',
        email: email.trim(),
        ...(returnTo ? { returnTo } : null),
      });
    } catch (error) {
      showDialog({
        title: 'Could not send the email',
        message:
          error instanceof Error
            ? error.message
            : 'Please wait a minute and try again.',
        tone: 'danger',
      });
    } finally {
      setIsSending(false);
    }
  }, [email, navigation, returnTo]);

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email and we will send a code to set a new one."
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      footer={
        <View style={styles.footer}>
          <Text size={fontSize.bodySmall} leading={1} tone="muted">
            Remembered it?
          </Text>
          <TextButton
            label="Back to sign in"
            onPress={() =>
              navigation.navigate(
                ROUTES.LOGIN,
                returnTo ? { returnTo } : undefined,
              )
            }
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
          autoFocus
          returnKeyType="send"
          onSubmitEditing={handleSend}
          editable={!isSending}
        />
      </View>

      <Button
        label={isSending ? 'Sending…' : 'Send reset code'}
        onPress={handleSend}
        loading={isSending}
      />

      <View style={styles.already}>
        <TextButton
          label="I already have a code"
          tone="muted"
          onPress={() => {
            if (!isValidEmail(email)) {
              showDialog({
                title: 'Enter your email',
                message: 'Type the address the code was sent to first.',
                tone: 'warning',
              });
              return;
            }
            navigation.navigate(ROUTES.ENTER_CODE, {
              flow: 'recovery',
              email: email.trim(),
              ...(returnTo ? { returnTo } : null),
            });
          }}
        />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 14,
  },
  already: {
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
});
