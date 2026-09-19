import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyRound, MailCheck } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import {
  Button,
  Callout,
  Card,
  Label,
  showDialog,
  Text,
  TextField,
} from '@/components/ui';
import { RESEND_COOLDOWN_SECONDS } from '@/features/auth/components/CodeEntry';
import { CODE_LENGTH, CodeInput } from '@/features/auth/components/CodeInput';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { useSignInMethods } from '@/hooks/useSignInMethods';
import {
  describeOtpError,
  sendPasswordChangeCode,
  setNewPassword,
} from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { fontSize } from '@/theme/typography';
import { useStrings } from '@/i18n';

/**
 * Change password.
 *
 * Two steps, both the backend's: Supabase emails the account's address a
 * one-time code, and the new password is accepted only with that code. The
 * code — not the old password — is the proof, so a phone left unlocked
 * cannot quietly change it, and an account that came in through Google (no
 * password yet) sets its first one the same way.
 */
export function ChangePasswordScreen() {
  const s = useStrings();
  const words = s.account.changePassword;
  const navigation = useNavigation();
  const email = useAuthStore(state => state.email);
  const { methods } = useSignInMethods();
  const hasPassword = methods.data?.hasPassword ?? true;

  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  // A refused code, explained under the cells rather than in a dialog.
  const [codeProblem, setCodeProblem] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setTimeout(() => setCooldown(current => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSendCode = useCallback(async () => {
    if (cooldown > 0 || isSending) {
      return;
    }
    setIsSending(true);
    try {
      await sendPasswordChangeCode();
      setCodeSent(true);
      setCode('');
      setCodeProblem(null);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      const described = describeOtpError(error);
      if (described.kind === 'rate_limited') {
        // A code is already in the inbox; the cells may as well be open.
        setCodeSent(true);
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
      showDialog({
        title: words.couldNotSendCode,
        message: described.message,
        tone: 'danger',
      });
    } finally {
      setIsSending(false);
    }
  }, [cooldown, isSending, words]);

  const handleSave = useCallback(async () => {
    const digits = code.replace(/\D/g, '');
    if (digits.length < CODE_LENGTH) {
      setCodeProblem(words.enterAllDigits(CODE_LENGTH));
      return;
    }
    if (password.length < 8) {
      showDialog({
        title: s.auth.weakPassword,
        message: s.auth.passwordTooShort,
        tone: 'warning',
      });
      return;
    }
    if (password !== confirm) {
      showDialog({
        title: s.auth.passwordMismatch,
        message: s.auth.passwordsDoNotMatchLong,
        tone: 'warning',
      });
      return;
    }

    setIsSaving(true);
    try {
      await setNewPassword(password, digits);
      void methods.refetch();
      showDialog({
        title: hasPassword ? words.changed : words.setDone,
        message: words.otherDevices,
        tone: 'success',
        icon: KeyRound,
        actions: [{ label: s.common.done, onPress: () => navigation.goBack() }],
      });
    } catch (error) {
      const described = describeOtpError(error);
      if (described.kind === 'invalid' || described.kind === 'expired') {
        setCodeProblem(described.message);
        setCode('');
        return;
      }
      showDialog({
        title: words.couldNotChange,
        message: described.message,
        tone: 'danger',
      });
    } finally {
      setIsSaving(false);
    }
  }, [code, confirm, hasPassword, methods, navigation, password, s, words]);

  return (
    <ProfileSubScreenLayout
      title={hasPassword ? words.change : words.set}
      subtitle={words.subtitle}
    >
      <Card padded>
        <View style={styles.step}>
          <Text size={fontSize.bodySmall} weight="600">
            {words.step1}
          </Text>
          <Text size={fontSize.bodySmall} tone="muted">
            {words.willEmail(email ?? words.yourAddress)}
          </Text>
          <Button
            label={
              isSending
                ? words.sending
                : codeSent
                  ? cooldown > 0
                    ? words.resendIn(cooldown)
                    : words.resend
                  : words.emailMeCode
            }
            variant={codeSent ? 'secondary' : 'primary'}
            size="md"
            onPress={handleSendCode}
            loading={isSending}
            disabled={cooldown > 0}
          />
        </View>
      </Card>

      {codeSent ? (
        <Callout
          title={words.codeSent}
          message={words.codeSentMessage}
          tone="info"
          icon={MailCheck}
        />
      ) : null}

      <Card padded>
        <View style={styles.step}>
          <Text size={fontSize.bodySmall} weight="600">
            {words.step2}
          </Text>
          <View style={styles.code}>
            <Label size={fontSize.labelSmall + 0.5}>
              {words.codeFromEmail}
            </Label>
            <CodeInput
              value={code}
              onChange={next => {
                setCode(next);
                setCodeProblem(null);
              }}
              editable={!isSaving && codeSent}
              invalid={Boolean(codeProblem)}
            />
            {codeProblem ? (
              <Text size={fontSize.captionSmall} leading={1.4} tone="danger">
                {codeProblem}
              </Text>
            ) : null}
          </View>
          <TextField
            label={words.newPassword}
            value={password}
            onChangeText={setPassword}
            placeholder={words.atLeastEight}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            editable={!isSaving}
          />
          <TextField
            label={words.confirmNew}
            value={confirm}
            onChangeText={setConfirm}
            placeholder={words.typeItAgain}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={handleSave}
            editable={!isSaving}
          />
          <Button
            label={
              isSaving
                ? words.saving
                : hasPassword
                  ? words.change
                  : words.setPassword
            }
            size="md"
            onPress={handleSave}
            loading={isSaving}
            disabled={!codeSent}
          />
        </View>
      </Card>
    </ProfileSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  step: {
    gap: 12,
  },
  code: {
    gap: 8,
  },
});
