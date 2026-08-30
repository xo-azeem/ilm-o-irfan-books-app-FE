import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import {
  bulkUpdateBooks,
  createAdminBook,
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
  getCollectionBookIds,
  getStorageAudit,
  listAdminAuthors,
  listAdminBooks,
  listAdminCategories,
  listAdminCollections,
  listAdminPlans,
  listAdminUsers,
  listAuditLog,
  listBookOptions,
  reorderCatalog,
  setCollectionPublished,
  setAdminEntitlement,
  setAdminUserRole,
  updateAdminBook,
  updateAdminSettings,
  upsertAdminAuthor,
  upsertAdminCategory,
  upsertAdminCollection,
  upsertAdminPlan,
  type AdminBookFilters,
  type AdminBookInput,
  type AdminUserFilters,
} from '@/services/admin';

const STALE = 60_000;

/** Anything that changes catalog data can move a dashboard number. */
function invalidateAdmin(client: QueryClient) {
  return client.invalidateQueries({ queryKey: ['admin'] });
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

export function useAdminBooks(filters: AdminBookFilters) {
  return useInfiniteQuery({
    queryKey: ['admin', 'books', filters],
    queryFn: ({ pageParam }) => listAdminBooks(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: last => last.nextPage,
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
  return useQuery({
    queryKey: ['admin', 'book-options', query.trim().toLowerCase()],
    queryFn: () => listBookOptions(query),
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
  return useQuery({
    queryKey: ['admin', 'authors', query.trim().toLowerCase()],
    queryFn: () => listAdminAuthors(query),
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
    mutationFn: ({ id, changes }: { id: string; changes: { is_published: boolean } }) =>
      setCollectionPublished(id, changes.is_published),
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
    mutationFn: ({ table, ids }: { table: 'categories' | 'collections'; ids: string[] }) =>
      reorderCatalog(table, ids),
    onSuccess: () => invalidateAdmin(client),
  });
}

// -------------------------------------------------------------------- people

export function useAdminUsers(filters: AdminUserFilters) {
  return useInfiniteQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: ({ pageParam }) => listAdminUsers(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: last => last.nextPage,
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
    mutationFn: ({ userId, role }: { userId: string; role: 'user' | 'admin' }) =>
      setAdminUserRole(userId, role),
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
    mutationFn: ({ bucket, name }: { bucket: 'covers' | 'pdfs'; name: string }) =>
      deleteStorageObject(bucket, name),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'storage'] }),
  });
}
