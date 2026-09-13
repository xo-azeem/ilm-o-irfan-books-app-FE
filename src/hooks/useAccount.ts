import { useCallback, useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getHighlights,
  getLibrary,
  getProfile,
  getSubscription,
  getWishlist,
  isInWishlist,
  progressCaption,
  removeDownload,
  syncDownload,
  toggleHighlight,
  toggleWishlist,
  updateProfile,
  updateReadingGoal,
  type LibraryProgressBook,
  type LibrarySummary,
  type ProfileDetails,
  type ProfileForm,
} from '@/services/account';
import type { HighlightRow } from '@/services/api/types';
import { getAvatarUrl, uploadAvatar } from '@/services/avatar';
import { readBookmarks, writeBookmarks } from '@/services/bookmarkCache';
import { removeBook, unkeepBook } from '@/services/bookVault';
import {
  getPosition,
  positionsVersion,
  subscribeToPositions,
} from '@/services/readingPosition';
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
    mutationFn: ({ uri, mime }: { uri: string; mime?: string }) =>
      uploadAvatar(uri, mime),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: scoped('profile', userId) });
      void client.invalidateQueries({ queryKey: ['avatar'] });
    },
  });
}

/**
 * Lays the device's own positions over the server's shelves.
 *
 * A page turned a moment ago is on disk before it is on the server — and while
 * offline it is *only* on disk — so a "Continue reading" card built from the
 * server row alone would say the wrong page. Any cached position newer than
 * the row's replaces its page and caption; the row's `progress` moves with it
 * so the bar agrees with the caption.
 */
function overlayPositions(
  userId: string | null,
  books: LibraryProgressBook[],
): LibraryProgressBook[] {
  if (!userId) {
    return books;
  }
  return books.map(book => {
    const local = getPosition(userId, book.id);
    const serverAt = book.lastReadAt ? Date.parse(book.lastReadAt) : 0;
    if (!local || Date.parse(local.updatedAt) <= serverAt) {
      return book;
    }
    const totalPages = local.totalPages || book.totalPages;
    return {
      ...book,
      currentPage: local.page,
      totalPages,
      lastReadAt: local.updatedAt,
      progress:
        totalPages > 0 ? Math.min(1, local.page / totalPages) : book.progress,
      chapter: progressCaption(null, local.page, totalPages),
    };
  });
}

export function useLibrary() {
  const userId = useAuthStore(state => state.userId);
  // Re-runs `select` whenever a position is written, so the shelf follows the
  // reader out of a book without waiting for the server's copy to come back.
  const version = useSyncExternalStore(subscribeToPositions, positionsVersion);
  const select = useCallback(
    (data: LibrarySummary): LibrarySummary => ({
      ...data,
      reading: overlayPositions(userId, data.reading),
    }),
    // `version` is the dependency that matters even though the body never reads it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, version],
  );
  return useQuery({
    queryKey: scoped('library', userId),
    queryFn: () => getLibrary(),
    enabled: Boolean(userId),
    select,
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

/**
 * The bookmarks in one book.
 *
 * Starts from the on-disk mirror so the bookmark button is right on the first
 * frame, then refreshes from `highlights-list` behind it. `initialDataUpdatedAt`
 * is pinned to the epoch so the mirror never counts as fresh — it is a warm
 * start, not an answer.
 */
export function useHighlights(bookId: string) {
  const userId = useAuthStore(state => state.userId);
  return useQuery({
    queryKey: scoped('highlights', userId, bookId),
    queryFn: async () => {
      const rows = await getHighlights(bookId);
      if (userId) {
        writeBookmarks(userId, bookId, rows);
      }
      return rows;
    },
    initialData: () => (userId ? readBookmarks(userId, bookId) : undefined),
    initialDataUpdatedAt: 0,
    // The client default is `false`, which would take the mirror as the
    // answer and never ask the server. Stale on arrival means it asks once.
    refetchOnMount: true,
    enabled: Boolean(userId && bookId),
  });
}

/**
 * The reader's bookmark button, optimistic in both directions.
 *
 * The page flips to "saved" (or back) the moment it is tapped, from the
 * highlights the screen already holds; `highlights-toggle` then answers with
 * the real row, which replaces the placeholder, and a failure puts the list
 * back exactly as it was. The mirror on disk follows the query cache, so the
 * next open starts from whatever this settled on.
 */
export function useBookmarkToggle(bookId: string) {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);
  const queryKey = scoped('highlights', userId, bookId);

  return useMutation({
    mutationFn: (page: number) => toggleHighlight(bookId, page),
    onMutate: async (page: number) => {
      await client.cancelQueries({ queryKey });
      const previous = client.getQueryData<HighlightRow[]>(queryKey) ?? [];
      const existing = previous.some(row => row.page_number === page);
      const next = existing
        ? previous.filter(row => row.page_number !== page)
        : [
            ...previous,
            {
              id: `pending:${page}`,
              user_id: userId ?? '',
              book_id: bookId,
              page_number: page,
              text_excerpt: null,
              note: null,
              color: null,
              created_at: new Date().toISOString(),
            },
          ].sort((a, b) => (a.page_number ?? 0) - (b.page_number ?? 0));
      client.setQueryData<HighlightRow[]>(queryKey, next);
      return { previous };
    },
    onError: (_error, _page, context) => {
      if (context) {
        client.setQueryData<HighlightRow[]>(queryKey, context.previous);
      }
    },
    onSuccess: (result, page) => {
      client.setQueryData<HighlightRow[]>(queryKey, current => {
        const rest = (current ?? []).filter(row => row.page_number !== page);
        return result.bookmarked && result.highlight
          ? [...rest, result.highlight].sort(
              (a, b) => (a.page_number ?? 0) - (b.page_number ?? 0),
            )
          : rest;
      });
      void client.invalidateQueries({ queryKey: scoped('library', userId) });
    },
    onSettled: () => {
      if (userId) {
        writeBookmarks(
          userId,
          bookId,
          client.getQueryData<HighlightRow[]>(queryKey) ?? [],
        );
      }
    },
  });
}

export function useUpdateProfile() {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);
  return useMutation({
    mutationFn: (profile: ProfileForm) => updateProfile(profile),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: scoped('profile', userId) }),
  });
}

/**
 * Sets this month's goal, optimistic.
 *
 * The bar moves to the new target the moment the sheet closes; the server's
 * answer then replaces the target it holds, and the invalidation behind it
 * brings back the month's count recounted against it. A failure puts the old
 * target back.
 */
export function useUpdateReadingGoal() {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);
  const queryKey = scoped('profile', userId);

  const patchTarget = (target: number) =>
    client.setQueryData<ProfileDetails>(queryKey, current =>
      current
        ? {
            ...current,
            monthlyGoal: target,
            goal: current.goal ? { ...current.goal, target } : null,
          }
        : current,
    );

  return useMutation({
    mutationFn: (target: number) => updateReadingGoal(target),
    onMutate: async (target: number) => {
      await client.cancelQueries({ queryKey });
      const previous = client.getQueryData<ProfileDetails>(queryKey);
      patchTarget(target);
      return { previous };
    },
    onError: (_error, _target, context) => {
      if (context?.previous) {
        client.setQueryData<ProfileDetails>(queryKey, context.previous);
      }
    },
    onSuccess: goal => patchTarget(goal.target),
    onSettled: () => client.invalidateQueries({ queryKey }),
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
    onSuccess: saved => {
      // The endpoint answers with the resulting state, so the button learns
      // it in the same frame the spinner stops rather than after a refetch.
      client.setQueryData(scoped('wishlist-item', userId, bookId), saved);
      void client.invalidateQueries({ queryKey: scoped('wishlist', userId) });
      void client.invalidateQueries({
        queryKey: scoped('wishlist-item', userId, bookId),
      });
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
    onSuccess: () =>
      client.invalidateQueries({ queryKey: scoped('library', userId) }),
  });
}

export function useRemoveDownload() {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.userId);
  return useMutation({
    // The device first, then the record. A book gone from the backend but
    // still sealed on disk would be storage the reader cannot see or reclaim;
    // the reverse merely re-downloads next time. From inside the open book
    // the copy is demoted to the cache rather than deleted, because the
    // renderer is reading it.
    mutationFn: async (
      input: string | { bookId: string; local: 'remove' | 'demote' },
    ) => {
      const bookId = typeof input === 'string' ? input : input.bookId;
      const local = typeof input === 'string' ? 'remove' : input.local;
      if (local === 'demote') {
        await unkeepBook(bookId);
      } else {
        await removeBook(bookId);
      }
      await removeDownload(bookId);
    },
    onSuccess: () =>
      client.invalidateQueries({ queryKey: scoped('library', userId) }),
  });
}
