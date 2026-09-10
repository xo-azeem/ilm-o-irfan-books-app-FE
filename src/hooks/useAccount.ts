import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addHighlight,
  deleteHighlight,
  getHighlights,
  getLibrary,
  getProfile,
  getSubscription,
  getWishlist,
  isInWishlist,
  removeDownload,
  saveReadingProgress,
  syncDownload,
  toggleWishlist,
  updateProfile,
  type ProfileForm,
} from '@/services/account';
import { getAvatarUrl, uploadAvatar } from '@/services/avatar';
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

/**
 * A signed URL for the reader's profile photo.
 *
 * The `avatars` bucket is private, so the URL is signed and therefore expires:
 * it is re-read well inside its hour rather than cached indefinitely and left
 * to 403 on a screen that has been open a while. Keyed off the path, so a newly
 * uploaded photo fetches its own URL instead of reusing the old one's.
 */
export function useAvatarUrl(avatarPath: string | null | undefined) {
  return useQuery({
    queryKey: ['avatar', avatarPath ?? null],
    queryFn: () => getAvatarUrl(avatarPath),
    enabled: Boolean(avatarPath),
    staleTime: 30 * 60_000,
  });
}

/**
 * Uploads a picked photo, then re-reads the profile.
 *
 * The path is recorded by the upload itself — `profile-update` is the last of
 * its three steps — so there is nothing for the form's Save to do, and
 * invalidating the profile is what brings the new path back down.
 */
export function useAvatarUpload() {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);
  return useMutation({
    mutationFn: ({ uri, mime }: { uri: string; mime?: string }) => uploadAvatar(uri, mime),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: scoped('profile', userId) });
      void client.invalidateQueries({ queryKey: ['avatar'] });
    },
  });
}

export function useLibrary() {
  const userId = useAuthStore(state => state.userId);
  return useQuery({
    queryKey: scoped('library', userId),
    queryFn: () => getLibrary(),
    enabled: Boolean(userId),
  });
}

/**
 * The saved shelf as its own list.
 *
 * `library-overview` already returns it inside the library summary, so callers
 * that have the summary in hand pass `enabled: false` rather than paying for
 * the same rows twice.
 */
export function useWishlist(options: { enabled?: boolean } = {}) {
  const userId = useAuthStore(state => state.userId);
  return useQuery({
    queryKey: scoped('wishlist', userId),
    queryFn: () => getWishlist(),
    enabled: Boolean(userId) && (options.enabled ?? true),
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
    mutationFn: (profile: ProfileForm) => updateProfile(profile),
    onSuccess: () => client.invalidateQueries({ queryKey: scoped('profile', userId) }),
  });
}

export function useWishlistMutation(bookId: string) {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);
  return useMutation({
    // `wishlist-toggle` decides the direction from the row the server finds, so
    // the caller's `saved` flag is no longer what performs the write — it is
    // kept in the signature because the button still reads it for its label.
    mutationFn: (_saved: boolean) => toggleWishlist(bookId),
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

export function useDeleteHighlight(bookId: string) {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);
  return useMutation({
    mutationFn: (highlightId: string) => deleteHighlight(highlightId),
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
