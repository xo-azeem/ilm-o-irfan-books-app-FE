import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { Check, MailCheck, MailPlus } from 'lucide-react-native';

import {
  Button,
  Callout,
  Card,
  Icon,
  showDialog,
  Text,
  TextField,
} from '@/components/ui';
import { CodeEntry } from '@/features/auth/components/CodeEntry';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import {
  describeAuthError,
  getAuthUser,
  readEmailChangeProgress,
  requestEmailChange,
  resendEmailChangeCodes,
  verifyEmailChangeCode,
} from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { fontSize } from '@/theme/typography';
import { useStrings } from '@/i18n';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Which code the screen is waiting for.
 *
 *   · `enter`   — the new address has not been sent yet
 *   · `current` — the code emailed to the address the account has now
 *   · `next`    — the code emailed to the address it is moving to
 *   · `done`    — both accepted; the account answers to the new address
 */
type Step = 'enter' | 'current' | 'next' | 'done';

/**
 * Change email address — two codes.
 *
 * Secure Email Change is on, so Supabase emails a code to the current address
 * and another to the new one, and the account moves only when both have been
 * entered. The screen asks for them one at a time, current address first
 * (the reader can already read that inbox), and never declares the change
 * done on its own count: after each code it re-reads the user record and
 * moves on only when `email` is the address that was asked for. A reader who
 * leaves halfway can come back, type the same address and pick up where the
 * codes left off — Supabase sends fresh ones.
 */
export function ChangeEmailScreen() {
  const s = useStrings();
  const words = s.account.changeEmail;
  const navigation = useNavigation();
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);
  const currentEmail = useAuthStore(state => state.email) ?? '';

  const [newEmail, setNewEmail] = useState('');
  const [step, setStep] = useState<Step>('enter');
  const [isSending, setIsSending] = useState(false);
  // Which of the two codes have been accepted so far, for the progress row.
  const [accepted, setAccepted] = useState<{ current: boolean; next: boolean }>(
    { current: false, next: false },
  );

  const emailError = useMemo(() => {
    const trimmed = newEmail.trim();
    if (!trimmed) {
      return undefined;
    }
    if (!isValidEmail(trimmed)) {
      return words.invalid;
    }
    if (trimmed.toLowerCase() === currentEmail.toLowerCase()) {
      return words.same;
    }
    return undefined;
  }, [currentEmail, newEmail, words]);

  /** Refreshes everything that shows the address once it has moved. */
  const refreshAccount = useCallback(async () => {
    const user = await getAuthUser();
    // The auth store reads the session; a fresh user record comes with the
    // next token refresh, so the address is pushed in here as well.
    useAuthStore.setState({ email: user.email ?? null });
    void client.invalidateQueries({ queryKey: ['account'] });
    void client.invalidateQueries({ queryKey: ['profile'] });
    return user;
  }, [client]);

  const handleSend = useCallback(async () => {
    if (emailError || !newEmail.trim()) {
      showDialog({
        title: words.checkAddress,
        message: emailError ?? words.enterNew,
        tone: 'warning',
      });
      return;
    }
    setIsSending(true);
    try {
      await requestEmailChange(newEmail);
      setAccepted({ current: false, next: false });
      setStep('current');
    } catch (error) {
      showDialog({
        title: words.couldNotStart,
        message: describeAuthError(error, s.auth.login.waitAMinute),
        tone: 'danger',
      });
    } finally {
      setIsSending(false);
    }
  }, [emailError, newEmail, s, words]);

  /**
   * One code in, then the honest question: has the account moved? Only the
   * user record can say — a single accepted code leaves `new_email` pending.
   */
  const settle = useCallback(async () => {
    const user = await refreshAccount();
    const progress = readEmailChangeProgress(user, newEmail);
    if (progress.complete) {
      setAccepted({ current: true, next: true });
      setStep('done');
      return;
    }
    setStep(current => (current === 'current' ? 'next' : 'current'));
  }, [newEmail, refreshAccount]);

  const verifyCurrent = useCallback(
    async (code: string) => {
      await verifyEmailChangeCode(currentEmail, code);
      setAccepted(state => ({ ...state, current: true }));
      await settle();
    },
    [currentEmail, settle],
  );

  const verifyNext = useCallback(
    async (code: string) => {
      await verifyEmailChangeCode(newEmail, code);
      setAccepted(state => ({ ...state, next: true }));
      await settle();
    },
    [newEmail, settle],
  );

  const resend = useCallback(
    () => resendEmailChangeCodes(newEmail),
    [newEmail],
  );

  const startOver = useCallback(() => {
    setStep('enter');
    setAccepted({ current: false, next: false });
  }, []);

  if (!userId) {
    return (
      <ProfileSubScreenLayout title={words.title}>
        <Callout
          title={words.signInFirst}
          message={words.belongsToAccount}
          tone="info"
        />
      </ProfileSubScreenLayout>
    );
  }

  return (
    <ProfileSubScreenLayout
      title={words.title}
      subtitle={
        step === 'enter'
          ? words.subtitleEnter
          : step === 'done'
            ? words.subtitleDone
            : words.subtitleCodes
      }
    >
      {step === 'enter' ? (
        <Card padded>
          <View style={styles.stack}>
            <Text size={fontSize.bodySmall} tone="muted">
              {words.registeredTo(currentEmail || words.yourAddress)}
            </Text>
            <TextField
              label={words.newAddress}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder={s.auth.emailPlaceholder}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect={false}
              error={emailError}
              returnKeyType="send"
              onSubmitEditing={() => void handleSend()}
              editable={!isSending}
            />
            <Button
              label={isSending ? words.sendingCodes : words.sendCodes}
              size="md"
              onPress={() => void handleSend()}
              loading={isSending}
              disabled={!newEmail.trim() || Boolean(emailError)}
            />
          </View>
        </Card>
      ) : null}

      {step === 'current' || step === 'next' ? (
        <>
          <Card tone="alt" padded>
            <View style={styles.progress}>
              <ProgressRow
                label={words.sentToCurrent(currentEmail)}
                state={
                  accepted.current
                    ? 'done'
                    : step === 'current'
                      ? 'active'
                      : 'waiting'
                }
              />
              <ProgressRow
                label={words.sentToNew(newEmail.trim())}
                state={
                  accepted.next
                    ? 'done'
                    : step === 'next'
                      ? 'active'
                      : 'waiting'
                }
              />
            </View>
          </Card>

          <Card padded>
            <View style={styles.stack}>
              <Text size={fontSize.body} weight="600">
                {step === 'current'
                  ? words.stepCurrent(accepted.next ? 2 : 1)
                  : words.stepNew(accepted.current ? 2 : 1)}
              </Text>
              <CodeEntry
                key={step}
                email={step === 'current' ? currentEmail : newEmail.trim()}
                onVerify={step === 'current' ? verifyCurrent : verifyNext}
                onResend={resend}
                cooldownOnMount={!accepted.current && !accepted.next}
                verifyLabel={words.confirmCode}
                hint={words.codeHint(
                  step === 'current' ? currentEmail : newEmail.trim(),
                )}
              />
            </View>
          </Card>

          <Button
            label={words.differentAddress}
            variant="ghost"
            size="md"
            onPress={startOver}
          />
        </>
      ) : null}

      {step === 'done' ? (
        <Callout
          title={words.updated}
          message={words.updatedMessage(newEmail.trim())}
          tone="info"
          icon={MailCheck}
          action={
            <Button
              label={words.done}
              size="sm"
              variant="secondary"
              onPress={() => navigation.goBack()}
            />
          }
        />
      ) : null}
    </ProfileSubScreenLayout>
  );
}

function ProgressRow({
  label,
  state,
}: {
  label: string;
  state: 'done' | 'active' | 'waiting';
}) {
  const s = useStrings();
  return (
    <View style={styles.progressRow}>
      <Icon
        icon={state === 'done' ? Check : MailPlus}
        size={16}
        tone={state === 'waiting' ? 'muted' : 'primary'}
      />
      <Text
        size={fontSize.bodySmall}
        tone={
          state === 'done' ? 'primary' : state === 'active' ? 'ink' : 'muted'
        }
        style={styles.progressLabel}
      >
        {label}
        {state === 'done'
          ? s.account.changeEmail.confirmed
          : state === 'active'
            ? s.account.changeEmail.now
            : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 12,
  },
  progress: {
    gap: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  progressLabel: {
    flex: 1,
  },
});
