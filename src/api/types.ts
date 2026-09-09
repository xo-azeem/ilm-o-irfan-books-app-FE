/** Shapes aligned with BE docs/mobile-contract.md (snake_case from API). */

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export type BookCard = {
  id: string;
  slug: string;
  title: string;
  author_name: string | null;
  author_id?: string | null;
  cover_path: string | null;
  coverUrl: string | null;
  cover_color: string | null;
  cover_color_dark: string | null;
  rating: number | null;
  tag: string | null;
  genre: string | null;
  read_time_minutes: number | null;
  page_count?: number | null;
  length_bucket?: string | null;
  language?: string | null;
  price_cents?: number;
  currency?: string;
  format?: string | null;
  is_premium: boolean;
  published_at?: string | null;
  description?: string | null;
};

export type BookDetail = BookCard & {
  description: string | null;
  rating_count: number | null;
  tags: string[] | null;
  is_published: boolean;
  author: { id: string; name: string; slug?: string } | null;
};

export type CategoryRow = {
  id: string;
  slug: string;
  label: string;
  book_count?: number;
  icon_key?: string | null;
  accent?: string | null;
  accent_dark?: string | null;
};

export type CollectionRow = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  kind: string;
  book_count?: number;
  sort_order?: number;
  accent?: string | null;
};

export type HomeFeed = {
  collections: CollectionRow[];
  books?: BookCard[];
  categories?: CategoryRow[];
  featuredCollectionId: string | null;
  supportEmail: string | null;
  shelves: {
    hero: BookCard[];
    trending: BookCard[];
    newArrivals: BookCard[];
  };
};

export type Paginated<T> = {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type EntitlementsStatus = {
  isActive: boolean;
  isAdmin: boolean;
  canAccessPremium: boolean;
  entitlement: Record<string, unknown> | null;
  status: string;
  startsAt: string | null;
  expiresAt: string | null;
  secondsRemaining: number | null;
  reason: string;
  serverTime: string;
  realtime?: {
    channel: string;
    event: string;
    private: boolean;
  };
};

export type PlanRow = {
  id: string;
  code: string;
  name: string;
  price_cents: number;
  currency: string;
  interval?: string | null;
  is_active?: boolean;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  address_line1: string | null;
  date_of_birth: string | null;
  avatar_path: string | null;
  avatarUrl?: string | null;
  role?: string;
  created_at?: string;
};

export type LibraryOverview = {
  inProgress?: Array<{
    book_id: string;
    progress: number;
    current_page?: number | null;
    total_pages?: number | null;
    chapter_label?: string | null;
    last_read_at?: string | null;
    book?: Partial<BookCard> & {
      author?: { name: string } | null;
    };
  }>;
  finished?: Array<{
    book_id: string;
    progress: number;
    book?: Partial<BookCard> & {
      author?: { name: string } | null;
    };
  }>;
  wishlist?: unknown[];
  downloads?: unknown[];
  highlightsSummary?: unknown;
  [key: string]: unknown;
};

export type SignedPdf = {
  bookId: string;
  title?: string;
  signedUrl: string;
  expiresIn: number;
  fileSizeBytes?: number | null;
};
