/**
 * The decision behind a vault reconcile, on its own so it can be tested
 * without a device: given what the vault holds and what the server said,
 * which copies go and which are merely stamped.
 */

export type RevocationReason = 'removed' | 'replaced';

export type HeldCopy = {
  bookId: string;
  /** The server's file stamp when this copy was made; `null` if unknown. */
  revision: string | null;
};

export type ServerFile = {
  /** The server's current file stamp for the book. */
  pdfUpdatedAt: string;
};

export type ReconcilePlan = {
  /** Copies the server no longer stands behind, with why. */
  revoke: Array<{ bookId: string; reason: RevocationReason }>;
  /** Copies with no stamp of their own that take the server's current one. */
  adopt: Array<{ bookId: string; revision: string }>;
};

/**
 * - A book the server did not answer for was deleted: the copy goes.
 * - A copy with no stamp cannot be judged, so it takes the server's stamp
 *   rather than being thrown away on a guess — the only time a copy is kept
 *   without knowing which file it is.
 * - A copy whose stamp differs from the server's is the old file: it goes.
 * - Everything else is exactly the book the server has.
 */
export function planReconcile(
  held: HeldCopy[],
  server: Map<string, ServerFile>,
): ReconcilePlan {
  const plan: ReconcilePlan = { revoke: [], adopt: [] };
  for (const copy of held) {
    const file = server.get(copy.bookId);
    if (!file) {
      plan.revoke.push({ bookId: copy.bookId, reason: 'removed' });
    } else if (copy.revision == null) {
      plan.adopt.push({ bookId: copy.bookId, revision: file.pdfUpdatedAt });
    } else if (copy.revision !== file.pdfUpdatedAt) {
      plan.revoke.push({ bookId: copy.bookId, reason: 'replaced' });
    }
  }
  return plan;
}
