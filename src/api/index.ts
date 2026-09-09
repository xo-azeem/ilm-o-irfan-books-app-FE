import { invokeEdge, invokeEdgeRaw } from './edge';
import type {
  BookCard,
  BookDetail,
  CategoryRow,
  EntitlementsStatus,
  HomeFeed,
  LibraryOverview,
  Paginated,
  PlanRow,
  Profile,
  SignedPdf,
} from './types';

export const api = {
  homeFeed: () => invokeEdge<HomeFeed>('home-feed'),

  booksList: (query: Record<string, string | number | undefined> = {}) =>
    invokeEdgeRaw<Paginated<BookCard>>('books-list', { query }),

  booksSearch: (q: string, page = 1, pageSize = 20) =>
    invokeEdgeRaw<Paginated<BookCard>>('books-search', {
      query: { q, page, pageSize },
    }),

  bookDetail: (id: string) =>
    invokeEdge<BookDetail>('book-detail', { query: { id } }),

  categoriesList: () => invokeEdge<CategoryRow[]>('categories-list'),

  collectionBooks: (slugOrId: { slug?: string; id?: string }, page = 1) =>
    invokeEdgeRaw<Paginated<BookCard> & { collection?: unknown }>(
      'collection-books',
      {
        query: {
          slug: slugOrId.slug,
          id: slugOrId.id,
          page,
          pageSize: 20,
        },
      },
    ),

  plansList: () => invokeEdge<PlanRow[]>('plans-list'),

  entitlementsStatus: () => invokeEdge<EntitlementsStatus>('entitlements-status'),

  libraryOverview: () => invokeEdge<LibraryOverview>('library-overview'),

  profileRead: () => invokeEdge<Profile>('profile-read'),

  profileUpdate: (body: Record<string, unknown>) =>
    invokeEdge<Profile>('profile-update', { method: 'PUT', body }),

  getSignedPdf: (bookId: string) =>
    invokeEdge<SignedPdf>('get-signed-pdf', {
      method: 'POST',
      body: { bookId },
    }),

  readingProgressGet: (bookId?: string) =>
    invokeEdge<unknown>('reading-progress', {
      method: 'GET',
      query: bookId ? { book_id: bookId } : undefined,
    }),

  readingProgressPost: (body: Record<string, unknown>) =>
    invokeEdge<unknown>('reading-progress', { method: 'POST', body }),

  wishlistList: () => invokeEdge<unknown>('wishlist-list'),

  wishlistToggle: (bookId: string) =>
    invokeEdge<{ wishlisted: boolean }>('wishlist-toggle', {
      method: 'POST',
      body: { book_id: bookId },
    }),

  downloadsList: () => invokeEdge<unknown>('downloads-list'),

  downloadsCreate: (bookId: string, fileSizeBytes?: number) =>
    invokeEdge<unknown>('downloads-create', {
      method: 'POST',
      body: { book_id: bookId, file_size_bytes: fileSizeBytes },
    }),
};
