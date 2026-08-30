import { supabase } from '@/lib/supabase/client';
import { ApiError, request } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
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
 * Asks the `get-signed-pdf` Edge Function for a short-lived download URL.
 *
 * The function is the only PDF gate, and it grants access on two conditions
 * and no others: the admin role, or an active entitlement. Anyone else gets
 * `PREMIUM_REQUIRED`, which the reader screen turns into the paywall.
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
    throw new ApiError('Signed URL missing from response', 502, 'PDF_URL_MISSING');
  }

  return { url: payload.signedUrl, fileSizeBytes: payload.fileSizeBytes ?? undefined };
}
