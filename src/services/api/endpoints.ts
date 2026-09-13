/**
 * Endpoint names, mirroring the backend's
 * `supabase/functions/_shared/endpoint-manifest.ts`.
 *
 * Keeping them here means a backend rename is a one-line change on this side
 * instead of a grep across the services.
 */
export const ENDPOINTS = {
  // Public catalog — backend `verify_jwt = false`.
  homeFeed: 'home-feed',
  booksList: 'books-list',
  bookDetail: 'book-detail',
  booksSearch: 'books-search',
  categoriesList: 'categories-list',
  collectionsList: 'collections-list',
  /** One collection's books, in the admin's `sort_order`. Takes `id` or `slug`. */
  collectionBooks: 'collection-books',
  plansList: 'plans-list',
  /** The admin-managed home carousel. Also embedded in `home-feed`. */
  carouselList: 'carousel-list',
  /** The weekly draw. Also embedded in `home-feed` as `shelves.trending`. */
  trendingWeekly: 'trending-weekly',

  // Authenticated — backend `verify_jwt = true`.
  profileRead: 'profile-read',
  profileUpdate: 'profile-update',
  /** Issues a one-off upload ticket for the reader's own avatar folder. */
  avatarUploadUrl: 'avatar-upload-url',
  readingProgress: 'reading-progress',
  /** Sets `profiles.monthly_goal`; answers with the month's goal recounted. */
  readingGoalUpdate: 'reading-goal-update',
  /** "Because you read …" — derived from the reader's own history. */
  recommendations: 'recommendations',
  wishlistList: 'wishlist-list',
  wishlistToggle: 'wishlist-toggle',
  downloadsList: 'downloads-list',
  downloadsCreate: 'downloads-create',
  highlightsList: 'highlights-list',
  highlightsUpsert: 'highlights-upsert',
  /** Adds the bookmark on `(book_id, page_number)` if absent, removes it if present. */
  highlightsToggle: 'highlights-toggle',
  highlightsDelete: 'highlights-delete',
  libraryOverview: 'library-overview',
  entitlementsStatus: 'entitlements-status',
  signedPdf: 'get-signed-pdf',

  // Admin — backend checks `profiles.role = 'admin'` or the `app_role` claim.
  adminBooks: 'admin-books',
  adminBookUpdate: 'admin-book-update',
  adminCategories: 'admin-categories',
  adminCollections: 'admin-collections',
  adminUsers: 'admin-users',
  adminAnalytics: 'admin-analytics',
  adminSettings: 'admin-settings',
} as const;

export type EndpointName = (typeof ENDPOINTS)[keyof typeof ENDPOINTS];
