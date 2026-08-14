import { env } from '@/config/env';
import { supabase } from '@/lib/supabase/client';

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

/** Calls the get-signed-pdf Edge Function after the user is authenticated. */
export async function getSignedPdfUrl(bookId: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be signed in to download this book.');
  }

  const response = await fetch(
    `${env.supabaseUrl}/functions/v1/get-signed-pdf`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: env.supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookId }),
    },
  );

  const payload = (await response.json()) as {
    signedUrl?: string;
    error?: string;
    code?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? 'Failed to get signed PDF URL');
  }

  if (!payload.signedUrl) {
    throw new Error('Signed URL missing from response');
  }

  return payload.signedUrl;
}
