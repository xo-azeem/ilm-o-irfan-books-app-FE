import ReactNativeBlobUtil from 'react-native-blob-util';
import { createMMKV } from 'react-native-mmkv';

import type { BookPdfSource } from '@/constants/books';
import { getSignedPdfUrl } from '@/lib/supabase';
import { syncDownload } from '@/services/account';

const storage = createMMKV({ id: 'ilm-offline-books' });
const directory = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/books`;
const WRITE_SLICE = 16 * 1024;
const BASE64_APPLY = 256;

function key(bookId: string) {
  return `book:${bookId}`;
}

function filePath(bookId: string) {
  return `${directory}/${bookId}.pdf`;
}

/**
 * The slice of the streaming-response API this download path uses. Declared
 * structurally because `ReadableStream` lives in TypeScript's DOM lib, which a
 * React Native project does not include.
 */
type ByteStreamResponse = {
  body?: {
    getReader(): {
      read(): Promise<{ done: false; value: Uint8Array } | { done: true; value?: undefined }>;
    };
  } | null;
};

/** The local-file member of the union, so callers can read `.uri` directly. */
type LocalPdfSource = Extract<BookPdfSource, { uri: string }>;

function fileSource(path: string): LocalPdfSource {
  return { uri: path.startsWith('file://') ? path : `file://${path}` };
}

function isPdfHeader(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += BASE64_APPLY) {
    const slice = bytes.subarray(i, Math.min(i + BASE64_APPLY, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(slice) as unknown as number[]);
  }
  return btoa(binary);
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

function parseSizeFromHeaders(headers: { get(name: string): string | null }) {
  const range = headers.get('Content-Range') ?? headers.get('content-range') ?? '';
  const rangeMatch = /\/(\d+)\s*$/.exec(range);
  if (rangeMatch) {
    const size = Number(rangeMatch[1]);
    if (Number.isFinite(size) && size > 0) return size;
  }

  const length = Number(headers.get('Content-Length') ?? headers.get('content-length') ?? '');
  return Number.isFinite(length) && length > 0 ? length : 0;
}

async function appendBytes(path: string, bytes: Uint8Array) {
  for (let i = 0; i < bytes.length; i += WRITE_SLICE) {
    const slice = bytes.subarray(i, Math.min(i + WRITE_SLICE, bytes.length));
    await ReactNativeBlobUtil.fs.appendFile(path, bytesToBase64(slice), 'base64');
  }
}

function takeHeader(current: Uint8Array, incoming: Uint8Array) {
  if (current.length >= 5) return current;
  const next = new Uint8Array(Math.min(5, current.length + incoming.byteLength));
  next.set(current);
  next.set(incoming.subarray(0, next.length - current.length), current.length);
  return next;
}

async function downloadToPath(url: string, target: string, options: DownloadOptions = {}) {
  const temporary = `${target}.part`;
  if (await ReactNativeBlobUtil.fs.exists(temporary)) {
    await ReactNativeBlobUtil.fs.unlink(temporary);
  }

  let response: Response;
  try {
    response = await fetch(url, { signal: options.signal });
  } catch (error) {
    if (options.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw abortError();
    }
    const message = error instanceof Error ? error.message : 'Network request failed';
    throw new Error(`Could not download the PDF. ${message}`);
  }

  if (!response.ok) {
    throw statusError(response.status);
  }

  const expectedBytes =
    (options.expectedBytes && options.expectedBytes > 0 ? options.expectedBytes : 0) ||
    parseSizeFromHeaders(response.headers);
  const lastPercent = { value: -1 };
  emitTransferProgress(0, expectedBytes, options.onProgress, lastPercent);

  await ReactNativeBlobUtil.fs.writeFile(temporary, '', 'utf8');

  try {
    const streamed = (response as unknown as ByteStreamResponse).body;
    const reader = streamed?.getReader();
    let loaded = 0;
    let header: Uint8Array = new Uint8Array(0);

    const consume = async (chunk: Uint8Array) => {
      header = takeHeader(header, chunk);
      if (header.length >= 5 && !isPdfHeader(header)) {
        throw new Error('This book file is missing or is not a valid PDF.');
      }
      await appendBytes(temporary, chunk);
      loaded += chunk.byteLength;
      emitTransferProgress(loaded, expectedBytes, options.onProgress, lastPercent);
    };

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await consume(value);
      }
    } else {
      await consume(new Uint8Array(await response.arrayBuffer()));
    }

    if (!isPdfHeader(header)) {
      throw new Error('This book file is missing or is not a valid PDF.');
    }

    if (await ReactNativeBlobUtil.fs.exists(target)) await ReactNativeBlobUtil.fs.unlink(target);
    await ReactNativeBlobUtil.fs.mv(temporary, target);

    const total = expectedBytes > 0 ? expectedBytes : loaded;
    options.onProgress?.({ loadedBytes: loaded, totalBytes: total, percent: 100 });
  } catch (error) {
    await ReactNativeBlobUtil.fs.unlink(temporary).catch(() => undefined);
    throw error;
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
    if (!Number(stats.size) || Number(stats.size) < 5) {
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
