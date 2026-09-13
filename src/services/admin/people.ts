import { assertOk, supabase, unwrap } from './client';
import { anyColumnLike } from './search';
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

/** What the People search bar promises: a name, an email or a phone number. */
const USER_SEARCH_COLUMNS = ['full_name', 'email', 'phone'];

/** How far ahead "Expiring" looks. */
export const EXPIRING_WINDOW_DAYS = 14;

/** Entitlement states that mean access is about to stop on its own. */
const AT_RISK_STATUSES: EntitlementStatus[] = [
  'billing_issue',
  'grace',
  'cancelled',
];

export type AdminUserPage = {
  rows: AdminUserRow[];
  total: number;
  nextPage: number | null;
};

/** An ISO instant without the milliseconds — tidier inside a filter string. */
function isoSeconds(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * One page of the People directory, every filter applied by the database so
 * `total` is the true number of matches and paging cannot skip or repeat.
 *
 * "Expiring" is the one audience that is a question about dates: an
 * entitlement already in trouble, or an active one that runs out within the
 * window. Both branches are decided against the clock at fetch time, which
 * is why the term is a filter value rather than a stored column.
 */
export async function listAdminUsers(
  filters: AdminUserFilters,
  page = 0,
): Promise<AdminUserPage> {
  const from = page * ADMIN_PAGE_SIZE;

  let builder = supabase
    .from('admin_user_directory')
    .select(USER_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    // The same tie-break as the index and the endpoint, so two readers who
    // signed up in the same instant cannot swap pages between fetches.
    .order('id', { ascending: true })
    .range(from, from + ADMIN_PAGE_SIZE - 1);

  const search = anyColumnLike(filters.query, USER_SEARCH_COLUMNS);
  if (search) {
    builder = builder.or(search);
  }

  if (filters.role !== 'all') {
    builder = builder.eq('role', filters.role);
  }

  if (filters.access === 'subscriber') {
    builder = builder.eq('is_subscriber', true);
  } else if (filters.access === 'free') {
    builder = builder.eq('is_subscriber', false);
  } else if (filters.access === 'expiring') {
    const now = new Date();
    const until = new Date(now.getTime() + EXPIRING_WINDOW_DAYS * 86_400_000);
    builder = builder.or(
      `entitlement_status.in.(${AT_RISK_STATUSES.join(',')}),` +
        `and(entitlement_status.eq.active,expires_at.gte.${isoSeconds(now)},` +
        `expires_at.lte.${isoSeconds(until)})`,
    );
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

export async function getAdminUserDetail(
  userId: string,
): Promise<AdminUserDetail> {
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
  assertOk(
    await supabase.rpc('admin_set_user_role', {
      target_id: userId,
      new_role: role,
    }),
  );
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
