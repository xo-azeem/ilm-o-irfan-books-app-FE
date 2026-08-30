import ReactNativeBlobUtil from 'react-native-blob-util';

import type { BookPdfSource } from '@/constants/books';
import { getSignedPdfUrl } from '@/lib/supabase';
import { syncDownload } from '@/services/account';
import { keyValueStore } from '@/stores/storage';

// Downloads live in their own MMKV id, away from preferences: clearing one
// should never disturb the other. Created through the shared factory so a
// missing native module degrades to memory instead of throwing on import.
const storage = keyValueStore('ilm-offline-books');
const directory = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/books`;
const DOWNLOAD_TIMEOUT_MS = 120000;
/** Anything smaller than this cannot be a PDF, header or not. */
const MIN_PDF_BYTES = 32;

function key(bookId: string) {
  return `book:${bookId}`;
}

function filePath(bookId: string) {
  return `${directory}/${bookId}.pdf`;
}

/** The local-file member of the union, so callers can read `.uri` directly. */
type LocalPdfSource = Extract<BookPdfSource, { uri: string }>;

function fileSource(path: string): LocalPdfSource {
  return { uri: path.startsWith('file://') ? path : `file://${path}` };
}

function isPdfHeader(bytes: ArrayLike<number>): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

/**
 * Reads only the first five bytes off disk. A truncated or HTML-error body
 * saved as a PDF is what makes the native renderer fall over, so it is worth
 * catching here rather than in Pdfium.
 */
async function hasPdfHeader(path: string): Promise<boolean> {
  const probe = `${path}.head`;
  try {
    await ReactNativeBlobUtil.fs.unlink(probe).catch(() => undefined);
    await ReactNativeBlobUtil.fs.slice(path, probe, 0, 5);
    const bytes = (await ReactNativeBlobUtil.fs.readFile(probe, 'ascii')) as number[];
    return isPdfHeader(bytes ?? []);
  } catch {
    // If the platform cannot slice the file, trust the download and let the
    // renderer report a real problem rather than blocking a good book.
    return true;
  } finally {
    await ReactNativeBlobUtil.fs.unlink(probe).catch(() => undefined);
  }
}

async function ensureDirectory() {
  if (!(await ReactNativeBlobUtil.fs.exists(directory))) {
    await ReactNativeBlobUtil.fs.mkdir(directory);
  }
}

export type PdfTransferProgress = {
  loadedBytes: number;
  totalBytes: number;
  percent: number;
};

type DownloadOptions = {
  expectedBytes?: number;
  onProgress?: (progress: PdfTransferProgress) => void;
  signal?: AbortSignal;
};

function abortError() {
  return Object.assign(new Error('The PDF download was cancelled.'), { name: 'AbortError' });
}

function statusError(status: number) {
  return new Error(
    status === 400 || status === 404
      ? 'This book file is missing from storage.'
      : `Could not download the PDF (${status}).`,
  );
}

function emitTransferProgress(
  loadedBytes: number,
  totalBytes: number,
  onProgress: ((progress: PdfTransferProgress) => void) | undefined,
  lastPercent: { value: number },
) {
  if (!onProgress || totalBytes <= 0) {
    return;
  }

  const ratio = Math.max(0, Math.min(1, loadedBytes / totalBytes));
  const percent = loadedBytes >= totalBytes ? 100 : Math.min(99, Math.floor(ratio * 100));
  if (percent === lastPercent.value && loadedBytes < totalBytes) {
    return;
  }

  lastPercent.value = percent;
  onProgress({ loadedBytes, totalBytes, percent });
}

/**
 * Streams the book to disk natively.
 *
 * The bytes never enter JavaScript: a book is tens of megabytes, and copying it
 * through the bridge as base64 is what puts the app within reach of an
 * out-of-memory kill on the very screen that needs the memory to render.
 */
async function downloadToPath(url: string, target: string, options: DownloadOptions = {}) {
  const temporary = `${target}.part`;
  await ReactNativeBlobUtil.fs.unlink(temporary).catch(() => undefined);

  if (options.signal?.aborted) {
    throw abortError();
  }

  const expectedBytes =
    options.expectedBytes && options.expectedBytes > 0 ? options.expectedBytes : 0;
  const lastPercent = { value: -1 };
  emitTransferProgress(0, expectedBytes, options.onProgress, lastPercent);

  const task = ReactNativeBlobUtil.config({
    path: temporary,
    overwrite: true,
    trusty: true,
    timeout: DOWNLOAD_TIMEOUT_MS,
  }).fetch('GET', url);

  let cancelled = false;
  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    try {
      task.cancel();
    } catch {
      // The task had already settled.
    }
  };

  const signal = options.signal;
  signal?.addEventListener?.('abort', cancel);

  try {
    task.progress({ count: 50 }, (received, total) => {
      const totalBytes = Number(total) > 0 ? Number(total) : expectedBytes;
      emitTransferProgress(Number(received) || 0, totalBytes, options.onProgress, lastPercent);
    });

    const response = await task;

    if (cancelled || signal?.aborted) {
      throw abortError();
    }

    const status = Number(response.info?.()?.status ?? 200);
    if (status >= 400) {
      throw statusError(status);
    }

    const stats = await ReactNativeBlobUtil.fs.stat(temporary);
    const size = Number(stats?.size) || 0;
    if (size < MIN_PDF_BYTES || !(await hasPdfHeader(temporary))) {
      throw new Error('This book file is missing or is not a valid PDF.');
    }

    if (await ReactNativeBlobUtil.fs.exists(target)) {
      await ReactNativeBlobUtil.fs.unlink(target).catch(() => undefined);
    }
    await ReactNativeBlobUtil.fs.mv(temporary, target);

    options.onProgress?.({
      loadedBytes: size,
      totalBytes: expectedBytes > 0 ? expectedBytes : size,
      percent: 100,
    });
  } catch (error) {
    await ReactNativeBlobUtil.fs.unlink(temporary).catch(() => undefined);

    if (cancelled || signal?.aborted) {
      throw abortError();
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Could not download the PDF.');
  } finally {
    signal?.removeEventListener?.('abort', cancel);
  }
}

export async function getLocalPdf(bookId: string): Promise<string | null> {
  const path = storage.getString(key(bookId));
  if (!path || !(await ReactNativeBlobUtil.fs.exists(path))) {
    if (path) storage.remove(key(bookId));
    return null;
  }
  try {
    const stats = await ReactNativeBlobUtil.fs.stat(path);
    if (!Number(stats.size) || Number(stats.size) < MIN_PDF_BYTES) {
      await ReactNativeBlobUtil.fs.unlink(path).catch(() => undefined);
      storage.remove(key(bookId));
      return null;
    }
  } catch {
    storage.remove(key(bookId));
    return null;
  }
  return path.startsWith('file://') ? path : `file://${path}`;
}

export async function resolvePdfSource(
  bookId: string,
  options: Omit<DownloadOptions, 'expectedBytes'> = {},
): Promise<BookPdfSource> {
  const local = await getLocalPdf(bookId);
  if (local) return fileSource(local);

  await ensureDirectory();
  const target = filePath(bookId);
  const { url, fileSizeBytes } = await getSignedPdfUrl(bookId);
  await downloadToPath(url, target, {
    expectedBytes: fileSizeBytes,
    onProgress: options.onProgress,
    signal: options.signal,
  });
  storage.set(key(bookId), target);
  await syncDownload(bookId, 'completed', fileSizeBytes).catch(() => undefined);
  return fileSource(target);
}

export async function downloadPdf(bookId: string, options: Omit<DownloadOptions, 'expectedBytes'> = {}) {
  await ensureDirectory();
  await syncDownload(bookId, 'pending');
  const target = filePath(bookId);
  try {
    const { url, fileSizeBytes } = await getSignedPdfUrl(bookId);
    await downloadToPath(url, target, {
      expectedBytes: fileSizeBytes,
      onProgress: options.onProgress,
      signal: options.signal,
    });
    storage.set(key(bookId), target);
    const stats = await ReactNativeBlobUtil.fs.stat(target);
    await syncDownload(bookId, 'completed', fileSizeBytes ?? Number(stats.size));
    return fileSource(target).uri;
  } catch (error) {
    await syncDownload(bookId, 'failed').catch(() => undefined);
    throw error;
  }
}

export async function removeLocalPdf(bookId: string) {
  const path = storage.getString(key(bookId));
  if (path && (await ReactNativeBlobUtil.fs.exists(path))) await ReactNativeBlobUtil.fs.unlink(path);
  storage.remove(key(bookId));
}
