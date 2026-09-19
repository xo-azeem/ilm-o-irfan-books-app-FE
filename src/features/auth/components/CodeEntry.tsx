import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { MailCheck } from 'lucide-react-native';

import { Button, showDialog, Text, TextButton } from '@/components/ui';
import { useStrings } from '@/i18n';
import { describeOtpError, type OtpErrorKind } from '@/lib/supabase';
import { fontSize } from '@/theme/typography';

import { CODE_LENGTH, CodeInput } from './CodeInput';

/**
 * How long "Resend" stays dark after a send. The backend sends codes through
 * its own email hook with this as its floor; asking sooner is refused.
 */
export const RESEND_COOLDOWN_SECONDS = 30;

export type CodeEntryProps = {
  /** Where the code went — named in the copy and read back to the screen reader. */
  email: string;
  /** Checks the six digits. Throw to have the error explained under the cells. */
  onVerify: (code: string) => Promise<void>;
  /** Sends a fresh code. Absent when the flow cannot resend (a reauth nonce). */
  onResend?: () => Promise<void>;
  /**
   * Start the cooldown as soon as the screen appears — the flow that opened
   * it has just sent a code, so an immediate "Resend" would be refused.
   */
  cooldownOnMount?: boolean;
  verifyLabel?: string;
  /** A line under the cells — "Enter the code we emailed to …" is the default. */
  hint?: string;
  autoFocus?: boolean;
  /** A control drawn beside Resend, e.g. "Use a different address". */
  secondary?: ReactNode;
};

/**
 * The one code-entry body every flow shares.
 *
 * Sign-up, password recovery, sign-in by code, both halves of an email change
 * and the password-change nonce all take the same six digits from the same
 * kind of email, so they share one component: the cells, a Verify button, a
 * Resend with a cooldown, and the refusals explained in one voice. What
 * differs — which `verifyOtp` type, where to go next — is the caller's.
 */
export function CodeEntry({
  email,
  onVerify,
  onResend,
  cooldownOnMount = true,
  verifyLabel,
  hint,
  autoFocus = true,
  secondary,
}: CodeEntryProps) {
  const s = useStrings();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(
    cooldownOnMount && onResend ? RESEND_COOLDOWN_SECONDS : 0,
  );
  const [problem, setProblem] = useState<{
    kind: OtpErrorKind;
    message: string;
  } | null>(null);
  // A code auto-submits on its sixth digit; a Verify tap on the same code
  // must not send it twice.
  const inFlight = useRef<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setTimeout(() => setCooldown(current => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const verify = useCallback(
    async (digits: string) => {
      if (digits.length < CODE_LENGTH) {
        setProblem({
          kind: 'invalid',
          message: s.auth.code.enterAllDigits(CODE_LENGTH),
        });
        return;
      }
      if (inFlight.current === digits) {
        return;
      }
      inFlight.current = digits;
      setIsVerifying(true);
      setProblem(null);
      try {
        await onVerify(digits);
      } catch (error) {
        const described = describeOtpError(error);
        setProblem(described);
        if (described.kind === 'invalid' || described.kind === 'expired') {
          setCode('');
        }
      } finally {
        inFlight.current = null;
        setIsVerifying(false);
      }
    },
    [onVerify, s],
  );

  const handleResend = useCallback(async () => {
    if (!onResend || cooldown > 0 || isResending) {
      return;
    }
    setIsResending(true);
    try {
      await onResend();
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setProblem(null);
      setCode('');
      showDialog({
        title: s.auth.code.sentTitle,
        message: s.auth.code.sentMessage(email),
        tone: 'success',
        icon: MailCheck,
      });
    } catch (error) {
      const described = describeOtpError(error);
      if (described.kind === 'rate_limited') {
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
      showDialog({
        title: s.auth.code.couldNotResend,
        message: described.message,
        tone: 'danger',
      });
    } finally {
      setIsResending(false);
    }
  }, [cooldown, email, isResending, onResend, s]);

  const handleChange = useCallback((next: string) => {
    setCode(next);
    setProblem(null);
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.field}>
        <CodeInput
          value={code}
          onChange={handleChange}
          onComplete={digits => void verify(digits)}
          editable={!isVerifying}
          invalid={problem?.kind === 'invalid' || problem?.kind === 'expired'}
          autoFocus={autoFocus}
        />
        <Text
          size={fontSize.captionSmall}
          leading={1.4}
          tone={problem ? 'danger' : 'faint'}
        >
          {problem?.message ?? hint ?? s.auth.code.hint(CODE_LENGTH, email)}
        </Text>
      </View>

      <Button
        label={
          isVerifying
            ? s.auth.code.checking
            : (verifyLabel ?? s.auth.code.verify)
        }
        onPress={() => void verify(code)}
        loading={isVerifying}
        disabled={code.length < CODE_LENGTH}
      />

      <View style={styles.resend}>
        {onResend ? (
          <TextButton
            label={
              cooldown > 0
                ? s.auth.code.resendIn(cooldown)
                : isResending
                  ? s.auth.code.sending
                  : problem?.kind === 'expired'
                    ? s.auth.code.sendNew
                    : s.auth.code.resend
            }
            tone={cooldown > 0 || isResending ? 'muted' : 'primary'}
            onPress={() => void handleResend()}
            disabled={cooldown > 0 || isResending}
          />
        ) : null}
        {secondary}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 22,
  },
  field: {
    gap: 10,
  },
  resend: {
    alignItems: 'center',
    gap: 10,
  },
});
