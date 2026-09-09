import { ENV } from '@/config/env';
import { supabase } from '@/lib/supabase';

import type { ApiErrorBody } from './types';

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

type InvokeOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** When true, use anon key even if a session exists (rare). */
  publicOnly?: boolean;
};

function buildQuery(query?: InvokeOptions['query']): string {
  if (!query) {
    return '';
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function invokeEdge<T>(
  name: string,
  options: InvokeOptions = {},
): Promise<T> {
  const method = options.method ?? 'GET';
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token =
    options.publicOnly || !session?.access_token
      ? ENV.SUPABASE_ANON_KEY
      : session.access_token;

  const url = `${ENV.SUPABASE_URL}/functions/v1/${name}${buildQuery(options.query)}`;

  const headers: Record<string, string> = {
    apikey: ENV.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError(
      'UNEXPECTED_ERROR',
      `Non-JSON response from ${name} (${response.status})`,
      response.status,
    );
  }

  const errBody = json as ApiErrorBody | null;
  if (!response.ok || (errBody && errBody.error)) {
    const code = errBody?.error?.code ?? 'UNEXPECTED_ERROR';
    const message = errBody?.error?.message ?? `Request failed (${response.status})`;
    throw new ApiError(code, message, response.status);
  }

  const envelope = json as { data?: T } | T;
  if (
    envelope &&
    typeof envelope === 'object' &&
    'data' in envelope &&
    (envelope as { data: T }).data !== undefined
  ) {
    return (envelope as { data: T }).data;
  }

  // plans-list and some list envelopes already use top-level data + page meta;
  // callers that need the full paginated envelope should use invokeEdgeRaw.
  return envelope as T;
}

/** Returns the full JSON body (for paginated lists that keep page meta at top level). */
export async function invokeEdgeRaw<T>(
  name: string,
  options: InvokeOptions = {},
): Promise<T> {
  const method = options.method ?? 'GET';
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token =
    options.publicOnly || !session?.access_token
      ? ENV.SUPABASE_ANON_KEY
      : session.access_token;

  const url = `${ENV.SUPABASE_URL}/functions/v1/${name}${buildQuery(options.query)}`;

  const headers: Record<string, string> = {
    apikey: ENV.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError(
      'UNEXPECTED_ERROR',
      `Non-JSON response from ${name} (${response.status})`,
      response.status,
    );
  }

  const errBody = json as ApiErrorBody | null;
  if (!response.ok || (errBody && errBody.error)) {
    const code = errBody?.error?.code ?? 'UNEXPECTED_ERROR';
    const message = errBody?.error?.message ?? `Request failed (${response.status})`;
    throw new ApiError(code, message, response.status);
  }

  return json as T;
}
