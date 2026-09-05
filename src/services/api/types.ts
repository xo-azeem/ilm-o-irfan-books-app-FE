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

/**
 * `home-feed` bundles the public reads into one round trip.
 *
 * `shelves` is the editorial answer: hero, trending and new arrivals come from
 * the `home-hero`, `trending` and `new-arrivals` collections in the CMS, in the
 * order an editor put them in, and the endpoint already falls back to the
 * newest published books when a shelf has no membership yet. `books` remains
 * that newest-first list, and is what an older deployment sends on its own.
 */
export type HomeFeedShelves = {
  hero: BookListItem[];
  trending: BookListItem[];
  newArrivals: BookListItem[];
};

export type HomeFeedPayload = {
  collections: CollectionRow[];
  books: BookListItem[];
  categories: CategoryRow[];
  /** `app_settings.featured_collection_id` — the collection to lead with. */
  featuredCollectionId?: string | null;
  /** Absent on a deployment that predates the curated shelves. */
  shelves?: HomeFeedShelves | null;
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
  /** The subscription alone. An admin has none and is still `false` here. */
  isActive: boolean;
  /** `profiles.role` or the `app_role` JWT claim. */
  isAdmin?: boolean;
  /**
   * `isActive || isAdmin` — the flag premium UI gates on.
   *
   * `get-signed-pdf` serves an admin any PDF with no subscription, so gating
   * the unlock button on `isActive` would lock an admin out of a file the
   * backend would hand over. Optional because an older deployment omits it.
   */
  canAccessPremium?: boolean;
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
  /**
   * `profile-read` embeds the reading streak, so the profile screen does not
   * need its own read of `reading_streaks`. Absent from `profile-update`'s
   * response and from the table fallback.
   */
  streak?: ReadingStreak | null;
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

/**
 * The card `library-overview`, `wishlist-list` and `downloads-list` embed under
 * `book`.
 *
 * Leaner than `BookListItem` on purpose — these endpoints select a fixed set of
 * card columns rather than the whole list view. `author` is a recent addition;
 * a deployment that predates it omits the key entirely, which is what
 * `hasAuthor` in `services/account.ts` tests for.
 */
export type LibraryBookCard = {
  id: string;
  slug: string | null;
  title: string;
  cover_path: string | null;
  cover_color: string | null;
  cover_color_dark: string | null;
  genre: string | null;
  is_premium: boolean;
  read_time_minutes: number | null;
  author?: { name: string | null } | { name: string | null }[] | null;
};

/** `wishlist-list` rows. */
export type WishlistItemRow = {
  book_id: string;
  created_at: string;
  book: LibraryBookCard | null;
};

/** `downloads-list` rows — `DownloadRow` plus the embedded card. */
export type DownloadListRow = DownloadRow & { book: LibraryBookCard | null };

/** A `reading_progress` row with the book card `library-overview` embeds. */
export type ProgressItemRow = {
  book_id: string;
  current_page: number | null;
  total_pages: number | null;
  progress: number | string | null;
  chapter_label: string | null;
  last_read_at: string | null;
  book: LibraryBookCard | null;
};

/** A highlight with the book card, as `library-overview` returns it. */
export type HighlightItemRow = HighlightRow & {
  updated_at?: string | null;
  book?: LibraryBookCard | null;
};

/** Each shelf is capped at `limit`; page the dedicated endpoint for the rest. */
export type LibraryShelfPage<T> = {
  items: T[];
  totalCount: number;
  hasMore: boolean;
};

/**
 * `library-overview` — five shelves in one round trip.
 *
 * `finished` is split from `readingProgress` server-side at `progress >= 0.99`,
 * the same threshold `admin_user_directory` counts a book as finished at.
 */
export type LibraryOverviewPayload = {
  limit: number;
  wishlist: LibraryShelfPage<WishlistItemRow>;
  readingProgress: LibraryShelfPage<ProgressItemRow>;
  finished: LibraryShelfPage<ProgressItemRow>;
  downloads: LibraryShelfPage<DownloadListRow>;
  highlights: LibraryShelfPage<HighlightItemRow>;
};

/** `public.reading_streaks`, as `profile-read` embeds it. */
export type ReadingStreak = {
  current_streak: number;
  longest_streak: number;
  last_read_date: string | null;
  updated_at?: string | null;
};

/** `highlights-delete` confirms the row it removed. */
export type HighlightDeleteResult = {
  id: string;
  deleted: boolean;
};
