import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createAdminBook,
  deleteAdminAuthor,
  deleteAdminBook,
  deleteAdminCategory,
  deleteAdminCollection,
  getAdminBook,
  getAdminDashboardStats,
  getAdminUser,
  listAdminAuthors,
  listAdminBooks,
  listAdminCategories,
  listAdminCollections,
  listAdminUsers,
  setAdminUserRole,
  updateAdminBook,
  upsertAdminAuthor,
  upsertAdminCategory,
  upsertAdminCollection,
  type AdminBookInput,
} from '@/services/admin';

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: getAdminDashboardStats,
    staleTime: 60_000,
  });
}

export function useAdminUsers(query: string) {
  return useQuery({
    queryKey: ['admin', 'users', query.trim().toLowerCase()],
    queryFn: () => listAdminUsers(query),
    staleTime: 60_000,
  });
}

export function useAdminUser(userId: string) {
  return useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: () => getAdminUser(userId),
    enabled: Boolean(userId),
  });
}

export function useSetUserRole() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'user' | 'admin' }) =>
      setAdminUserRole(userId, role),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useAdminBooks(query: string) {
  return useQuery({
    queryKey: ['admin', 'books', query.trim().toLowerCase()],
    queryFn: () => listAdminBooks(query),
    staleTime: 60_000,
  });
}

export function useAdminBook(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'book', id],
    queryFn: () => getAdminBook(id as string),
    enabled: Boolean(id),
  });
}

export function useSaveAdminBook() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: AdminBookInput }) => {
      if (id) {
        await updateAdminBook(id, input);
        return id;
      }
      return createAdminBook(input);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useDeleteAdminBook() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteAdminBook,
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useAdminAuthors() {
  return useQuery({
    queryKey: ['admin', 'authors'],
    queryFn: listAdminAuthors,
    staleTime: 60_000,
  });
}

export function useSaveAdminAuthor() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: upsertAdminAuthor,
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useDeleteAdminAuthor() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteAdminAuthor,
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useAdminCategories() {
  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: listAdminCategories,
    staleTime: 60_000,
  });
}

export function useSaveAdminCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: upsertAdminCategory,
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useDeleteAdminCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteAdminCategory,
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useAdminCollections() {
  return useQuery({
    queryKey: ['admin', 'collections'],
    queryFn: listAdminCollections,
    staleTime: 60_000,
  });
}

export function useSaveAdminCollection() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: upsertAdminCollection,
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useDeleteAdminCollection() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteAdminCollection,
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  });
}
