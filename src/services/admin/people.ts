import { assertOk, supabase, unwrap } from './client';
import {
  ADMIN_PAGE_SIZE,
  type AdminUserDetail,
  type AdminUserFilters,
  type AdminUserRow,
  type EntitlementStatus,
} from './types';

const USER_COLUMNS =
  'id,full_name,email,phone,country,avatar_path,role,created_at,entitlement_status,' +
  'starts_at,expires_at,store,plan_name,plan_id,is_subscriber,books_started,' +
  'books_finished,downloads_count,last_read_at';

export type AdminUserPage = {
  rows: AdminUserRow[];
  total: number;
  nextPage: number | null;
};

export async function listAdminUsers(
  filters: AdminUserFilters,
  page = 0,
): Promise<AdminUserPage> {
  const from = page * ADMIN_PAGE_SIZE;

  let builder = supabase
    .from('admin_user_directory')
    .select(USER_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);

  const query = filters.query.trim().replace(/[,()]/g, ' ');
  if (query) {
    builder = builder.or(`email.ilike.%${query}%,full_name.ilike.%${query}%`);
  }

  if (filters.role !== 'all') {
    builder = builder.eq('role', filters.role);
  }

  if (filters.access === 'subscriber') {
    builder = builder.eq('is_subscriber', true);
  } else if (filters.access === 'free') {
    builder = builder.eq('is_subscriber', false);
  }

  const result = await builder;
  assertOk(result);

  const rows = (result.data as unknown as AdminUserRow[]) ?? [];
  const total = result.count ?? rows.length;

  return {
    rows,
    total,
    nextPage: from + rows.length < total && rows.length > 0 ? page + 1 : null,
  };
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail> {
  const data = unwrap(
    await supabase.rpc('admin_user_detail', { p_user_id: userId }),
  ) as AdminUserDetail;

  return {
    profile: data.profile ?? null,
    streak: data.streak ?? null,
    reading: data.reading ?? [],
    downloads: data.downloads ?? [],
    wishlist_count: data.wishlist_count ?? 0,
    highlight_count: data.highlight_count ?? 0,
  };
}

export async function setAdminUserRole(userId: string, role: 'user' | 'admin') {
  assertOk(await supabase.rpc('admin_set_user_role', { target_id: userId, new_role: role }));
}

export type EntitlementInput = {
  userId: string;
  status: EntitlementStatus;
  planId: string | null;
  expiresAt: string | null;
};

export async function setAdminEntitlement(input: EntitlementInput) {
  assertOk(
    await supabase.rpc('admin_set_entitlement', {
      p_user_id: input.userId,
      p_status: input.status,
      p_plan_id: input.planId,
      p_expires_at: input.expiresAt,
    }),
  );
}
