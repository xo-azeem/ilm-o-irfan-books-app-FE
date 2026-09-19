import { assertOk, supabase, toFriendlyError, unwrap } from './client';
import type {
  AdminAnalytics,
  AdminDashboardStats,
  AdminSettings,
  AuditEntry,
  StorageAudit,
} from './types';

const SETTINGS_COLUMNS =
  'maintenance_mode,maintenance_message,signup_enabled,' +
  'min_supported_version,support_email,featured_collection_id,updated_at';

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const row = (unwrap(await supabase.rpc('admin_dashboard_stats')) ??
    {}) as Record<string, unknown>;
  const read = (key: string) => Number(row[key] ?? 0);

  return {
    user_count: read('user_count'),
    admin_count: read('admin_count'),
    subscriber_count: read('subscriber_count'),
    guest_signed_in_count: read('guest_signed_in_count'),
    book_published_count: read('book_published_count'),
    book_draft_count: read('book_draft_count'),
    author_count: read('author_count'),
    category_count: read('category_count'),
    collection_count: read('collection_count'),
    plan_count: read('plan_count'),
    download_completed_count: read('download_completed_count'),
    missing_pdf_count: read('missing_pdf_count'),
    missing_cover_count: read('missing_cover_count'),
    signups_7d: read('signups_7d'),
    reads_7d: read('reads_7d'),
    downloads_7d: read('downloads_7d'),
  };
}

export async function getAdminSettings(): Promise<AdminSettings> {
  return unwrap(
    await supabase
      .from('app_settings')
      .select(SETTINGS_COLUMNS)
      .eq('id', 1)
      .single(),
  ) as AdminSettings;
}

/**
 * Writes the product flags.
 *
 * The updated row is selected back deliberately. `app_settings` is guarded by
 * the `app_settings_update_admin` RLS policy, and an update that the policy
 * filters out matches zero rows and returns **no error** — so without reading
 * something back, a non-admin session toggling "Free PDF access" would get a
 * success toast for a write that never happened, and only find out when the
 * value reverted on the next refetch.
 */
export async function updateAdminSettings(patch: Partial<AdminSettings>) {
  const result = await supabase
    .from('app_settings')
    .update(patch)
    .eq('id', 1)
    .select(SETTINGS_COLUMNS)
    .maybeSingle();

  assertOk(result);

  if (!result.data) {
    throw new Error(
      'That change was not saved — your session is not an admin session. Sign out and back in, then try again.',
    );
  }

  return result.data as unknown as AdminSettings;
}

export async function getAdminAnalytics(days = 30): Promise<AdminAnalytics> {
  return unwrap(
    await supabase.rpc('admin_analytics', { p_days: days }),
  ) as AdminAnalytics;
}

export const AUDIT_PAGE_SIZE = 30;

export type AuditPage = {
  rows: AuditEntry[];
  nextPage: number | null;
};

export type AuditScope = {
  /** One table, or every table. */
  entityType: string | null;
  /** One kind of change, or every kind. */
  action: AuditEntry['action'] | null;
};

export async function listAuditLog(
  scope: AuditScope,
  page = 0,
): Promise<AuditPage> {
  const from = page * AUDIT_PAGE_SIZE;

  let builder = supabase
    .from('admin_audit_log')
    .select(
      'id,actor_id,actor_email,action,entity_type,entity_id,entity_label,changes,created_at',
    )
    .order('created_at', { ascending: false })
    .range(from, from + AUDIT_PAGE_SIZE - 1);

  if (scope.entityType) {
    builder = builder.eq('entity_type', scope.entityType);
  }
  if (scope.action) {
    builder = builder.eq('action', scope.action);
  }

  const rows = unwrap(await builder) as AuditEntry[];
  return { rows, nextPage: rows.length === AUDIT_PAGE_SIZE ? page + 1 : null };
}

export async function getStorageAudit(): Promise<StorageAudit> {
  const data = unwrap(
    await supabase.rpc('admin_storage_audit'),
  ) as StorageAudit;
  return {
    orphans: data.orphans ?? [],
    broken: data.broken ?? [],
    totals: data.totals ?? {
      covers_bytes: 0,
      pdfs_bytes: 0,
      covers_count: 0,
      pdfs_count: 0,
    },
  };
}

/**
 * Removes an orphaned cover or PDF.
 *
 * Two steps on purpose. The RPC is the guard — admin, managed bucket, and
 * nothing (book or author portrait) still pointing at the object — and it
 * returns whether the object exists. The object itself can only be removed
 * through the Storage API: Supabase refuses SQL deletes on storage.objects,
 * which is what used to make every "Delete" here fail. The API call runs as
 * the admin, under the covers/pdfs admin delete policies.
 */
export async function deleteStorageObject(
  bucket: 'covers' | 'pdfs',
  name: string,
) {
  const exists = unwrap(
    await supabase.rpc('admin_delete_storage_object', {
      p_bucket: bucket,
      p_name: name,
    }),
  ) as boolean | null;

  if (!exists) {
    return;
  }

  const { error } = await supabase.storage.from(bucket).remove([name]);
  if (error) {
    throw new Error(toFriendlyError(error.message));
  }
}
