import { strings } from '@/i18n/strings';

/**
 * Supabase answers a refused sign-in or sign-up in its own English —
 * "Invalid login credentials", "User already registered" — and the app
 * shows that message in a dialog. Read in the interface language, with the
 * common refusals said in the app's own words; anything unrecognised keeps
 * the server's message, which is still better than nothing at all.
 */
export function describeAuthError(error: unknown, fallback: string): string {
  const s = strings().auth.errors;
  const code = (error as { code?: string } | undefined)?.code ?? '';
  const message = error instanceof Error ? error.message : '';
  const text = `${code} ${message}`;

  if (
    code === 'invalid_credentials' ||
    /invalid login credentials/i.test(text)
  ) {
    return s.invalidCredentials;
  }
  if (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    /already (been )?registered|already exists/i.test(text)
  ) {
    return s.emailTaken;
  }
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(text)) {
    return s.emailNotConfirmed;
  }
  if (
    /rate limit|too many requests|after \d+ seconds/i.test(text) ||
    code.startsWith('over_')
  ) {
    return s.rateLimited;
  }
  if (code === 'weak_password' || /weak password|password should/i.test(text)) {
    return s.weakPassword;
  }
  if (code === 'same_password' || /different from the old/i.test(text)) {
    return s.samePassword;
  }
  if (
    code === 'signup_disabled' ||
    /signups? not allowed|signups? disabled/i.test(text)
  ) {
    return s.signupsClosed;
  }
  if (/network request failed|failed to fetch|fetch failed/i.test(text)) {
    return s.network;
  }
  return message || fallback;
}
