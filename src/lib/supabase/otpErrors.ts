/**
 * What a refused one-time code means, in the reader's words.
 *
 * Supabase Auth answers every code-entry flow — sign-up, recovery, sign-in,
 * email change, reauthentication — with the same small set of refusals, and
 * every code screen should say the same thing about each. Kept free of React
 * Native imports so the mapping can be unit tested.
 */

export type OtpErrorKind =
  /** Wrong digits, or a code already spent. */
  | 'invalid'
  /** Right digits, too late — the code has aged out. */
  | 'expired'
  /** Asked for a new code too soon; the server will not send one yet. */
  | 'rate_limited'
  | 'other';

export type OtpErrorDescription = {
  kind: OtpErrorKind;
  message: string;
};

function readCode(error: unknown): string | null {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  return typeof code === 'string' ? code : null;
}

function readMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : '';
}

/** Classifies an auth error from `verifyOtp`, `resend` and friends. */
export function describeOtpError(error: unknown): OtpErrorDescription {
  const code = readCode(error);
  const message = readMessage(error);

  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    /rate limit|too many requests|after \d+ seconds/i.test(message)
  ) {
    return {
      kind: 'rate_limited',
      message:
        'A code was sent very recently. Wait a moment before asking for another.',
    };
  }

  if (code === 'otp_expired' || /expired/i.test(message)) {
    return {
      kind: 'expired',
      message: 'That code has expired. Request a new one and try again.',
    };
  }

  if (
    code === 'validation_failed' ||
    /invalid|incorrect|not found|wrong/i.test(message)
  ) {
    return {
      kind: 'invalid',
      message: 'That code is not right. Check the digits and try again.',
    };
  }

  return {
    kind: 'other',
    message: message || 'The code could not be checked. Please try again.',
  };
}
