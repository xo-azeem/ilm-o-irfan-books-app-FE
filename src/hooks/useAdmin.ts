import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  bulkUpdateBooks,
  createAdminBook,
  createUploadBatch,
  deleteUploadBatch,
  deleteAdminAuthor,
  deleteAdminBooks,
  deleteAdminCategory,
  deleteAdminCollection,
  deleteAdminPlan,
  deleteStorageObject,
  duplicateAdminBook,
  getAdminAnalytics,
  getAdminBook,
  getAdminDashboardStats,
  getAdminSettings,
  getAdminUserDetail,
  getCategoryBookIds,
  getCollectionBookIds,
  getStorageAudit,
  getUploadBatch,
  listAdminAuthors,
  listAdminBooks,
  listAdminCategories,
  listAdminCollections,
  listAdminPlans,
  listAdminUsers,
  listAuditLog,
  listBatchBooks,
  listBookOptions,
  listUploadBatches,
  publishUploadBatch,
  reorderCatalog,
  setCategoryBooks,
  setCollectionPublished,
  setAdminEntitlement,
  setAdminUserRole,
  updateAdminBook,
  updateAdminSettings,
  updateUploadBatch,
  upsertAdminAuthor,
  upsertAdminCategory,
  upsertAdminCollection,
  upsertAdminPlan,
  type AdminBookFilters,
  type AdminBookInput,
  type AdminUserFilters,
  type UploadBatchInput,
} from '@/services/admin';

const STALE = 60_000;

/**
 * Anything that changes catalog data can move a dashboard number — and the
 * reader's Home, Explore and collection pages, which cache under `catalog`
 * for minutes. Dropping both means a collection saved here is on Home the
 * next time it is looked at, not after the stale window runs out.
 */
function invalidateAdmin(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: ['admin'] }),
    client.invalidateQueries({ queryKey: ['catalog'] }),
  ]);
}

/**
 * A search term as it sits in a query key: trimmed and lower-cased, so
 * "Ali", "ali" and "ali " read the same cached page rather than three.
 * The server's match is case-insensitive already, so nothing is lost.
 */
function termKey(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * A searchable list's filters with the term normalised — the object the key
 * is built from and the one the fetch runs with, so they cannot disagree.
 */
function withTermKey<T extends { query: string }>(filters: T): T {
  return { ...filters, query: termKey(filters.query) };
}

// ------------------------------------------------------------------ overview

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: getAdminDashboardStats,
    staleTime: STALE,
  });
}

export function useAdminAnalytics(days: number) {
  return useQuery({
    queryKey: ['admin', 'analytics', days],
    queryFn: () => getAdminAnalytics(days),
    staleTime: 5 * STALE,
  });
}

// --------------------------------------------------------------------- books

/**
 * The Library's book list, paged from the server with every filter applied
 * before the page is cut.
 *
 * A changed term or filter starts a fresh pagination, but the previous pages
 * stand in as placeholder data until page one of the new one lands — so the
 * list narrows in place rather than dropping to a skeleton on every search.
 * Callers read `isPlaceholderData` to show that a fetch is under way, and
 * must not page placeholder data: its `nextPage` belongs to the old query.
 */
export function useAdminBooks(filters: AdminBookFilters) {
  const keyed = useMemo(() => withTermKey(filters), [filters]);
  return useInfiniteQuery({
    queryKey: ['admin', 'books', keyed],
    queryFn: ({ pageParam }) => listAdminBooks(keyed, pageParam),
    initialPageParam: 0,
    getNextPageParam: last => last.nextPage,
    placeholderData: keepPreviousData,
    staleTime: STALE,
  });
}

export function useAdminBook(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'book', id],
    queryFn: () => getAdminBook(id as string),
    enabled: Boolean(id),
  });
}

export function useBookOptions(query: string) {
  const term = termKey(query);
  return useQuery({
    queryKey: ['admin', 'book-options', term],
    queryFn: () => listBookOptions(term),
    placeholderData: keepPreviousData,
    staleTime: STALE,
  });
}

export function useSaveAdminBook() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: AdminBookInput }) =>
      id ? updateAdminBook(id, input) : createAdminBook(input),
    onSuccess: () => invalidateAdmin(client),
  });
}

export function useDuplicateAdminBook() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: duplicateAdminBook,
    onSuccess: () => invalidateAdmin(client),
  });
}

export function useDeleteAdminBooks() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteAdminBooks,
    onSuccess: () => invalidateAdmin(client),
  });
}

export function useBulkUpdateBooks() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      ids,
      changes,
    }: {
      ids: string[];
      changes: { is_published?: boolean; is_premium?: boolean };
    }) => bulkUpdateBooks(ids, changes),
    onSuccess: () => invalidateAdmin(client),
  });
}

// ------------------------------------------------------------------- catalog

export function useAdminAuthors(query = '') {
  const term = termKey(query);
  return useQuery({
    queryKey: ['admin', 'authors', term],
    queryFn: () => listAdminAuthors(term),
    placeholderData: keepPreviousData,
    staleTime: STALE,
  });
}

export function useSaveAdminAuthor() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: upsertAdminAuthor,
    onSuccess: () => invalidateAdmin(client),
  });
}

export function useDeleteAdminAuthor() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteAdminAuthor,
    onSuccess: () => invalidateAdmin(client),
  });
}

export function useAdminCategories() {
  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: listAdminCategories,
    staleTime: STALE,
  });
}

export function useSaveAdminCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: upsertAdminCategory,
    onSuccess: () => invalidateAdmin(client),
  });
}

export function useDeleteAdminCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteAdminCategory,
    onSuccess: () => invalidateAdmin(client),
  });
}

export function useCategoryBookIds(categoryId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'category-books', categoryId],
    queryFn: () => getCategoryBookIds(categoryId as string),
    enabled: Boolean(categoryId),
  });
}

/** Rewrites which books carry a category, from the category's book page. */
export function useSetCategoryBooks() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      categoryId,
      bookIds,
    }: {
      categoryId: string;
      bookIds: string[];
    }) => setCategoryBooks(categoryId, bookIds),
    onSuccess: () => invalidateAdmin(client),
  });
}

export function useAdminCollections() {
  return useQuery({
    queryKey: ['admin', 'collections'],
    queryFn: listAdminCollections,
    staleTime: STALE,
  });
}

export function useCollectionBookIds(collectionId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'collection-books', collectionId],
    queryFn: () => getCollectionBookIds(collectionId as string),
    enabled: Boolean(collectionId),
  });
}

export function useSaveAdminCollection() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: upsertAdminCollection,
    onSuccess: () => invalidateAdmin(client),
  });
}

export function useDeleteAdminCollection() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteAdminCollection,
    onSuccess: () => invalidateAdmin(client),
  });
}

/** Flips one collection's visibility from the Catalog tab's order list. */
export function useUpdateAdminCollection() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: string;
      changes: { is_published: boolean };
    }) => setCollectionPublished(id, changes.is_published),
    onSuccess: () => invalidateAdmin(client),
  });
}

/** Persists the Home row order after a move on the Catalog tab. */
export function useReorderCollections() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => reorderCatalog('collections', ids),
    onSuccess: () => invalidateAdmin(client),
  });
}

export function useReorderCatalog() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      table,
      ids,
    }: {
      table: 'categories' | 'collections';
      ids: string[];
    }) => reorderCatalog(table, ids),
    onSuccess: () => invalidateAdmin(client),
  });
}

// ------------------------------------------------------------- bulk uploads

export function useUploadBatches() {
  return useQuery({
    queryKey: ['admin', 'upload-batches'],
    queryFn: listUploadBatches,
    staleTime: STALE,
  });
}

export function useUploadBatch(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'upload-batch', id],
    queryFn: () => getUploadBatch(id as string),
    enabled: Boolean(id),
    staleTime: STALE,
  });
}

/**
 * The batch's books, polled while any of them is still without a file: an
 * upload attaches the PDF from the batch screen, but a draft opened in the
 * editor can have one attached there too, and the batch should notice.
 */
export function useBatchBooks(batchId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'upload-batch-books', batchId],
    queryFn: () => listBatchBooks(batchId as string),
    enabled: Boolean(batchId),
    staleTime: 15_000,
  });
}

export function useCreateUploadBatch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadBatchInput) => createUploadBatch(input),
    onSuccess: () => invalidateAdmin(client),
  });
}

export function useUpdateUploadBatch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<UploadBatchInput>;
    }) => updateUploadBatch(id, patch),
    onSuccess: () => invalidateAdmin(client),
  });
}

export function useDeleteUploadBatch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteUploadBatch,
    onSuccess: () => invalidateAdmin(client),
  });
}

export function usePublishUploadBatch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: publishUploadBatch,
    onSuccess: () => invalidateAdmin(client),
  });
}

// -------------------------------------------------------------------- people

/**
 * The People directory, paged from the server — the search and every
 * audience filter are the database's, so the count on page one is the true
 * number of matches. Same placeholder contract as `useAdminBooks`.
 */
export function useAdminUsers(filters: AdminUserFilters) {
  const keyed = useMemo(() => withTermKey(filters), [filters]);
  return useInfiniteQuery({
    queryKey: ['admin', 'users', keyed],
    queryFn: ({ pageParam }) => listAdminUsers(keyed, pageParam),
    initialPageParam: 0,
    getNextPageParam: last => last.nextPage,
    placeholderData: keepPreviousData,
    staleTime: STALE,
  });
}

export function useAdminUserDetail(userId: string) {
  return useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: () => getAdminUserDetail(userId),
    enabled: Boolean(userId),
  });
}

export function useSetUserRole() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: 'user' | 'admin';
    }) => setAdminUserRole(userId, role),
    onSuccess: () => invalidateAdmin(client),
  });
}

export function useSetEntitlement() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: setAdminEntitlement,
    onSuccess: () => invalidateAdmin(client),
  });
}

// --------------------------------------------------------------------- plans

export function useAdminPlans() {
  return useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: listAdminPlans,
    staleTime: STALE,
  });
}

export function useSaveAdminPlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: upsertAdminPlan,
    onSuccess: () => invalidateAdmin(client),
  });
}

export function useDeleteAdminPlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteAdminPlan,
    onSuccess: () => invalidateAdmin(client),
  });
}

// -------------------------------------------------------------------- system

export function useAdminSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: getAdminSettings,
    staleTime: 30_000,
  });
}

export function useUpdateAdminSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updateAdminSettings,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'settings'] });
      void client.invalidateQueries({ queryKey: ['pdf-access-policy'] });
    },
  });
}

export function useAuditLog(entityType: string | null) {
  return useInfiniteQuery({
    queryKey: ['admin', 'audit', entityType],
    queryFn: ({ pageParam }) => listAuditLog(entityType, pageParam),
    initialPageParam: 0,
    getNextPageParam: last => last.nextPage,
    staleTime: 15_000,
  });
}

export function useStorageAudit() {
  return useQuery({
    queryKey: ['admin', 'storage'],
    queryFn: getStorageAudit,
    staleTime: 2 * STALE,
  });
}

export function useDeleteStorageObject() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      bucket,
      name,
    }: {
      bucket: 'covers' | 'pdfs';
      name: string;
    }) => deleteStorageObject(bucket, name),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ['admin', 'storage'] }),
  });
}
