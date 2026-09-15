import { Platform } from 'react-native';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { env } from '@/config/env';
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
    super('Google sign-in was cancelled.');
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
    throw new Error('Google sign-in is not available in this build.');
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
    throw new Error(
      'Google did not return an ID token. Check that GOOGLE_WEB_CLIENT_ID is the Web client of the same Google Cloud project.',
    );
  }

  return { idToken, email: response.data.user.email ?? null };
}

function translateGoogleError(error: unknown): Error {
  if (isErrorWithCode(error)) {
    switch (error.code) {
      case statusCodes.SIGN_IN_CANCELLED:
        return new GoogleSignInCancelled();
      case statusCodes.IN_PROGRESS:
        return new Error('Google sign-in is already in progress.');
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return new Error(
          'Google Play services are missing or out of date on this device.',
        );
      default:
        return new Error(error.message || 'Google sign-in failed.');
    }
  }
  return error instanceof Error ? error : new Error('Google sign-in failed.');
}

/**
 * Signs in (or up) with Google.
 *
 * Returns the Supabase session data. Same email as an existing email/password
 * account → that account; a new email → a new account whose email Google has
 * already verified, so there is no confirmation step.
 */
export async function signInWithGoogle() {
  const { idToken } = await getGoogleIdToken();

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error) {
    throw error;
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
