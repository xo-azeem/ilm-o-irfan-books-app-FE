import { strings } from '@/i18n/strings';
import { supabase } from '@/lib/supabase';
import { stripStoragePrefix } from '@/services/mappers';

type PostgrestLike<T> = {
  data: T;
  error: { message: string; code?: string; details?: string } | null;
};

type FriendlyKey = keyof ReturnType<typeof strings>['adminPeople']['services'];

/** The database's own words, mapped to a sentence an operator can act on. */
const FRIENDLY_ERRORS: Array<[RegExp, FriendlyKey]> = [
  [/duplicate key value.*slug/i, 'slugTaken'],
  [/duplicate key value.*code/i, 'planCodeTaken'],
  // One SKU belongs to one plan: the webhook resolves a purchase by looking
  // the product id up, so two plans claiming it would make the grant a
  // coin-toss. The database enforces that with a unique index per column, and
  // its message names the index rather than the field an operator typed in.
  [/duplicate key value.*plans_app_store_product_id/i, 'appStoreIdTaken'],
  [/duplicate key value.*plans_play_store_product_id/i, 'playStoreIdTaken'],
  [/duplicate key value.*plans_revenuecat_product_id/i, 'sharedIdTaken'],
  [/books_published_needs_pdf/i, 'pdfBeforePublish'],
  [/still referenced by a book/i, 'fileInUse'],
  [/still used as an author portrait/i, 'portraitInUse'],
  [/violates foreign key.*author/i, 'authorHasBooks'],
  [/violates foreign key/i, 'stillReferenced'],
  [/not allowed/i, 'notAdminSession'],
  [/cannot demote the last admin/i, 'lastAdmin'],
  [/row-level security/i, 'sessionExpired'],
];

export function toFriendlyError(message: string): string {
  for (const [pattern, key] of FRIENDLY_ERRORS) {
    if (pattern.test(message)) {
      const friendly = strings().adminPeople.services[key];
      return typeof friendly === 'string' ? friendly : message;
    }
  }
  return message;
}

export function unwrap<T>(result: PostgrestLike<T>): NonNullable<T> {
  if (result.error) {
    throw new Error(toFriendlyError(result.error.message));
  }
  if (result.data == null) {
    throw new Error(strings().adminPeople.services.expectedData);
  }
  return result.data as NonNullable<T>;
}

export function assertOk(result: { error: { message: string } | null }) {
  if (result.error) {
    throw new Error(toFriendlyError(result.error.message));
  }
}

export function adminCoverUrl(
  path: string | null | undefined,
): string | undefined {
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
