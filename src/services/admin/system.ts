import { assertOk, supabase, unwrap } from './client';
import type { AdminAnalytics, AdminDashboardStats, AdminSettings, AuditEntry, StorageAudit } from './types';

const SETTINGS_COLUMNS =
  'allow_pdf_without_entitlement,maintenance_mode,maintenance_message,signup_enabled,' +
  'min_supported_version,support_email,featured_collection_id,updated_at';

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const row = (unwrap(await supabase.rpc('admin_dashboard_stats')) ?? {}) as Record<string, unknown>;
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
    await supabase.from('app_settings').select(SETTINGS_COLUMNS).eq('id', 1).single(),
  ) as AdminSettings;
}

export async function updateAdminSettings(patch: Partial<AdminSettings>) {
  assertOk(await supabase.from('app_settings').update(patch).eq('id', 1));
}

export async function getAdminAnalytics(days = 30): Promise<AdminAnalytics> {
  return unwrap(await supabase.rpc('admin_analytics', { p_days: days })) as AdminAnalytics;
}

export const AUDIT_PAGE_SIZE = 30;

export type AuditPage = {
  rows: AuditEntry[];
  nextPage: number | null;
};

export async function listAuditLog(entityType: string | null, page = 0): Promise<AuditPage> {
  const from = page * AUDIT_PAGE_SIZE;

  let builder = supabase
    .from('admin_audit_log')
    .select('id,actor_id,actor_email,action,entity_type,entity_id,entity_label,changes,created_at')
    .order('created_at', { ascending: false })
    .range(from, from + AUDIT_PAGE_SIZE - 1);

  if (entityType) {
    builder = builder.eq('entity_type', entityType);
  }

  const rows = unwrap(await builder) as AuditEntry[];
  return { rows, nextPage: rows.length === AUDIT_PAGE_SIZE ? page + 1 : null };
}

export async function getStorageAudit(): Promise<StorageAudit> {
  const data = unwrap(await supabase.rpc('admin_storage_audit')) as StorageAudit;
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

export async function deleteStorageObject(bucket: 'covers' | 'pdfs', name: string) {
  assertOk(await supabase.rpc('admin_delete_storage_object', { p_bucket: bucket, p_name: name }));
  await supabase.storage.from(bucket).remove([name]);
}
