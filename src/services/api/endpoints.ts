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
  plansList: 'plans-list',

  // Authenticated — backend `verify_jwt = true`.
  profileRead: 'profile-read',
  profileUpdate: 'profile-update',
  readingProgress: 'reading-progress',
  wishlistList: 'wishlist-list',
  wishlistToggle: 'wishlist-toggle',
  downloadsList: 'downloads-list',
  downloadsCreate: 'downloads-create',
  highlightsList: 'highlights-list',
  highlightsUpsert: 'highlights-upsert',
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
