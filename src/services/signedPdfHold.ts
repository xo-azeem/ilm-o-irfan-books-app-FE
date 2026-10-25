/**
 * Holding a signed PDF URL for a moment, safely.
 *
 * The rules, and why — `signedPdfCache.ts` has the reason any of this exists:
 *
 *  - a URL is handed out only while it has `REUSE_MARGIN_S` of life left, so
 *    the download it starts is never refused at the door;
 *  - its life is counted from when the request was *sent*, which is before
 *    the server signed it, so the estimate can only err short;
 *  - a URL is handed out **once**. A download that fails asks for a new one,
 *    rather than retrying on the URL that may be why it failed;
 *  - and it is held per reader as well as per book, so a URL warmed by one
 *    account is never given to another.
 *
 * Pure: the fetcher and the clock are passed in, so the rules can be tested
 * without a network, a session or React Native.
 */

/**
 * How much life a held URL must still have to be handed out.
 *
 * Storage checks the token when the GET arrives, not as the bytes flow, so
 * this only has to cover the gap between handing the URL out and the request
 * reaching Storage. Twenty seconds is generous for that and still leaves a
 * five-minute URL nearly all of its life.
 */
export const REUSE_MARGIN_S = 20;

/**
 * The last moment a URL fetched at `sentAt` may be handed out, in ms.
 *
 * A URL with no usable life — missing, nonsense, or inside the margin, as a
 * reader in the last seconds of a membership is given — comes back as
 * `sentAt` itself: never reusable, so the open asks for a fresh one and the
 * server decides.
 */
export function usableUntil(
  sentAt: number,
  expiresIn: number | null | undefined,
  marginS: number = REUSE_MARGIN_S,
): number {
  if (
    typeof expiresIn !== 'number' ||
    !Number.isFinite(expiresIn) ||
    expiresIn <= marginS
  ) {
    return sentAt;
  }
  return sentAt + (expiresIn - marginS) * 1000;
}

export type SignedPdfHold<T> = {
  /** Starts fetching, returns at once. Failures are left for `take` to find. */
  warm: (userId: string, bookId: string) => void;
  /** The URL to download from, now — held, in flight, or fresh. Once. */
  take: (userId: string, bookId: string) => Promise<T>;
  /** Drops everything held. */
  clear: () => void;
};

export function createSignedPdfHold<T extends { expiresIn?: number | null }>(
  fetcher: (bookId: string) => Promise<T>,
  now: () => number = Date.now,
): SignedPdfHold<T> {
  const held = new Map<string, { value: T; until: number }>();
  const pending = new Map<string, Promise<T>>();

  const keyOf = (userId: string, bookId: string) => `${userId}:${bookId}`;

  function request(userId: string, bookId: string): Promise<T> {
    const key = keyOf(userId, bookId);
    const existing = pending.get(key);
    if (existing) return existing;

    const sentAt = now();
    const promise = fetcher(bookId)
      .then(value => {
        held.set(key, { value, until: usableUntil(sentAt, value.expiresIn) });
        return value;
      })
      .finally(() => {
        if (pending.get(key) === promise) pending.delete(key);
      });
    pending.set(key, promise);
    return promise;
  }

  return {
    warm(userId, bookId) {
      const hit = held.get(keyOf(userId, bookId));
      if (hit && hit.until > now()) return;
      void request(userId, bookId).catch(() => undefined);
    },

    async take(userId, bookId) {
      const key = keyOf(userId, bookId);

      const hit = held.get(key);
      held.delete(key);
      if (hit && hit.until > now()) return hit.value;

      const inflight = pending.get(key);
      if (inflight) {
        try {
          const value = await inflight;
          held.delete(key);
          return value;
        } catch {
          // The warm-up failed — a blip a few seconds ago is no reason to fail
          // the tap. Ask again below; a refusal will simply be refused again.
        }
      }

      const value = await request(userId, bookId);
      held.delete(key);
      return value;
    },

    clear() {
      held.clear();
      pending.clear();
    },
  };
}
