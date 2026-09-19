import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/app/navigation/types';
import { Text, TextButton } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { CodeEntry } from '@/features/auth/components/CodeEntry';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { useStrings } from '@/i18n';
import { resumeAfterAuth, waitForAccessCheck } from '@/lib/access';
import {
  requestPasswordReset,
  resendSignUpConfirmation,
  sendSignInCode,
  verifyEmailCode,
  verifyRecoveryCode,
  verifySignInCode,
} from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { fontSize } from '@/theme/typography';

export type CodeFlow = 'signup' | 'recovery' | 'signin';

/**
 * The code screen for the flows that start signed out.
 *
 * One screen, three `verifyOtp` types: `signup` confirms a new account,
 * `recovery` proves the address before a new password is chosen, `email`
 * signs an existing account in without a password. Each email also carries
 * a link; opened on this phone it lands in AuthLinkProvider, which sets the
 * session — and this screen notices the session and moves on, so the reader
 * ends up in the same place whichever they used.
 */
export function EnterCodeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'EnterCode'>>();
  const { flow, email, returnTo } = route.params;
  const s = useStrings();
  const copy = s.auth.enterCode[flow];

  const userId = useAuthStore(state => state.userId);
  const finished = useRef(false);

  // Runs once, whichever path got there first: the verify handler, or the
  // auth listener noticing the session it created.
  const continueSignedIn = useCallback(
    async (id: string | null | undefined) => {
      if (finished.current) {
        return;
      }
      finished.current = true;
      if (id) {
        await waitForAccessCheck(id);
      }
      if (flow === 'recovery') {
        navigation.replace(ROUTES.RESET_PASSWORD, {
          email,
          viaLink: true,
          ...(returnTo ? { returnTo } : null),
        });
        return;
      }
      resumeAfterAuth(navigation, returnTo);
    },
    [email, flow, navigation, returnTo],
  );

  // The link path: a session appears without this screen doing anything.
  // A recovery session is left to whoever made it — the link routes itself
  // to the new-password screen (see AuthLinkProvider), and the code path
  // routes from its own handler.
  useEffect(() => {
    if (!userId || finished.current || flow === 'recovery') {
      return;
    }
    void continueSignedIn(userId);
  }, [continueSignedIn, flow, userId]);

  const handleVerify = useCallback(
    async (code: string) => {
      const data =
        flow === 'signup'
          ? await verifyEmailCode(email, code, 'signup')
          : flow === 'recovery'
            ? await verifyRecoveryCode(email, code)
            : await verifySignInCode(email, code);
      await continueSignedIn(data.user?.id);
    },
    [continueSignedIn, email, flow],
  );

  const handleResend = useCallback(async () => {
    if (flow === 'signup') {
      await resendSignUpConfirmation(email);
    } else if (flow === 'recovery') {
      await requestPasswordReset(email);
    } else {
      await sendSignInCode(email);
    }
  }, [email, flow]);

  const goToSignIn = useCallback(
    () =>
      navigation.navigate(ROUTES.LOGIN, returnTo ? { returnTo } : undefined),
    [navigation, returnTo],
  );

  return (
    <AuthLayout
      title={copy.title}
      subtitle={copy.subtitle(email)}
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      footer={
        <View style={styles.footer}>
          <Text size={fontSize.bodySmall} leading={1} tone="muted">
            {s.auth.enterCode.wrongAddress}
          </Text>
          <TextButton
            label={s.auth.enterCode.backToSignIn}
            onPress={goToSignIn}
            size={fontSize.bodySmall}
          />
        </View>
      }
    >
      <CodeEntry
        email={email}
        onVerify={handleVerify}
        onResend={handleResend}
        verifyLabel={copy.verify}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
});
