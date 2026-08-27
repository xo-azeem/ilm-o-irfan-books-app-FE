export type AdminDashboardStats = {
  user_count: number;
  admin_count: number;
  subscriber_count: number;
  guest_signed_in_count: number;
  book_published_count: number;
  book_draft_count: number;
  author_count: number;
  download_completed_count: number;
};

export type AdminUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: 'user' | 'admin';
  created_at: string;
  entitlement_status: string | null;
  expires_at: string | null;
  store: string | null;
  plan_name: string | null;
};

export type AdminBookListRow = {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
  is_premium: boolean;
  pdf_path: string | null;
  cover_path: string | null;
  cover_color: string | null;
  updated_at: string;
  author_name: string;
};

export type AdminBookDetail = {
  id: string;
  title: string;
  slug: string;
  description: string;
  author_id: string;
  genre: string | null;
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
  tag: string | null;
  tags: string[];
  is_premium: boolean;
  is_published: boolean;
  published_at: string | null;
  updated_at: string;
  category_ids: string[];
  collection_ids: string[];
};

export type AdminAuthor = {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
};

export type AdminCategory = {
  id: string;
  slug: string;
  label: string;
  icon_key: string;
  accent: string | null;
  accent_dark: string | null;
  sort_order: number;
};

export type AdminCollection = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  accent: string | null;
  kind: 'hero' | 'shelf' | 'carousel';
  sort_order: number;
  is_published: boolean;
  book_ids: string[];
};

export const ADMIN_PAGE_SIZE = 50;
export const COVER_MAX_BYTES = 5 * 1024 * 1024;
export const PDF_MAX_BYTES = 100 * 1024 * 1024;

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function uniqueSlug(base: string): string {
  const root = slugify(base) || 'item';
  return `${root}-${Date.now().toString(36).slice(-4)}`;
}
