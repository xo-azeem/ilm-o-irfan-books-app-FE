import { assertOk, supabase, unwrap } from './client';
import type { AdminPlan, AdminPlanInput } from './types';

const PLAN_COLUMNS =
  'id,code,name,price_cents,currency,interval,features,revenuecat_product_id,' +
  'is_active,sort_order,created_at,updated_at';

/** `features` is jsonb — tolerate both a string array and objects with a label. */
function toFeatureList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(item => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        return String(record.label ?? record.title ?? record.name ?? '');
      }
      return '';
    })
    .filter(Boolean);
}

function normalize(row: Record<string, unknown>): AdminPlan {
  return {
    ...(row as AdminPlan),
    features: toFeatureList(row.features),
  };
}

export async function listAdminPlans(): Promise<AdminPlan[]> {
  const rows = unwrap(
    await supabase
      .from('plans')
      .select(PLAN_COLUMNS)
      .order('sort_order')
      .order('price_cents'),
  ) as unknown as Record<string, unknown>[];

  return rows.map(normalize);
}

export async function upsertAdminPlan(input: AdminPlanInput): Promise<string> {
  const payload = {
    code: input.code.trim().toLowerCase(),
    name: input.name.trim(),
    price_cents: Math.max(0, Math.round(input.price_cents)),
    currency: input.currency.trim().toUpperCase() || 'PKR',
    interval: input.interval,
    features: input.features.map(item => item.trim()).filter(Boolean),
    revenuecat_product_id: input.revenuecat_product_id.trim() || null,
    is_active: input.is_active,
    sort_order: input.sort_order,
  };

  if (input.id) {
    unwrap(await supabase.from('plans').update(payload).eq('id', input.id).select('id').single());
    return input.id;
  }

  return unwrap(await supabase.from('plans').insert(payload).select('id').single()).id;
}

export async function deleteAdminPlan(id: string) {
  assertOk(await supabase.from('plans').delete().eq('id', id));
}
