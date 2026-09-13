import { useCallback, useSyncExternalStore } from 'react';

import {
  getVaultEntry,
  subscribeVault,
  vaultVersion,
  type VaultEntry,
} from '@/services/bookVault';

/**
 * A counter that moves on every change to the vault. A list screen that
 * reads several entries subscribes once through this and re-reads them all.
 */
export function useVaultVersion(): number {
  return useSyncExternalStore(subscribeVault, vaultVersion, vaultVersion);
}

/**
 * The vault's row for one book, live. Synchronous on the first render, so a
 * Download tile or an Offline row is right in frame one, and re-rendered the
 * moment the vault seals, promotes or evicts the book.
 */
export function useVaultEntry(bookId: string): VaultEntry | null {
  const read = useCallback(() => getVaultEntry(bookId), [bookId]);
  // Entries are re-read as fresh objects, so compare by the fields that draw.
  const snapshot = useSyncExternalStore(
    subscribeVault,
    () => {
      const entry = read();
      return entry ? `${entry.tier}:${entry.bytes}:${entry.savedAt}` : '';
    },
    () => '',
  );
  return snapshot ? read() : null;
}

/** Whether the reader has this book downloaded — kept, not merely cached. */
export function useBookKept(bookId: string): boolean {
  return useVaultEntry(bookId)?.tier === 'kept';
}
