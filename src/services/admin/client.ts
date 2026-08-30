import { supabase } from '@/lib/supabase';
import { stripStoragePrefix } from '@/services/mappers';

type PostgrestLike<T> = {
  data: T;
  error: { message: string; code?: string; details?: string } | null;
};

const FRIENDLY_ERRORS: Array<[RegExp, string]> = [
  [/duplicate key value.*slug/i, 'That slug is already taken. Try a different one.'],
  [/duplicate key value.*code/i, 'That plan code is already taken.'],
  [/books_published_needs_pdf/i, 'Upload a PDF before publishing this title.'],
  [/violates foreign key.*author/i, 'This author still has books. Reassign or delete them first.'],
  [/violates foreign key/i, 'Something still references this record. Remove those links first.'],
  [/not allowed/i, 'Your session is not an admin session. Sign out and back in.'],
  [/cannot demote the last admin/i, 'You cannot remove the last remaining admin.'],
  [/row-level security/i, 'Your admin session has expired. Sign out and back in.'],
];

export function toFriendlyError(message: string): string {
  for (const [pattern, friendly] of FRIENDLY_ERRORS) {
    if (pattern.test(message)) {
      return friendly;
    }
  }
  return message;
}

export function unwrap<T>(result: PostgrestLike<T>): NonNullable<T> {
  if (result.error) {
    throw new Error(toFriendlyError(result.error.message));
  }
  if (result.data == null) {
    throw new Error('Expected data was not returned.');
  }
  return result.data as NonNullable<T>;
}

export function assertOk(result: { error: { message: string } | null }) {
  if (result.error) {
    throw new Error(toFriendlyError(result.error.message));
  }
}

export function adminCoverUrl(path: string | null | undefined): string | undefined {
  if (!path) {
    return undefined;
  }
  return supabase.storage
    .from('covers')
    .getPublicUrl(stripStoragePrefix(path, 'covers')).data.publicUrl;
}

/** PostgREST returns `numeric` as a string. */
export function num(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export { supabase };
