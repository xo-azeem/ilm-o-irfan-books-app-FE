import { env } from '@/config/env';
import { supabase } from '@/lib/supabase/client';
import { ApiError, request } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import { useAccessStore } from '@/stores/accessStore';
import type { SignedPdfPayload } from '@/services/api/types';

export type SignInParams = {
  email: string;
  password: string;
};

export type SignUpParams = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

export async function signInWithEmail({ email, password }: SignInParams) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signUpWithEmail({
  fullName,
  email,
  phone,
  password,
}: SignUpParams) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        phone: phone.trim(),
      },
      // The confirmation link lands in the app when opened on this phone.
      emailRedirectTo: AUTH_REDIRECT_URL,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

/**
 * Where Supabase auth emails send the reader back to.
 *
 * The backend allow-lists `ilmoirfan://**`; AuthLinkProvider turns the link
 * into a session. Emails opened on another device cannot follow it, which is
 * why the verify screen also takes the 6-digit code from the same email.
 */
export const AUTH_REDIRECT_URL = `${env.appScheme}://auth/callback`;

/** Supabase's own error code for a sign-in refused pending confirmation. */
export function isEmailNotConfirmed(error: unknown): boolean {
  const code = (error as { code?: string } | undefined)?.code;
  if (code === 'email_not_confirmed') {
    return true;
  }
  const message = error instanceof Error ? error.message : '';
  return /email not confirmed/i.test(message);
}

/** Sends the sign-up confirmation email again. Rate-limited by Supabase. */
export async function resendSignUpConfirmation(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: AUTH_REDIRECT_URL },
  });
  if (error) {
    throw error;
  }
}

/**
 * Confirms an address with the code from the email.
 *
 * `signup` for a fresh account; `email` for an address the reader changed.
 * Both templates carry `{{ .Token }}` (see docs/auth.md), so the same six
 * digits work whichever device the email was opened on.
 */
export async function verifyEmailCode(
  email: string,
  token: string,
  type: 'signup' | 'email' = 'signup',
) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type,
  });
  if (error) {
    throw error;
  }
  return data;
}

/**
 * The signed-in user, fresh from the server rather than the cached JWT — the
 * only place `email_confirmed_at` and the identity list are current.
 */
export async function getAuthUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  return data.user;
}

/**
 * Asks the `get-signed-pdf` Edge Function for a short-lived download URL.
 *
 * The function is the only PDF gate, and it grants access on two conditions
 * and no others: the admin role, or an active entitlement — for every book,
 * with no exception for one left unflagged. Anyone else gets
 * `PREMIUM_REQUIRED`, which the reader screen turns into the paywall.
 *
 * A successful call is also the freshest proof of access there is, so the
 * countdown is re-anchored from the `access` block it carries: a new deadline,
 * and the server's clock to measure it against.
 *
 * `expiresIn` is not a constant. The backend clamps the URL's life to what is
 * left of the membership, with a 15-second floor, so a reader in their last
 * minute gets a URL that dies with it. Nothing may cache this URL and assume it
 * still works later.
 *
 * The older `/functions/v1/signed-pdf` route now answers 410; this is the
 * supported one.
 */
export async function getSignedPdfUrl(bookId: string) {
  const body = await request<SignedPdfPayload & { data?: SignedPdfPayload }>(
    ENDPOINTS.signedPdf,
    { method: 'POST', auth: true, body: { bookId } },
  );

  // The function moved onto the shared `{ data }` envelope. Older deployments
  // still answer with the payload at the top level, and a project can be on
  // either until the functions are redeployed, so both are accepted.
  const payload = body?.data ?? body;

  if (!payload?.signedUrl) {
    throw new ApiError(
      'Signed URL missing from response',
      502,
      'PDF_URL_MISSING',
    );
  }

  // Every open re-anchors the lock. Absent on an older deployment, in which
  // case the state stands as the last poll left it.
  useAccessStore.getState().applySignedPdfAccess(payload.access);

  return {
    url: payload.signedUrl,
    fileSizeBytes: payload.fileSizeBytes ?? undefined,
    /** Which file this is; `null` until the backend sends it. */
    pdfUpdatedAt: payload.pdfUpdatedAt ?? null,
    /** Seconds this URL is good for — already clamped to the membership. */
    expiresIn: payload.expiresIn,
  };
}

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

/**
 * Forgot password, step one: Supabase emails the address a reset code and a
 * link. Answers the same whether or not the address exists — Supabase does
 * not reveal that, and neither does the screen.
 */
export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: AUTH_REDIRECT_URL,
  });
  if (error) {
    throw error;
  }
}

/**
 * Forgot password, step two, from the code: proves the email with the
 * six digits (`recovery` OTP), which signs the reader in, then sets the
 * password on that session. The link path skips the first half —
 * AuthLinkProvider has already set the session — and calls `setNewPassword`.
 */
export async function resetPasswordWithCode(
  email: string,
  code: string,
  newPassword: string,
) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: code.trim(),
    type: 'recovery',
  });
  if (error) {
    throw error;
  }
  await setNewPassword(newPassword);
  return data;
}

/** Sets the password on the current session (recovery link, or a signed-in change). */
export async function setNewPassword(newPassword: string, nonce?: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
    ...(nonce ? { nonce } : null),
  });
  if (error) {
    throw error;
  }
}

/**
 * Change password, step one: Supabase emails the account's address a
 * one-time code (the "Reauthentication" template). The code is what proves
 * the person holding this phone is the person who owns the address — which
 * also makes it the way an account that came in through Google sets its
 * first password.
 */
export async function sendPasswordChangeCode() {
  const { error } = await supabase.auth.reauthenticate();
  if (error) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Signed-in devices
// ---------------------------------------------------------------------------

export type AuthSession = {
  id: string;
  createdAt: string;
  lastActiveAt: string;
  userAgent: string | null;
  ip: string | null;
  isCurrent: boolean;
};

function rpcError(error: { message: string; details?: string | null }): Error {
  // The backend raises its codes as the message with the sentence in details.
  const code = error.message.trim();
  return new Error(
    /^[A-Z_]+$/.test(code) && error.details?.trim()
      ? error.details.trim()
      : error.message,
  );
}

export async function listSessions(): Promise<AuthSession[]> {
  const { data, error } = await supabase.rpc('my_sessions');
  if (error) {
    throw rpcError(error);
  }
  return (data ?? []) as AuthSession[];
}

/** Signs one other device out. Its refresh token dies now; its access token within the hour. */
export async function revokeSession(sessionId: string): Promise<AuthSession[]> {
  const { data, error } = await supabase.rpc('revoke_session', {
    p_session_id: sessionId,
  });
  if (error) {
    throw rpcError(error);
  }
  return (data ?? []) as AuthSession[];
}

/** Signs every device but this one out. */
export async function signOutOtherDevices() {
  const { error } = await supabase.auth.signOut({ scope: 'others' });
  if (error) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Download my data
// ---------------------------------------------------------------------------

/** The reader's data as one JSON document, built by the backend on demand. */
export async function exportMyData(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('my_data_export');
  if (error) {
    throw rpcError(error);
  }
  return data as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// One-time codes: every auth email carries a six-digit code beside its link
// ---------------------------------------------------------------------------

/**
 * Forgot password, step two, code only: proves the address with the
 * `recovery` code and signs the reader in, leaving the new password to the
 * next screen. Same two calls as `resetPasswordWithCode`, split so the code
 * screen and the "choose a new password" screen can be two screens.
 */
export async function verifyRecoveryCode(email: string, code: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: code.trim(),
    type: 'recovery',
  });
  if (error) {
    throw error;
  }
  return data;
}

/**
 * Passwordless sign-in, step one: emails an existing account a sign-in code
 * and link. `shouldCreateUser: false` keeps this from quietly creating an
 * account for a mistyped address — sign-up is its own screen.
 */
export async function sendSignInCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: AUTH_REDIRECT_URL, shouldCreateUser: false },
  });
  if (error) {
    throw error;
  }
}

/** Passwordless sign-in, step two: the code from that email. */
export async function verifySignInCode(email: string, code: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: code.trim(),
    type: 'email',
  });
  if (error) {
    throw error;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Change email address — two codes (Secure Email Change is on)
// ---------------------------------------------------------------------------

/**
 * Where an email change stands, read off the user record.
 *
 * With Secure Email Change on, Supabase emails a code to the current address
 * and another to the new one, and the change lands only once both have been
 * entered. `new_email` stays on the record until then; it is the one honest
 * signal of "not finished yet", so the screen reads it rather than counting
 * codes it has accepted.
 */
export type EmailChangeProgress = {
  /** The address the account answers to right now. */
  currentEmail: string | null;
  /** The address waiting to be confirmed, or null when nothing is pending. */
  pendingEmail: string | null;
  /** True once `currentEmail` is the address that was asked for. */
  complete: boolean;
};

export function readEmailChangeProgress(
  user: { email?: string | null; new_email?: string | null } | null,
  requestedEmail: string,
): EmailChangeProgress {
  const currentEmail = user?.email ?? null;
  const wanted = requestedEmail.trim().toLowerCase();
  const complete = (currentEmail ?? '').toLowerCase() === wanted;
  return {
    currentEmail,
    pendingEmail: complete ? null : (user?.new_email ?? null),
    complete,
  };
}

/**
 * Change email, step one: asks Supabase to move the account to `newEmail`.
 * Two emails go out — one to the current address, one to the new — each with
 * its own code and link. Nothing changes until both are confirmed.
 */
export async function requestEmailChange(newEmail: string) {
  const { data, error } = await supabase.auth.updateUser(
    { email: newEmail.trim() },
    { emailRedirectTo: AUTH_REDIRECT_URL },
  );
  if (error) {
    throw error;
  }
  return data.user;
}

/**
 * Change email, steps two and three: one call per code, each with the
 * address that code was sent to. The order does not matter to Supabase; the
 * screen asks for the current address's code first because that is the one
 * the reader can already read.
 */
export async function verifyEmailChangeCode(email: string, code: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: code.trim(),
    type: 'email_change',
  });
  if (error) {
    throw error;
  }
  return data;
}

/** Sends both email-change codes again. Supabase keys the resend on the new address. */
export async function resendEmailChangeCodes(newEmail: string) {
  const { error } = await supabase.auth.resend({
    type: 'email_change',
    email: newEmail.trim(),
    options: { emailRedirectTo: AUTH_REDIRECT_URL },
  });
  if (error) {
    throw error;
  }
}
