import { strings } from '@/i18n/strings';

export type AdminDashboardStats = {
  user_count: number;
  admin_count: number;
  subscriber_count: number;
  guest_signed_in_count: number;
  book_published_count: number;
  book_draft_count: number;
  author_count: number;
  category_count: number;
  collection_count: number;
  plan_count: number;
  download_completed_count: number;
  missing_pdf_count: number;
  missing_cover_count: number;
  signups_7d: number;
  reads_7d: number;
  downloads_7d: number;
};

export type AdminBookRow = {
  id: string;
  slug: string;
  title: string;
  author_id: string;
  author_name: string;
  genre: string | null;
  tag: string | null;
  tags: string[];
  rating: number;
  rating_count: number;
  price_cents: number;
  currency: string;
  format: string;
  cover_path: string | null;
  cover_color: string | null;
  cover_color_dark: string | null;
  pdf_path: string | null;
  file_size_bytes: number | null;
  read_time_minutes: number | null;
  is_premium: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  category_ids: string[];
  collection_ids: string[];
  reader_count: number;
  download_count: number;
  wishlist_count: number;
  /** The bulk upload this book arrived in, until it is published or detached. */
  upload_batch_id: string | null;
};

export type AdminBookDetail = AdminBookRow & {
  description: string;
};

export type AdminBookInput = {
  title: string;
  slug: string;
  description: string;
  author_id: string;
  genre: string;
  tag: string;
  tags: string[];
  cover_color: string;
  cover_color_dark: string;
  cover_path: string | null;
  pdf_path: string | null;
  file_size_bytes: number | null;
  read_time_minutes: number | null;
  price_cents: number;
  currency: string;
  format: string;
  is_premium: boolean;
  is_published: boolean;
  category_ids: string[];
  collection_ids: string[];
  /**
   * The bulk upload to file the book under. Left out, an existing book keeps
   * whatever batch it has; `null` takes it out of one.
   */
  upload_batch_id?: string | null;
};

export type BookStatusFilter = 'all' | 'published' | 'draft' | 'incomplete';
export type BookAccessFilter = 'all' | 'premium' | 'free';
export type BookSort =
  | 'updated_desc'
  | 'created_desc'
  | 'title_asc'
  | 'readers_desc'
  | 'downloads_desc';

export type AdminBookFilters = {
  query: string;
  status: BookStatusFilter;
  access: BookAccessFilter;
  authorId: string | null;
  categoryId: string | null;
  sort: BookSort;
};

export type AdminAuthor = {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  avatar_path: string | null;
  created_at: string;
  updated_at: string;
  book_count: number;
  published_count: number;
};

export type AdminCategory = {
  id: string;
  slug: string;
  label: string;
  icon_key: string;
  accent: string | null;
  accent_dark: string | null;
  sort_order: number;
  created_at: string;
  book_count: number;
};

export type AdminCollectionKind = 'hero' | 'shelf' | 'carousel';

export type AdminCollection = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  accent: string | null;
  kind: AdminCollectionKind;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  /** Every book the admin put on the shelf, drafts included. */
  book_count: number;
  /** The ones readers will actually see. */
  published_count: number;
  /**
   * `home-hero`, `trending` or `new-arrivals`: a rail Home renders by slug.
   * Can be retitled, reordered and hidden, never deleted or re-slugged.
   */
  is_system: boolean;
};

/**
 * What each system shelf is, for the editor to say so.
 *
 * All three take a curated list now. Each has a stand-in the server serves
 * when the list is empty — the newest published books, or for `trending`
 * the weekly draw — which is what `standIn` names in the editor.
 */
const SYSTEM_SHELF_CURATED: Record<
  'home-hero' | 'trending' | 'new-arrivals',
  boolean
> = {
  'home-hero': true,
  trending: true,
  'new-arrivals': true,
};

export type SystemShelfNote = {
  label: string;
  note: string;
  /** What readers see while the list is empty, for the editor's copy. */
  standIn: string;
  curated: boolean;
};

/** The words come from the dictionary, so the editor reads in the admin's language. */
export function systemShelfNote(slug: string): SystemShelfNote | undefined {
  if (!(slug in SYSTEM_SHELF_CURATED)) return undefined;
  const key = slug as keyof typeof SYSTEM_SHELF_CURATED;
  const words = strings().adminLibrary.shelfNotes[key];
  return { ...words, curated: SYSTEM_SHELF_CURATED[key] };
}

export type EntitlementStatus =
  'active' | 'expired' | 'cancelled' | 'grace' | 'billing_issue' | 'trial';

export type AdminUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  avatar_path: string | null;
  role: 'user' | 'admin';
  created_at: string;
  entitlement_status: EntitlementStatus | null;
  starts_at: string | null;
  expires_at: string | null;
  store: string | null;
  plan_name: string | null;
  plan_id: string | null;
  is_subscriber: boolean;
  books_started: number;
  books_finished: number;
  downloads_count: number;
  last_read_at: string | null;
};

export type UserRoleFilter = 'all' | 'admin' | 'user';
/** `expiring`: access that is failing to bill or runs out within the window. */
export type UserAccessFilter = 'all' | 'subscriber' | 'free' | 'expiring';

export type AdminUserFilters = {
  query: string;
  role: UserRoleFilter;
  access: UserAccessFilter;
};

export type AdminUserDetail = {
  profile: AdminUserRow | null;
  streak: {
    current_streak: number;
    longest_streak: number;
    last_read_date: string | null;
  } | null;
  reading: Array<{
    book_id: string;
    title: string;
    cover_path: string | null;
    cover_color: string | null;
    progress: number;
    current_page: number;
    last_read_at: string;
  }>;
  downloads: Array<{
    book_id: string;
    title: string;
    status: string;
    file_size_bytes: number | null;
    downloaded_at: string;
  }>;
  wishlist_count: number;
  highlight_count: number;
};

export type AdminPlan = {
  id: string;
  code: string;
  name: string;
  price_cents: number;
  currency: string;
  interval: 'month' | 'year' | 'lifetime';
  features: string[];
  revenuecat_product_id: string | null;
  app_store_product_id: string | null;
  play_store_product_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AdminPlanInput = {
  id?: string;
  code: string;
  name: string;
  price_cents: number;
  currency: string;
  interval: AdminPlan['interval'];
  features: string[];
  revenuecat_product_id: string;
  app_store_product_id?: string;
  play_store_product_id?: string;
  is_active: boolean;
  sort_order: number;
};

/**
 * Product flags the admin CMS can edit.
 *
 * `allow_pdf_without_entitlement` is deliberately absent: PDF access is decided
 * by `get-signed-pdf` from the admin role and the entitlement alone, so there
 * is no flag for an operator to get wrong.
 */
export type AdminSettings = {
  maintenance_mode: boolean;
  maintenance_message: string | null;
  signup_enabled: boolean;
  min_supported_version: string | null;
  support_email: string | null;
  featured_collection_id: string | null;
  /**
   * RevenueCat public SDK keys (goog_… / appl_…, or a test_… Test Store
   * key), served to every install by `app-status`. Public by design; the
   * backend refuses anything not shaped like one, so the secret key cannot
   * be pasted here by mistake.
   */
  revenuecat_android_key: string | null;
  revenuecat_ios_key: string | null;
  updated_at: string;
};

export type AuditEntry = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: 'insert' | 'update' | 'delete';
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  changes: Record<string, { from: unknown; to: unknown }>;
  created_at: string;
};

export type TimeSeriesPoint = { date: string; value: number };

export type AdminAnalytics = {
  days: number;
  signups: TimeSeriesPoint[];
  reads: TimeSeriesPoint[];
  downloads: TimeSeriesPoint[];
  top_books: Array<{
    book_id: string;
    title: string;
    author_name: string;
    cover_path: string | null;
    cover_color: string | null;
    readers: number;
    avg_progress: number;
  }>;
  top_categories: Array<{
    category_id: string;
    label: string;
    accent: string | null;
    book_count: number;
    readers: number;
  }>;
  catalog: {
    published: number;
    draft: number;
    missing_pdf: number;
    missing_cover: number;
    premium: number;
  };
  audience: {
    total: number;
    admins: number;
    subscribers: number;
    new_in_period: number;
    active_in_period: number;
  };
};

export type StorageAudit = {
  orphans: Array<{
    bucket: 'covers' | 'pdfs';
    name: string;
    size: number | null;
    created_at: string;
  }>;
  broken: Array<{
    book_id: string;
    title: string;
    missing_cover: boolean;
    missing_pdf: boolean;
  }>;
  totals: {
    covers_bytes: number;
    pdfs_bytes: number;
    covers_count: number;
    pdfs_count: number;
  };
};

export const ADMIN_PAGE_SIZE = 24;
export const COVER_MAX_BYTES = 5 * 1024 * 1024;
export const PDF_MAX_BYTES = 100 * 1024 * 1024;

export const COLLECTION_KINDS: AdminCollectionKind[] = [
  'hero',
  'shelf',
  'carousel',
];
export const PLAN_INTERVALS: AdminPlan['interval'][] = [
  'month',
  'year',
  'lifetime',
];
export const ENTITLEMENT_STATUSES: EntitlementStatus[] = [
  'active',
  'trial',
  'grace',
  'billing_issue',
  'cancelled',
  'expired',
];

/** Icon keys the consumer catalog knows how to render. */
export const CATEGORY_ICON_KEYS = [
  'book-marked',
  'book',
  'sparkles',
  'landmark',
  'scale',
  'scroll-text',
  'globe',
] as const;

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function uniqueSlug(base: string): string {
  const root = slugify(base) || 'item';
  return `${root}-${Date.now().toString(36).slice(-4)}`;
}
