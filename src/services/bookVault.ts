import { Platform } from 'react-native';
import { Directory, File, FileMode, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'react-native-quick-crypto';
import { fromByteArray, toByteArray } from 'react-native-quick-base64';

import { getSignedPdfUrl } from '@/lib/supabase';
import { syncDownload } from '@/services/account';
import {
  abortError,
  downloadToPath,
  isPdfHeader,
  MIN_PDF_BYTES,
  type PdfTransferProgress,
} from '@/services/pdf';
import { useAccessStore } from '@/stores/accessStore';
import { keyValueStore } from '@/stores/storage';

/**
 * The vault: where a book lives on the device.
 *
 * Every copy of a book on disk is encrypted — AES-256-GCM, chunked, with a
 * key that is minted on this device and kept in the platform's keystore, never
 * in a file. The only plaintext PDF that ever exists is the one the renderer
 * is reading from *right now*, in the app's cache, and it is deleted the
 * moment the book is closed (and swept at the next launch in case the app
 * died first). Pdfium cannot read from anything but a file, so that window is
 * the floor; everything else is sealed.
 *
 * Two tiers share one format. `kept` is a download the reader asked for: it
 * stays until they remove it, and the backend knows about it, so it shows on
 * the Offline shelf. `cached` is a book that was merely opened: it is sealed
 * the same way so that reopening it costs no network, but it is the vault's
 * to evict, oldest-read first, once the cache passes its budget. Pressing
 * Download on a cached book promotes it in place — no second transfer.
 *
 * None of this is the gate. A book in the vault is not permission to open it;
 * the reader is gated on the membership before this module is asked for
 * anything, which is why an expired membership locks a fully downloaded book.
 */

/* ------------------------------------------------------------------------ */
/* Format                                                                    */
/* ------------------------------------------------------------------------ */

const MAGIC = [0x49, 0x4f, 0x49, 0x56] as const; // "IOIV"
const FORMAT_VERSION = 1;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const HEADER_BYTES = MAGIC.length + 1 + IV_BYTES;
const KEY_BYTES = 32;
const CIPHER = 'aes-256-gcm';

/**
 * The bytes moved per step. Each step is a synchronous native read, a native
 * AES pass and a native write, so it blocks the JS thread for the few
 * milliseconds it takes; between steps the loop yields so progress can paint
 * and a cancel can land. Four megabytes keeps the yields few — each one costs
 * a frame — while the peak memory stays small.
 */
const CHUNK_BYTES = 4 * 1024 * 1024;

/** What the cache tier may hold before the oldest-read books are evicted. */
const CACHE_BUDGET_BYTES = 400 * 1_000_000;
const CACHE_BUDGET_COUNT = 8;

/* ------------------------------------------------------------------------ */
/* Index                                                                     */
/* ------------------------------------------------------------------------ */

// Downloads live in their own MMKV id, away from preferences: clearing one
// should never disturb the other.
const index = keyValueStore('ilm-offline-books');

export type VaultTier = 'kept' | 'cached';

export type VaultEntry = {
  bookId: string;
  /** Size of the PDF itself, not the sealed file. */
  bytes: number;
  tier: VaultTier;
  savedAt: number;
  openedAt: number;
  /** Which device key sealed it. A file sealed under a lost key is unreadable. */
  keyId: string;
};

function entryKey(bookId: string) {
  return `vault:${bookId}`;
}

/** The pre-vault scheme: a plain path to a plaintext PDF. Migrated on boot. */
function legacyKey(bookId: string) {
  return `book:${bookId}`;
}

function readEntry(bookId: string): VaultEntry | null {
  const raw = index.getString(entryKey(bookId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<VaultEntry>;
    if (
      parsed &&
      typeof parsed.bytes === 'number' &&
      (parsed.tier === 'kept' || parsed.tier === 'cached') &&
      typeof parsed.keyId === 'string'
    ) {
      return {
        bookId,
        bytes: parsed.bytes,
        tier: parsed.tier,
        savedAt: parsed.savedAt ?? 0,
        openedAt: parsed.openedAt ?? 0,
        keyId: parsed.keyId,
      };
    }
  } catch {
    // A row that does not parse is a row that does not exist.
  }
  index.remove(entryKey(bookId));
  return null;
}

function writeEntry(entry: VaultEntry) {
  index.set(entryKey(entry.bookId), JSON.stringify(entry));
  notify();
}

function dropEntry(bookId: string) {
  index.remove(entryKey(bookId));
  notify();
}

function allEntries(): VaultEntry[] {
  return index
    .keys()
    .filter(key => key.startsWith('vault:'))
    .map(key => readEntry(key.slice('vault:'.length)))
    .filter((entry): entry is VaultEntry => entry != null);
}

/* ------------------------------------------------------------------------ */
/* Change feed                                                               */
/* ------------------------------------------------------------------------ */

const listeners = new Set<() => void>();
let version = 0;

function notify() {
  version += 1;
  listeners.forEach(listener => listener());
}

/** Bumps on every change to the index — a snapshot for list screens. */
export function vaultVersion(): number {
  return version;
}

/** Fires whenever an entry is written or dropped. For `useSyncExternalStore`. */
export function subscribeVault(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Synchronous, for the first frame of any screen that draws a download state. */
export function getVaultEntry(bookId: string): VaultEntry | null {
  return readEntry(bookId);
}

/** Whether the reader has this book downloaded (kept, not merely cached). */
export function isBookKept(bookId: string): boolean {
  return readEntry(bookId)?.tier === 'kept';
}

/* ------------------------------------------------------------------------ */
/* Places                                                                    */
/* ------------------------------------------------------------------------ */

/**
 * Where sealed books live: app-private storage, on both platforms.
 *
 * On iOS that is `Library`, not `Documents`. `Documents` is the directory iOS
 * exposes through the Files app and syncs to iCloud, which would put every
 * members-only PDF (sealed or not) somewhere a backup can carry it to another
 * device. `Library` is visible only to the app. On Android the document
 * directory already is the app's internal files directory — private to the
 * app, unlike external storage — so it is the right one there.
 */
function vaultDirectory(): Directory {
  return Platform.OS === 'ios'
    ? new Directory(Paths.document.parentDirectory, 'Library', 'vault')
    : new Directory(Paths.document, 'vault');
}

/**
 * Where the plaintext lives while a book is open: the cache, which the OS is
 * free to clear and which never enters a backup.
 */
function readerDirectory(): Directory {
  return new Directory(Paths.cache, 'reader');
}

function sealedFile(bookId: string): File {
  return new File(vaultDirectory(), `${bookId}.ioiv`);
}

function openFile(bookId: string): File {
  return new File(readerDirectory(), `${bookId}.pdf`);
}

function ensure(directory: Directory) {
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
}

function remove(file: File) {
  try {
    if (file.exists) file.delete();
  } catch {
    // Already gone, or on its way.
  }
}

/** A plain path, for the native downloader, which does not speak `file://`. */
function plainPath(file: File): string {
  return decodeURIComponent(file.uri.replace(/^file:\/\//, ''));
}

function fileUri(file: File): string {
  return file.uri.startsWith('file://') ? file.uri : `file://${file.uri}`;
}

/** Headroom kept free on the device after a download, so it never fills the disk. */
const SPACE_HEADROOM_BYTES = 100 * 1_000_000;

/**
 * Refuses a transfer that would not fit, before a byte moves. A download
 * that dies at 90% on a full disk costs the reader the data and the wait,
 * and leaves a `.part` for the next launch to sweep.
 */
function ensureSpace(bytes: number) {
  if (bytes <= 0) return;
  let available: number;
  try {
    available = Paths.availableDiskSpace;
  } catch {
    return;
  }
  if (Number.isFinite(available) && available < bytes + SPACE_HEADROOM_BYTES) {
    throw new Error(
      'There is not enough free space on this device for this book. Free up some space and try again.',
    );
  }
}

/* ------------------------------------------------------------------------ */
/* Key                                                                       */
/* ------------------------------------------------------------------------ */

const KEY_STORE_ID = 'ilm.vault.key.v1';
/** Where the key falls back to if the keystore is broken on this device. */
// Not under the `vault:` prefix, which the index sweep treats as book rows.
const KEY_FALLBACK_ID = 'key:vault';

type VaultKey = {
  id: string;
  bytes: Uint8Array;
};

let keyPromise: Promise<VaultKey> | null = null;

function parseKey(stored: string | null | undefined): VaultKey | null {
  if (!stored) return null;
  const [id, encoded] = stored.split(':');
  if (!id || !encoded) return null;
  const bytes = toByteArray(encoded);
  if (bytes.length !== KEY_BYTES) return null;
  return { id, bytes: new Uint8Array(bytes) };
}

function mintKey(): { key: VaultKey; stored: string } {
  const bytes = new Uint8Array(randomBytes(KEY_BYTES));
  const id = randomBytes(6).toString('hex');
  return {
    key: { id, bytes },
    stored: `${id}:${fromByteArray(bytes)}`,
  };
}

/**
 * The device key, minted once and kept in the keystore.
 *
 * Read once per launch and held in memory after that, so the seal and unseal
 * paths never wait on the keystore mid-book. A keystore that cannot be read
 * or written (it happens, on some Android builds) falls back to the vault's
 * own MMKV file — still app-private, but not hardware-backed — rather than
 * taking downloads away from the reader entirely.
 */
function loadKey(): Promise<VaultKey> {
  if (!keyPromise) {
    keyPromise = (async () => {
      let stored: string | null = null;
      try {
        stored = await SecureStore.getItemAsync(KEY_STORE_ID);
      } catch {
        stored = null;
      }
      const secure = parseKey(stored);
      if (secure) return secure;

      const local = parseKey(index.getString(KEY_FALLBACK_ID));
      if (local) return local;

      const minted = mintKey();
      try {
        await SecureStore.setItemAsync(KEY_STORE_ID, minted.stored, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
        });
      } catch (error) {
        if (__DEV__) {
          console.warn(
            '[vault] keystore unavailable; keeping the key in app storage',
            error,
          );
        }
        index.set(KEY_FALLBACK_ID, minted.stored);
      }
      return minted.key;
    })().catch(error => {
      keyPromise = null;
      throw error;
    });
  }
  return keyPromise;
}

/* ------------------------------------------------------------------------ */
/* Seal / unseal                                                             */
/* ------------------------------------------------------------------------ */

export class VaultError extends Error {
  constructor(
    message: string,
    readonly code: 'CORRUPT' | 'KEY_MISMATCH' | 'NOT_PDF',
  ) {
    super(message);
    this.name = 'VaultError';
  }
}

type Progress = (progress: PdfTransferProgress) => void;

function report(
  onProgress: Progress | undefined,
  loadedBytes: number,
  totalBytes: number,
) {
  if (!onProgress || totalBytes <= 0) return;
  const percent =
    loadedBytes >= totalBytes
      ? 100
      : Math.min(99, Math.floor((loadedBytes / totalBytes) * 100));
  onProgress({ loadedBytes, totalBytes, percent });
}

/** Lets the frame paint and an abort land between two native steps. */
function breathe(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function bytesOf(buffer: Uint8Array): Uint8Array {
  // The cipher hands back a Buffer, which is a Uint8Array subclass; the file
  // handle wants exactly a Uint8Array over the same memory, no copy.
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

/**
 * Seals a plaintext PDF into the vault file. The plaintext is left in place;
 * the caller decides whether it is still being read.
 */
async function seal(
  source: File,
  target: File,
  key: VaultKey,
  options: { onProgress?: Progress; signal?: AbortSignal } = {},
): Promise<number> {
  ensure(target.parentDirectory);
  const part = new File(target.parentDirectory, `${target.name}.part`);
  remove(part);

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(CIPHER, key.bytes, iv);
  const input = source.open(FileMode.ReadOnly);
  let output: ReturnType<File['open']> | null = null;
  try {
    const total = input.size ?? 0;
    if (total < MIN_PDF_BYTES) {
      throw new VaultError('This book file is empty.', 'NOT_PDF');
    }
    part.create({ overwrite: true, intermediates: true });
    output = part.open(FileMode.WriteOnly);

    const header = new Uint8Array(HEADER_BYTES);
    header.set(MAGIC, 0);
    header[MAGIC.length] = FORMAT_VERSION;
    header.set(new Uint8Array(iv), MAGIC.length + 1);
    output.writeBytes(header);

    let done = 0;
    while (done < total) {
      if (options.signal?.aborted) throw abortError();
      const chunk = input.readBytes(Math.min(CHUNK_BYTES, total - done));
      if (chunk.length === 0) break;
      if (done === 0 && !isPdfHeader(chunk)) {
        throw new VaultError('This book file is not a PDF.', 'NOT_PDF');
      }
      output.writeBytes(bytesOf(cipher.update(chunk)));
      done += chunk.length;
      report(options.onProgress, done, total);
      await breathe();
    }
    output.writeBytes(bytesOf(cipher.final()));
    output.writeBytes(bytesOf(cipher.getAuthTag()));
    output.close();
    output = null;
    input.close();

    remove(target);
    part.moveSync(target, { overwrite: true });
    return total;
  } catch (error) {
    try {
      output?.close();
    } catch {
      // Already closed.
    }
    try {
      input.close();
    } catch {
      // Already closed.
    }
    remove(part);
    throw error;
  }
}

/**
 * Unseals a vault file into a plaintext PDF. Nothing is trusted until the
 * authentication tag checks out at the end: a file that fails is deleted
 * from the vault, and the caller re-downloads.
 */
async function unseal(
  source: File,
  target: File,
  key: VaultKey,
  options: { onProgress?: Progress; signal?: AbortSignal } = {},
): Promise<number> {
  ensure(target.parentDirectory);
  const part = new File(target.parentDirectory, `${target.name}.part`);
  remove(part);

  const input = source.open(FileMode.ReadOnly);
  let output: ReturnType<File['open']> | null = null;
  try {
    const size = input.size ?? 0;
    const bodyBytes = size - HEADER_BYTES - TAG_BYTES;
    if (bodyBytes < MIN_PDF_BYTES) {
      throw new VaultError('This download is damaged.', 'CORRUPT');
    }
    const header = input.readBytes(HEADER_BYTES);
    if (
      header.length !== HEADER_BYTES ||
      !MAGIC.every((byte, i) => header[i] === byte) ||
      header[MAGIC.length] !== FORMAT_VERSION
    ) {
      throw new VaultError('This download is damaged.', 'CORRUPT');
    }
    const iv = header.slice(MAGIC.length + 1);
    const decipher = createDecipheriv(CIPHER, key.bytes, iv);

    part.create({ overwrite: true, intermediates: true });
    output = part.open(FileMode.WriteOnly);

    let done = 0;
    while (done < bodyBytes) {
      if (options.signal?.aborted) throw abortError();
      const chunk = input.readBytes(Math.min(CHUNK_BYTES, bodyBytes - done));
      if (chunk.length === 0) {
        throw new VaultError('This download is damaged.', 'CORRUPT');
      }
      const plain = bytesOf(decipher.update(chunk));
      if (done === 0 && !isPdfHeader(plain)) {
        // The wrong key gives noise, not a PDF. No need to read the rest.
        throw new VaultError('This download is damaged.', 'KEY_MISMATCH');
      }
      output.writeBytes(plain);
      done += chunk.length;
      report(options.onProgress, done, bodyBytes);
      await breathe();
    }
    const tag = input.readBytes(TAG_BYTES);
    decipher.setAuthTag(tag as Parameters<typeof decipher.setAuthTag>[0]);
    try {
      output.writeBytes(bytesOf(decipher.final()));
    } catch {
      throw new VaultError('This download is damaged.', 'CORRUPT');
    }
    output.close();
    output = null;
    input.close();

    remove(target);
    part.moveSync(target, { overwrite: true });
    return bodyBytes;
  } catch (error) {
    try {
      output?.close();
    } catch {
      // Already closed.
    }
    try {
      input.close();
    } catch {
      // Already closed.
    }
    remove(part);
    throw error;
  }
}

/* ------------------------------------------------------------------------ */
/* Per-book ordering                                                         */
/* ------------------------------------------------------------------------ */

/**
 * Every operation on one book runs after the one before it. Opening, sealing
 * in the background, promoting, releasing and removing all touch the same two
 * files, and letting any two overlap is how a reader ends up with a PDF
 * deleted from under Pdfium or sealed while half-written.
 */
const chains = new Map<string, Promise<unknown>>();

function serial<T>(bookId: string, task: () => Promise<T>): Promise<T> {
  const previous = chains.get(bookId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(task);
  chains.set(bookId, next);
  void next
    .catch(() => undefined)
    .then(() => {
      if (chains.get(bookId) === next) chains.delete(bookId);
    });
  return next;
}

/* ------------------------------------------------------------------------ */
/* Operations                                                                */
/* ------------------------------------------------------------------------ */

export type OpenOptions = {
  onProgress?: Progress;
  signal?: AbortSignal;
};

export type OpenedBook = {
  /** A `file://` URI the renderer can read. Valid until `releaseBook`. */
  uri: string;
  /** True when no network was needed. */
  offline: boolean;
};

/** Whether the open plaintext for this book is whole and matches the vault. */
function openCopyIsUsable(bookId: string, expectedBytes: number | null) {
  const file = openFile(bookId);
  try {
    if (!file.exists) return false;
    const size = file.size;
    if (size < MIN_PDF_BYTES) return false;
    return expectedBytes == null || size === expectedBytes;
  } catch {
    return false;
  }
}

/**
 * Drops a sealed book whose file is unreadable — wrong key, damaged, or
 * simply missing — so the next open goes to the network instead of failing
 * the same way again.
 */
function purge(bookId: string) {
  remove(sealedFile(bookId));
  dropEntry(bookId);
}

/**
 * Gets a book ready to read.
 *
 * In order: the plaintext already open from earlier this session (reopened
 * from the shelf, say — instant); the vault, unsealed into the cache; and
 * last the network, streamed into the cache and returned the moment it is
 * whole, with the sealing into the vault done behind the first page rather
 * than in front of it.
 */
export function openBook(
  bookId: string,
  options: OpenOptions = {},
): Promise<OpenedBook> {
  return serial(bookId, async () => {
    await bootVault();
    const { onProgress, signal } = options;
    if (signal?.aborted) throw abortError();

    const key = await loadKey();
    let entry = readEntry(bookId);

    if (entry && entry.keyId !== key.id) {
      // Sealed under a key this device no longer has. Nothing can read it.
      purge(bookId);
      entry = null;
    }

    if (entry && openCopyIsUsable(bookId, entry.bytes)) {
      touch(entry);
      refreshAccessInBackground();
      report(onProgress, 1, 1);
      return { uri: fileUri(openFile(bookId)), offline: true };
    }

    if (entry) {
      const sealed = sealedFile(bookId);
      if (!sealed.exists) {
        purge(bookId);
      } else {
        try {
          await unseal(sealed, openFile(bookId), key, { onProgress, signal });
          touch(entry);
          refreshAccessInBackground();
          return { uri: fileUri(openFile(bookId)), offline: true };
        } catch (error) {
          if (signal?.aborted) throw abortError();
          if (error instanceof VaultError) {
            if (__DEV__) {
              console.warn(`[vault] ${bookId} unreadable (${error.code})`);
            }
            purge(bookId);
          } else {
            throw error;
          }
        }
      }
    }

    // A whole plaintext from a download this session whose sealing never
    // finished (the app was backgrounded mid-seal, say) still reads fine.
    if (openCopyIsUsable(bookId, null)) {
      void sealInBackground(bookId, 'cached');
      report(onProgress, 1, 1);
      return { uri: fileUri(openFile(bookId)), offline: true };
    }

    ensure(readerDirectory());
    const target = openFile(bookId);
    const { url, fileSizeBytes } = await getSignedPdfUrl(bookId);
    // Twice over: the plaintext to read from, and the seal cached behind it.
    ensureSpace((fileSizeBytes ?? 0) * 2);
    await downloadToPath(url, plainPath(target), {
      expectedBytes: fileSizeBytes,
      onProgress,
      signal,
    });

    void sealInBackground(bookId, 'cached');
    return { uri: fileUri(target), offline: false };
  });
}

function touch(entry: VaultEntry) {
  writeEntry({ ...entry, openedAt: Date.now() });
}

/**
 * A book opened from the vault skipped the signed-URL call, which is what
 * normally re-anchors the membership lock. The store is asked directly
 * instead, off the critical path, so an offline reader still gets the
 * server's latest word once a connection is there.
 */
function refreshAccessInBackground() {
  void useAccessStore
    .getState()
    .refresh()
    .catch(() => undefined);
}

/** How long the first page gets to itself before the background seal starts. */
const SEAL_GRACE_MS = 4000;

/**
 * Seals the open plaintext into the vault after the fact. Queued behind the
 * open that produced it, and then held a moment more, so the renderer has
 * its file and the first page is up before the JS thread starts taking its
 * few-millisecond turns with the cipher.
 */
function sealInBackground(bookId: string, tier: VaultTier): Promise<void> {
  return serial(bookId, async () => {
    if (readEntry(bookId)) return;
    await new Promise<void>(resolve => setTimeout(resolve, SEAL_GRACE_MS));
    const source = openFile(bookId);
    if (!openCopyIsUsable(bookId, null)) return;
    try {
      const key = await loadKey();
      const bytes = await seal(source, sealedFile(bookId), key);
      writeEntry({
        bookId,
        bytes,
        tier,
        keyId: key.id,
        savedAt: Date.now(),
        openedAt: Date.now(),
      });
      if (tier === 'cached') enforceCacheBudget();
    } catch (error) {
      if (__DEV__) console.warn(`[vault] could not seal ${bookId}`, error);
    }
  });
}

/**
 * Keeps a book offline — the Download action.
 *
 * Whatever is nearest is used: a cached seal is promoted in place, an open
 * plaintext is sealed from disk, and only a book that is nowhere on the
 * device is fetched. The backend hears about it last, once the file is
 * genuinely on the device, so the Offline shelf never lists a book that
 * is not there.
 */
export function keepBook(
  bookId: string,
  options: OpenOptions = {},
): Promise<VaultEntry & { uri: string | null }> {
  return serial(bookId, async () => {
    await bootVault();
    const { onProgress, signal } = options;
    if (signal?.aborted) throw abortError();
    const key = await loadKey();

    let entry = readEntry(bookId);
    if (entry && (entry.keyId !== key.id || !sealedFile(bookId).exists)) {
      purge(bookId);
      entry = null;
    }

    if (!entry) {
      let source = openFile(bookId);
      let bytesFromNetwork: number | undefined;
      if (!openCopyIsUsable(bookId, null)) {
        ensure(readerDirectory());
        const { url, fileSizeBytes } = await getSignedPdfUrl(bookId);
        // Kept twice over: the plaintext to read from now, the seal to keep.
        ensureSpace((fileSizeBytes ?? 0) * 2);
        // The transfer owns the first 85% of the bar; the seal, the rest.
        bytesFromNetwork = await downloadToPath(url, plainPath(source), {
          expectedBytes: fileSizeBytes,
          onProgress: onProgress
            ? p =>
                onProgress({
                  ...p,
                  percent: Math.floor(p.percent * 0.85),
                })
            : undefined,
          signal,
        });
        source = openFile(bookId);
      }
      const bytes = await seal(source, sealedFile(bookId), key, {
        signal,
        onProgress: onProgress
          ? p =>
              onProgress({
                ...p,
                percent:
                  bytesFromNetwork != null
                    ? 85 + Math.floor(p.percent * 0.15)
                    : p.percent,
              })
          : undefined,
      });
      entry = {
        bookId,
        bytes,
        tier: 'kept',
        keyId: key.id,
        savedAt: Date.now(),
        openedAt: Date.now(),
      };
    } else {
      entry = { ...entry, tier: 'kept', savedAt: Date.now() };
      report(onProgress, 1, 1);
    }

    writeEntry(entry);
    // The vault is the truth; the backend is told, and a failure to tell it
    // does not undo the download. The shelf catches up on the next sync.
    await syncDownload(bookId, 'completed', entry.bytes).catch(() => undefined);
    // The plaintext is still on disk if it was sealed from one this session.
    const open = openFile(bookId);
    return { ...entry, uri: open.exists ? fileUri(open) : null };
  });
}

/**
 * The reader has closed the book: the plaintext goes. Waits for any seal in
 * flight first, so the copy is never pulled from under it.
 */
export function releaseBook(bookId: string): Promise<void> {
  return serial(bookId, async () => {
    remove(openFile(bookId));
  });
}

/** Removes a book from the device entirely — the sealed copy and any open one. */
export function removeBook(bookId: string): Promise<void> {
  return serial(bookId, async () => {
    remove(openFile(bookId));
    purge(bookId);
  });
}

/** Demotes a kept book to the cache tier; the file stays until evicted. */
export function unkeepBook(bookId: string): Promise<void> {
  return serial(bookId, async () => {
    const entry = readEntry(bookId);
    if (entry?.tier === 'kept') {
      writeEntry({ ...entry, tier: 'cached' });
      enforceCacheBudget();
    }
  });
}

/**
 * Evicts cached books, least recently read first, until the cache tier is
 * back inside its budget. Kept books are never touched.
 */
function enforceCacheBudget() {
  const cached = allEntries()
    .filter(entry => entry.tier === 'cached')
    .sort((a, b) => a.openedAt - b.openedAt);
  let bytes = cached.reduce((sum, entry) => sum + entry.bytes, 0);
  let count = cached.length;
  for (const entry of cached) {
    if (bytes <= CACHE_BUDGET_BYTES && count <= CACHE_BUDGET_COUNT) break;
    // Never the one being read.
    if (openFile(entry.bookId).exists) continue;
    purge(entry.bookId);
    bytes -= entry.bytes;
    count -= 1;
  }
}

/** Bytes of sealed books on the device, by tier. */
export function vaultUsage(): { kept: number; cached: number } {
  return allEntries().reduce(
    (usage, entry) => {
      usage[entry.tier] += entry.bytes;
      return usage;
    },
    { kept: 0, cached: 0 },
  );
}

/* ------------------------------------------------------------------------ */
/* Boot                                                                      */
/* ------------------------------------------------------------------------ */

let booted: Promise<void> | null = null;

/**
 * Housekeeping at launch, once.
 *
 * Sweeps any plaintext the last session left behind (a crash, a kill from
 * the switcher) and drops index rows whose files are gone. Both are quick,
 * and every operation waits on them, so a book opened from a cold start
 * cannot have its fresh plaintext swept from under it.
 *
 * Anything the pre-vault app stored in the clear is then moved into the
 * vault behind that — sealed, and marked kept, since those were downloads
 * the reader asked for. Each book takes the same per-book turn as an open
 * would, so a migration and a read of the same book never overlap.
 */
export function bootVault(): Promise<void> {
  if (!booted) {
    booted = (async () => {
      try {
        const reader = readerDirectory();
        if (reader.exists) reader.delete();
      } catch {
        // Nothing to sweep, or nothing sweepable.
      }

      for (const entry of allEntries()) {
        if (!sealedFile(entry.bookId).exists) dropEntry(entry.bookId);
      }

      // The other direction: a seal with no row (a cleared index, a kill
      // between the move and the write) is disk nobody can see or reclaim,
      // and a `.part` is a seal that never finished. Both go.
      try {
        const vault = vaultDirectory();
        if (vault.exists) {
          const known = new Set(allEntries().map(e => `${e.bookId}.ioiv`));
          for (const item of vault.list()) {
            if (item instanceof File && !known.has(item.name)) remove(item);
          }
        }
      } catch {
        // A listing that fails leaves the files where they are.
      }
    })()
      .catch(error => {
        if (__DEV__) console.warn('[vault] boot failed', error);
      })
      .then(() => {
        void migrateLegacy().then(enforceCacheBudget);
      });
  }
  return booted;
}

async function migrateLegacy() {
  const legacy = index
    .keys()
    .filter(key => key.startsWith('book:'))
    .map(key => ({
      bookId: key.slice('book:'.length),
      path: index.getString(key),
    }));
  if (legacy.length === 0) return;

  let key: VaultKey;
  try {
    key = await loadKey();
  } catch {
    return;
  }
  for (const { bookId, path } of legacy) {
    await serial(bookId, async () => {
      try {
        const file = path
          ? new File(path.startsWith('file://') ? path : `file://${path}`)
          : null;
        if (file?.exists && !readEntry(bookId)) {
          const bytes = await seal(file, sealedFile(bookId), key);
          writeEntry({
            bookId,
            bytes,
            tier: 'kept',
            keyId: key.id,
            savedAt: Date.now(),
            openedAt: Date.now(),
          });
        }
        if (file) remove(file);
      } catch (error) {
        if (__DEV__) {
          console.warn(`[vault] could not migrate ${bookId}`, error);
        }
      } finally {
        index.remove(legacyKey(bookId));
      }
    });
  }
}
