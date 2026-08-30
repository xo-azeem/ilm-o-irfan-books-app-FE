/**
 * Row shapes returned by the backend Edge Functions.
 *
 * These mirror the SQL views the endpoints select from, so the nullability here
 * is the database's, not a guess. Notably `book_list_items` switched to a
 * `left join` on authors, which means `author_name` is now nullable for a book
 * with no author record.
 */

/** `public.book_list_items` — the lean catalog row. */
export type BookListItem = {
  id: string;
  slug: string | null;
  title: string;
  author_name: string | null;
  author_id: string | null;
  cover_path: string | null;
  cover_color: string | null;
  cover_color_dark: string | null;
  rating: number | string | null;
  tag: string | null;
  genre: string | null;
  read_time_minutes: number | null;
  price_cents: number | string | null;
  currency: string | null;
  format: string | null;
  is_premium: boolean;
  published_at: string | null;
};

/** The nested author relation `book-detail` selects from `public.authors`. */
export type BookAuthor = {
  id: string;
  name: string;
  slug: string | null;
  avatar_path: string | null;
};

/** `book-detail` — the full record, with description and the author join. */
export type BookDetailRow = {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  genre: string | null;
  rating: number | string | null;
  rating_count: number | null;
  price_cents: number | string | null;
  currency: string | null;
  format: string | null;
  cover_path: string | null;
  cover_color: string | null;
  cover_color_dark: string | null;
  /**
   * Absent from `book-detail` by design — the bytes are only reachable through
   * `get-signed-pdf`, which enforces the paywall.
   */
  pdf_path?: string | null;
  read_time_minutes: number | null;
  tag: string | null;
  tags: string[] | null;
  is_premium: boolean;
  is_published: boolean;
  published_at: string | null;
  author: BookAuthor | BookAuthor[] | null;
};

/** `public.category_with_counts`. */
export type CategoryRow = {
  id: string;
  slug: string | null;
  label: string;
  icon_key: string | null;
  accent: string | null;
  accent_dark: string | null;
  sort_order: number | null;
  book_count: number;
};

/** `public.collection_summaries`. */
export type CollectionRow = {
  id: string;
  slug: string | null;
  title: string;
  subtitle: string | null;
  accent: string | null;
  kind: string;
  sort_order: number | null;
  book_count: number;
};

/** `home-feed` bundles the three public reads into one round trip. */
export type HomeFeedPayload = {
  collections: CollectionRow[];
  books: BookListItem[];
  categories: CategoryRow[];
};

/** `public.plans` rows from `plans-list` and the entitlement join. */
export type PlanRow = {
  id: string;
  code: string | null;
  name: string;
  price_cents: number | string | null;
  currency: string | null;
  interval: string | null;
  features: string[] | null;
  is_active: boolean;
  sort_order: number | null;
};

/**
 * An `entitlements` row with its plan relation.
 *
 * The relation is aliased `plan` by the current endpoint and was `plans`
 * before; both are declared so either deployment parses.
 */
export type EntitlementRow = {
  user_id: string;
  plan_id: string | null;
  status: string | null;
  starts_at: string | null;
  expires_at: string | null;
  store: string | null;
  updated_at: string | null;
  plan?: PlanRow | PlanRow[] | null;
  plans?: PlanRow | PlanRow[] | null;
};

/**
 * `entitlements-status` answers with the derived flag alongside the row, so the
 * app does not re-derive "is this reader premium" from a status and an expiry.
 * An older deployment returns the bare row instead.
 */
export type EntitlementStatus = {
  isActive: boolean;
  entitlement: EntitlementRow | null;
};

/** `profile-read` returns the whole `public.profiles` row. */
export type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_path: string | null;
  date_of_birth: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  role: string | null;
  created_at: string;
  updated_at: string | null;
};

/** `reading-progress` (GET and POST both answer with this row). */
export type ReadingProgressRow = {
  user_id: string;
  book_id: string;
  current_page: number | null;
  total_pages: number | null;
  progress: number | string | null;
  chapter_label: string | null;
  last_read_at: string | null;
};

/** `highlights-list` / `highlights-upsert`. */
export type HighlightRow = {
  id: string;
  user_id: string;
  book_id: string;
  page_number: number | null;
  text_excerpt: string | null;
  note: string | null;
  color: string | null;
  created_at: string;
};

/** `downloads-create` and the rows behind `downloads-list`. */
export type DownloadRow = {
  id: string;
  book_id: string;
  status: 'pending' | 'completed' | 'failed';
  file_size_bytes: number | null;
  downloaded_at: string | null;
};

/** `wishlist-toggle` reports which way it went so the UI need not re-read. */
export type WishlistToggleResult = {
  book_id: string;
  /** The resulting state — the field to trust. */
  wishlisted?: boolean;
  added?: boolean;
  removed?: boolean;
};

/** `get-signed-pdf` answers bare, without the `{ data }` envelope. */
export type SignedPdfPayload = {
  bookId: string;
  title: string;
  signedUrl: string;
  expiresIn: number;
  fileSizeBytes: number | null;
};
