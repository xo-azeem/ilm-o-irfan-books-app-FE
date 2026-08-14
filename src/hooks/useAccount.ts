import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addHighlight,
  addToWishlist,
  getHighlights,
  getLibrary,
  getProfile,
  getSubscription,
  getWishlist,
  isInWishlist,
  removeDownload,
  removeFromWishlist,
  saveReadingProgress,
  syncDownload,
  updateProfile,
  type ProfileDetails,
} from '@/services/account';
import { useAuthStore } from '@/stores/authStore';

function scoped(name: string, userId: string | null, extra?: string) {
  return extra ? [name, userId, extra] : [name, userId];
}

export function useProfile() {
  const userId = useAuthStore(state => state.userId);
  return useQuery({
    queryKey: scoped('profile', userId),
    queryFn: getProfile,
    enabled: Boolean(userId),
  });
}

export function useLibrary() {
  const userId = useAuthStore(state => state.userId);
  return useQuery({
    queryKey: scoped('library', userId),
    queryFn: getLibrary,
    enabled: Boolean(userId),
  });
}

export function useWishlist() {
  const userId = useAuthStore(state => state.userId);
  return useQuery({
    queryKey: scoped('wishlist', userId),
    queryFn: getWishlist,
    enabled: Boolean(userId),
  });
}

export function useWishlistStatus(bookId: string) {
  const userId = useAuthStore(state => state.userId);
  return useQuery({
    queryKey: scoped('wishlist-item', userId, bookId),
    queryFn: () => isInWishlist(bookId),
    enabled: Boolean(userId && bookId),
  });
}

export function useSubscription() {
  const userId = useAuthStore(state => state.userId);
  return useQuery({
    queryKey: scoped('subscription', userId),
    queryFn: getSubscription,
    enabled: Boolean(userId),
  });
}

export function useHighlights(bookId: string) {
  const userId = useAuthStore(state => state.userId);
  return useQuery({
    queryKey: scoped('highlights', userId, bookId),
    queryFn: () => getHighlights(bookId),
    enabled: Boolean(userId && bookId),
  });
}

export function useUpdateProfile() {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);
  return useMutation({
    mutationFn: (profile: Omit<ProfileDetails, 'memberSince'>) => updateProfile(profile),
    onSuccess: () => client.invalidateQueries({ queryKey: scoped('profile', userId) }),
  });
}

export function useWishlistMutation(bookId: string) {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);
  return useMutation({
    mutationFn: async (saved: boolean) => {
      if (saved) {
        await removeFromWishlist(bookId);
        return false;
      }
      await addToWishlist(bookId);
      return true;
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: scoped('wishlist', userId) });
      void client.invalidateQueries({ queryKey: scoped('wishlist-item', userId, bookId) });
      void client.invalidateQueries({ queryKey: scoped('library', userId) });
    },
  });
}

export function useProgressMutation() {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);
  return useMutation({
    mutationFn: ({
      bookId,
      page,
      totalPages,
    }: {
      bookId: string;
      page: number;
      totalPages: number;
    }) => saveReadingProgress(bookId, page, totalPages),
    onSuccess: () => client.invalidateQueries({ queryKey: scoped('library', userId) }),
  });
}

export function useHighlightMutation(bookId: string) {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);
  return useMutation({
    mutationFn: (page: number) => addHighlight(bookId, page),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: scoped('highlights', userId, bookId) });
      void client.invalidateQueries({ queryKey: scoped('library', userId) });
    },
  });
}

export function useDownloadMutation() {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);
  return useMutation({
    mutationFn: (params: {
      bookId: string;
      status: 'pending' | 'completed' | 'failed';
      sizeBytes?: number;
    }) => syncDownload(params.bookId, params.status, params.sizeBytes),
    onSuccess: () => client.invalidateQueries({ queryKey: scoped('library', userId) }),
  });
}

export function useRemoveDownload() {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);
  return useMutation({
    mutationFn: removeDownload,
    onSuccess: () => client.invalidateQueries({ queryKey: scoped('library', userId) }),
  });
}
