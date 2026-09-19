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
import { useStrings } from '@/i18n';
import { describeAuthError, requestPasswordReset } from '@/lib/supabase';
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
  const s = useStrings();

  const [email, setEmail] = useState(route.params?.email ?? '');
  const [isSending, setIsSending] = useState(false);

  const handleSend = useCallback(async () => {
    if (!isValidEmail(email)) {
      showDialog({
        title: s.auth.invalidEmail,
        message: s.auth.forgot.enterSignUpEmail,
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
        title: s.auth.forgot.couldNotSendEmail,
        message: describeAuthError(error, s.auth.login.waitAMinute),
        tone: 'danger',
      });
    } finally {
      setIsSending(false);
    }
  }, [email, navigation, returnTo, s]);

  return (
    <AuthLayout
      title={s.auth.forgot.title}
      subtitle={s.auth.forgot.subtitle}
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      footer={
        <View style={styles.footer}>
          <Text size={fontSize.bodySmall} leading={1} tone="muted">
            {s.auth.forgot.rememberedIt}
          </Text>
          <TextButton
            label={s.auth.forgot.backToSignIn}
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
          label={s.auth.email}
          value={email}
          onChangeText={setEmail}
          placeholder={s.auth.emailPlaceholder}
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
        label={isSending ? s.auth.forgot.sending : s.auth.forgot.sendResetCode}
        onPress={handleSend}
        loading={isSending}
      />

      <View style={styles.already}>
        <TextButton
          label={s.auth.forgot.alreadyHaveCode}
          tone="muted"
          onPress={() => {
            if (!isValidEmail(email)) {
              showDialog({
                title: s.auth.login.enterEmailTitle,
                message: s.auth.forgot.enterEmailFirst,
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
