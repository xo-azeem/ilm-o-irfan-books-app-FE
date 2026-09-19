import { queryClient } from '@/lib/queryClient';
import { reconcileVault } from '@/services/bookVault';
import { useAccessStore } from '@/stores/accessStore';

import type { RemoteMessage } from './firebase';

/**
 * The wire contract with the backend's `_shared/push.ts`.
 *
 * Every message carries a `notification` (the OS draws it when the app is in
 * the background) and a string-only `data` map. `data.route` says where a tap
 * goes; `data.kind` says which caches are now stale.
 */
export type PushKind =
  | 'books_published'
  | 'collection_published'
  | 'collection_books_added'
  | 'book_deleted'
  | 'book_file_replaced'
  | 'book_updated'
  | 'membership_activated'
  | 'membership_expired'
  | 'account_deletion_approved'
  | 'account_deletion_rejected'
  /** To admins only: a reader has asked for their account to be deleted. */
  | 'account_deletion_requested';

export type PushIntent =
  | { route: 'book'; bookId: string }
  | { route: 'collection'; collectionId: string }
  | { route: 'home' }
  | { route: 'library' }
  | { route: 'membership' }
  | { route: 'privacy' }
  /** Admin tool: People → Deletions. Dropped for anyone who is not an admin. */
  | { route: 'adminDeletions' };

export type PushPayload = {
  kind: PushKind | null;
  count: number;
  intent: PushIntent | null;
  title: string | null;
  body: string | null;
  /** `data.bookId` when present, whatever the route — the book that changed. */
  bookId: string | null;
};

const KINDS: ReadonlySet<string> = new Set([
  'books_published',
  'collection_published',
  'collection_books_added',
  'book_deleted',
  'book_file_replaced',
  'book_updated',
  'membership_activated',
  'membership_expired',
  'account_deletion_approved',
  'account_deletion_rejected',
  'account_deletion_requested',
]);

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parseIntent(data: Record<string, unknown>): PushIntent | null {
  const bookId = text(data.bookId);
  const collectionId = text(data.collectionId);
  switch (text(data.route)) {
    case 'book':
      return bookId ? { route: 'book', bookId } : null;
    case 'collection':
      return collectionId ? { route: 'collection', collectionId } : null;
    case 'home':
      return { route: 'home' };
    case 'library':
      return { route: 'library' };
    case 'membership':
      return { route: 'membership' };
    case 'privacy':
      return { route: 'privacy' };
    case 'adminDeletions':
      return { route: 'adminDeletions' };
    default:
      return null;
  }
}

/** The kinds addressed to a person rather than to every install. */
const TARGETED_KINDS: ReadonlySet<string> = new Set([
  'book_deleted',
  'book_file_replaced',
  'book_updated',
  'membership_activated',
  'membership_expired',
  'account_deletion_approved',
  'account_deletion_rejected',
  'account_deletion_requested',
]);

/**
 * Whether a delivery is for whoever is signed in right now.
 *
 * A targeted push can outlive its reader: the account signed out, or was
 * deleted, between the send and the tap. With no session there is nothing
 * to refresh and nowhere personal to go, so such a message is dropped
 * rather than routed. Topic announcements are for every install and pass.
 */
export function pushIsForCurrentUser(
  payload: PushPayload,
  userId: string | null,
): boolean {
  if (!payload.kind || !TARGETED_KINDS.has(payload.kind)) {
    return true;
  }
  return Boolean(userId);
}

/** Where a tap lands when the payload names nowhere in particular. */
export const DEFAULT_PUSH_INTENT: PushIntent = { route: 'home' };

/** Reads a delivered message. Unknown or foreign messages parse to nulls. */
export function parsePush(
  message: RemoteMessage | null | undefined,
): PushPayload {
  const data = (message?.data ?? {}) as Record<string, unknown>;
  const kind = text(data.kind);
  const count = Number.parseInt(String(data.count ?? '1'), 10);

  return {
    kind: kind && KINDS.has(kind) ? (kind as PushKind) : null,
    count: Number.isFinite(count) && count > 0 ? count : 1,
    intent: parseIntent(data),
    title: text(message?.notification?.title),
    body: text(message?.notification?.body),
    bookId: text(data.bookId),
  };
}

/**
 * Brings the app up to date with what the notification says happened.
 *
 * Runs in the foreground (a message arriving while the app is open) and on a
 * tap (the app coming forward). Nothing here waits: the screens re-render as
 * the refetches land. A background delivery does none of this — the
 * foreground return already refetches and reconciles, see the providers.
 */
export function applyPushSideEffects(payload: PushPayload): void {
  switch (payload.kind) {
    case 'books_published':
    case 'collection_published':
    case 'collection_books_added':
      // Home, Discover and every collection page read the catalogue keys.
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
      break;

    case 'book_deleted':
    case 'book_file_replaced':
      // The vault drops the sealed copy the moment the server confirms it,
      // and tells the library/book queries to refetch as it does.
      void reconcileVault(payload.bookId ? [payload.bookId] : undefined);
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      if (payload.bookId) {
        void queryClient.invalidateQueries({
          queryKey: ['catalog', 'book', payload.bookId],
        });
      } else {
        void queryClient.invalidateQueries({ queryKey: ['catalog'] });
      }
      break;

    case 'book_updated':
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({
        queryKey: payload.bookId
          ? ['catalog', 'book', payload.bookId]
          : ['catalog'],
      });
      break;

    case 'membership_activated':
    case 'membership_expired':
      void useAccessStore.getState().refresh();
      void queryClient.invalidateQueries({ queryKey: ['subscription'] });
      break;

    case 'account_deletion_approved':
    case 'account_deletion_rejected':
      // Privacy & security shows the decision the moment it is looked at.
      void queryClient.invalidateQueries({ queryKey: ['account', 'deletion'] });
      break;

    case 'account_deletion_requested':
      // The admin's queue, and the count Today draws it from.
      void queryClient.invalidateQueries({ queryKey: ['admin', 'deletions'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      break;

    default:
      break;
  }
}
