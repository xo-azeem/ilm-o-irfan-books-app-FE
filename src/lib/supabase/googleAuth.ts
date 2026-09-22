import { Platform } from 'react-native';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { env } from '@/config/env';
import { strings } from '@/i18n/strings';
import { supabase } from '@/lib/supabase/client';

/**
 * Google sign-in, the native way.
 *
 * The Google SDK opens the account sheet and hands back an ID token minted for
 * our *Web* OAuth client; Supabase verifies that token against the same client
 * and answers with a session. No browser, no redirect, no PKCE dance — which is
 * also why the Supabase Google provider needs "Skip nonce check" on: the native
 * SDKs do not carry Supabase's nonce through.
 *
 * One user, however they arrive: Supabase links a Google identity to an
 * existing email/password account with the same *verified* email
 * automatically, so a reader who signed up with a password and later taps
 * Google lands on the account they already have. `linkGoogleIdentity` is the
 * explicit version of that, for a signed-in reader adding Google from
 * settings.
 */

let configured = false;

/** True on a build with a Web client id, and on iOS also an iOS client id. */
export function isGoogleSignInAvailable(): boolean {
  if (!env.google.web) {
    return false;
  }
  if (Platform.OS === 'ios') {
    return Boolean(env.google.ios);
  }
  return Platform.OS === 'android';
}

function configureGoogle(): boolean {
  if (!isGoogleSignInAvailable()) {
    return false;
  }
  if (configured) {
    return true;
  }
  GoogleSignin.configure({
    webClientId: env.google.web,
    ...(Platform.OS === 'ios' ? { iosClientId: env.google.ios } : null),
    scopes: ['email', 'profile'],
  });
  configured = true;
  return true;
}

export class GoogleSignInCancelled extends Error {
  constructor() {
    super(strings().auth.googleErrors.cancelled);
    this.name = 'GoogleSignInCancelled';
  }
}

/**
 * Opens the Google account sheet and returns the ID token, or throws.
 *
 * A dismissed sheet throws `GoogleSignInCancelled`, which callers treat as
 * silence rather than an error. Everything else carries a message a reader
 * can act on ("update Google Play services").
 */
async function getGoogleIdToken(): Promise<{
  idToken: string;
  email: string | null;
}> {
  if (!configureGoogle()) {
    throw new Error(strings().auth.googleErrors.unavailable);
  }

  if (Platform.OS === 'android') {
    // Throws with PLAY_SERVICES_NOT_AVAILABLE after offering the update dialog.
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  // A previous account left in the SDK would otherwise be re-used without
  // showing the picker, which is wrong for a shared device.
  try {
    await GoogleSignin.signOut();
  } catch {
    // Nothing was signed in.
  }

  let response;
  try {
    response = await GoogleSignin.signIn();
  } catch (error) {
    throw translateGoogleError(error);
  }

  if (!isSuccessResponse(response)) {
    throw new GoogleSignInCancelled();
  }

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error(strings().auth.googleErrors.noIdToken);
  }

  return { idToken, email: response.data.user.email ?? null };
}

function translateGoogleError(error: unknown): Error {
  if (isErrorWithCode(error)) {
    switch (error.code) {
      case statusCodes.SIGN_IN_CANCELLED:
        return new GoogleSignInCancelled();
      case statusCodes.IN_PROGRESS:
        return new Error(strings().auth.googleErrors.inProgress);
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return new Error(strings().auth.googleErrors.playServices);
      default:
        return new Error(error.message || strings().auth.googleErrors.failed);
    }
  }
  return error instanceof Error
    ? error
    : new Error(strings().auth.googleErrors.failed);
}

/**
 * An account already uses the Google address, and it is not linkable yet.
 *
 * Supabase links a Google identity to an existing account automatically when
 * that account's email is *confirmed* — which is the whole of "one account,
 * two doors". An account that signed up with a password and never confirmed
 * is the exception: linking it on the word of whoever typed the address in
 * first would hand them the Google user's library, so Supabase refuses and
 * the app sends the reader to confirm the address instead.
 */
export class GoogleEmailConflict extends Error {
  readonly googleEmail: string | null;
  /** What Supabase actually answered, for the log. */
  readonly reason: unknown;

  constructor(email: string | null, reason: unknown) {
    super(strings().auth.errors.verifyBeforeGoogle);
    this.name = 'GoogleEmailConflict';
    this.googleEmail = email;
    this.reason = reason;
  }
}

/** Whether a failed sign-in is "that address already has an account". */
function isEmailConflict(error: unknown): boolean {
  const code = (error as { code?: string } | undefined)?.code ?? '';
  const message = error instanceof Error ? error.message : '';
  const text = `${code} ${message}`;
  return (
    code === 'email_exists' ||
    code === 'user_already_exists' ||
    code === 'identity_already_exists' ||
    /already (been )?registered|already exists|email address is taken/i.test(
      text,
    )
  );
}

/**
 * Signs in (or up) with Google.
 *
 * Returns the Supabase session data. Same email as an existing *verified*
 * email/password account → that account, with the Google identity linked to
 * it; a new email → a new account whose email Google has already verified,
 * so there is no confirmation step. An unverified account on that address
 * throws `GoogleEmailConflict`, which the caller turns into "verify, then
 * connect Google".
 */
export async function signInWithGoogle() {
  const { idToken, email } = await getGoogleIdToken();

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error) {
    throw isEmailConflict(error)
      ? new GoogleEmailConflict(email, error)
      : error;
  }

  return data;
}

/**
 * Adds Google to the signed-in reader's account.
 *
 * Needs "Manual linking" on in Supabase (the backend has it on). The Google
 * account's email may differ from the account's own — that is the point of an
 * explicit link — and the caller decides whether the account email must be
 * verified first (`useSignInMethods` requires it).
 */
export async function linkGoogleIdentity() {
  const { idToken, email } = await getGoogleIdToken();

  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google',
    token: idToken,
  });

  if (error) {
    throw error;
  }

  return { ...data, googleEmail: email };
}

/** Removes the Google identity. Supabase refuses if it is the only one left. */
export async function unlinkGoogleIdentity() {
  const { data, error } = await supabase.auth.getUserIdentities();
  if (error) {
    throw error;
  }

  const google = data?.identities.find(
    identity => identity.provider === 'google',
  );
  if (!google) {
    return;
  }

  const { error: unlinkError } = await supabase.auth.unlinkIdentity(google);
  if (unlinkError) {
    throw unlinkError;
  }

  try {
    await GoogleSignin.signOut();
  } catch {
    // The SDK had nothing signed in.
  }
}

/** Forgets the Google account on sign-out so the next reader gets the picker. */
export async function forgetGoogleSession(): Promise<void> {
  if (!configured) {
    return;
  }
  try {
    await GoogleSignin.signOut();
  } catch {
    // Nothing was signed in.
  }
}
