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
        title: 'Could not send the code',
        message: described.message,
        tone: 'danger',
      });
    } finally {
      setIsSending(false);
    }
  }, [cooldown, isSending]);

  const handleSave = useCallback(async () => {
    const digits = code.replace(/\D/g, '');
    if (digits.length < CODE_LENGTH) {
      setCodeProblem(`Enter all ${CODE_LENGTH} digits from the email.`);
      return;
    }
    if (password.length < 8) {
      showDialog({
        title: 'Weak password',
        message: 'Password must be at least 8 characters.',
        tone: 'warning',
      });
      return;
    }
    if (password !== confirm) {
      showDialog({
        title: 'Password mismatch',
        message: 'The two passwords do not match.',
        tone: 'warning',
      });
      return;
    }

    setIsSaving(true);
    try {
      await setNewPassword(password, digits);
      void methods.refetch();
      showDialog({
        title: hasPassword ? 'Password changed' : 'Password set',
        message:
          'Other devices stay signed in. Sign them out from Signed-in devices if this was not you.',
        tone: 'success',
        icon: KeyRound,
        actions: [{ label: 'Done', onPress: () => navigation.goBack() }],
      });
    } catch (error) {
      const described = describeOtpError(error);
      if (described.kind === 'invalid' || described.kind === 'expired') {
        setCodeProblem(described.message);
        setCode('');
        return;
      }
      showDialog({
        title: 'Could not change the password',
        message: described.message,
        tone: 'danger',
      });
    } finally {
      setIsSaving(false);
    }
  }, [code, confirm, hasPassword, methods, navigation, password]);

  return (
    <ProfileSubScreenLayout
      title={hasPassword ? 'Change password' : 'Set a password'}
      subtitle="A code to your email confirms it is you."
    >
      <Card padded>
        <View style={styles.step}>
          <Text size={fontSize.bodySmall} weight="600">
            1. Get a code
          </Text>
          <Text size={fontSize.bodySmall} tone="muted">
            We will email a six-digit code to {email ?? 'your address'}. It
            expires in a few minutes.
          </Text>
          <Button
            label={
              isSending
                ? 'Sending…'
                : codeSent
                  ? cooldown > 0
                    ? `Resend in ${cooldown}s`
                    : 'Resend code'
                  : 'Email me a code'
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
          title="Code sent"
          message="Check your inbox (and spam). Enter the code below with your new password."
          tone="info"
          icon={MailCheck}
        />
      ) : null}

      <Card padded>
        <View style={styles.step}>
          <Text size={fontSize.bodySmall} weight="600">
            2. Choose the new password
          </Text>
          <View style={styles.code}>
            <Label size={fontSize.labelSmall + 0.5}>Code from the email</Label>
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
            label="New password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            editable={!isSaving}
          />
          <TextField
            label="Confirm new password"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Type it again"
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
                ? 'Saving…'
                : hasPassword
                  ? 'Change password'
                  : 'Set password'
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
