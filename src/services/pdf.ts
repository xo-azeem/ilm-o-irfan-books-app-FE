import ReactNativeBlobUtil from 'react-native-blob-util';

/**
 * The network half of getting a book onto the device.
 *
 * Nothing here decides where a book lives or for how long — that is the
 * vault's job (see `bookVault`). This module only knows how to stream a
 * signed URL to a path without the bytes passing through JavaScript, and how
 * to tell a PDF from an error page that arrived with a 200.
 */

const DOWNLOAD_TIMEOUT_MS = 120000;
/** Anything smaller than this cannot be a PDF, header or not. */
export const MIN_PDF_BYTES = 32;

export type PdfTransferProgress = {
  loadedBytes: number;
  totalBytes: number;
  percent: number;
};

export type DownloadOptions = {
  expectedBytes?: number;
  onProgress?: (progress: PdfTransferProgress) => void;
  signal?: AbortSignal;
};

export function abortError() {
  return Object.assign(new Error('The PDF download was cancelled.'), {
    name: 'AbortError',
  });
}

export function isAbortError(error: unknown): boolean {
  return (error as { name?: string } | null)?.name === 'AbortError';
}

function statusError(status: number) {
  return new Error(
    status === 400 || status === 404
      ? 'This book file is missing from storage.'
      : `Could not download the PDF (${status}).`,
  );
}

/** `%PDF` — the four bytes every PDF opens with. */
export function isPdfHeader(bytes: ArrayLike<number>): boolean {
  return (
    bytes.length >= 4 &&
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
    const bytes = (await ReactNativeBlobUtil.fs.readFile(
      probe,
      'ascii',
    )) as number[];
    return isPdfHeader(bytes ?? []);
  } catch {
    // If the platform cannot slice the file, trust the download and let the
    // renderer report a real problem rather than blocking a good book.
    return true;
  } finally {
    await ReactNativeBlobUtil.fs.unlink(probe).catch(() => undefined);
  }
}

/**
 * What a book is assumed to weigh when nobody says. A transfer with no
 * `Content-Length` and no size from the signing call still has to move the
 * ring, so its bytes are read against a typical book and capped short of the
 * end — the final 100 is only ever drawn by the file landing whole.
 */
const ASSUMED_BOOK_BYTES = 25_000_000;
const UNKNOWN_TOTAL_CEILING = 90;

function emitTransferProgress(
  loadedBytes: number,
  totalBytes: number,
  onProgress: ((progress: PdfTransferProgress) => void) | undefined,
  lastPercent: { value: number },
) {
  if (!onProgress) {
    return;
  }

  if (totalBytes <= 0) {
    // An estimate that climbs quickly at first and flattens as the bytes pass
    // what a book usually is, so a large one does not stall at the cap early.
    const percent = Math.min(
      UNKNOWN_TOTAL_CEILING,
      Math.floor(
        UNKNOWN_TOTAL_CEILING *
          (1 - Math.exp(-loadedBytes / ASSUMED_BOOK_BYTES)),
      ),
    );
    if (percent === lastPercent.value) {
      return;
    }
    lastPercent.value = percent;
    onProgress({ loadedBytes, totalBytes: 0, percent });
    return;
  }

  const ratio = Math.max(0, Math.min(1, loadedBytes / totalBytes));
  const percent =
    loadedBytes >= totalBytes ? 100 : Math.min(99, Math.floor(ratio * 100));
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
 *
 * `target` is a plain filesystem path (no `file://`). The download lands in a
 * `.part` beside it and is only moved into place once it has been checked, so
 * a path that exists is always a whole, valid PDF.
 */
export async function downloadToPath(
  url: string,
  target: string,
  options: DownloadOptions = {},
): Promise<number> {
  const temporary = `${target}.part`;
  await ReactNativeBlobUtil.fs.unlink(temporary).catch(() => undefined);

  if (options.signal?.aborted) {
    throw abortError();
  }

  const expectedBytes =
    options.expectedBytes && options.expectedBytes > 0
      ? options.expectedBytes
      : 0;
  const lastPercent = { value: -1 };
  emitTransferProgress(0, expectedBytes, options.onProgress, lastPercent);

  // No `trusty`. In react-native-blob-util 0.24 that flag does not mean "accept
  // any certificate" — it means "use the trust manager the app registered
  // natively", and with none registered the request throws before a byte moves
  // ("Use of own trust manager but none defined"), which took every
  // not-yet-downloaded book down with it. The signed URL is on Supabase
  // Storage behind a public certificate; the platform's own trust store is the
  // right one, and the only one that verifies the host.
  const task = ReactNativeBlobUtil.config({
    path: temporary,
    overwrite: true,
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
    // Every percent, but never more often than the ring can be seen to move.
    task.progress({ count: 100, interval: 120 }, (received, total) => {
      const totalBytes = Number(total) > 0 ? Number(total) : expectedBytes;
      emitTransferProgress(
        Number(received) || 0,
        totalBytes,
        options.onProgress,
        lastPercent,
      );
    });

    const response = await task;

    if (cancelled || signal?.aborted) {
      throw abortError();
    }

    const status = Number(response.info?.()?.status ?? 200);
    if (status >= 400) {
      if (__DEV__) {
        // The error body landed in the temp file. Small, and worth reading in
        // development: Storage says *why* in it, and the status alone does not.
        const body = await ReactNativeBlobUtil.fs
          .readFile(temporary, 'utf8')
          .catch(() => '');
        console.warn(
          `[pdf] download ${status} for ${url.split('?')[0]}: ${String(body).slice(0, 300)}`,
        );
      }
      throw statusError(status);
    }

    const stats = await ReactNativeBlobUtil.fs.stat(temporary);
    const size = Number(stats?.size) || 0;
    if (size < MIN_PDF_BYTES || !(await hasPdfHeader(temporary))) {
      throw new Error('This book file is missing or is not a valid PDF.');
    }
    // A server that reported a size and then sent fewer bytes sent a
    // truncated book. Pdfium would open it and fail on the missing page.
    if (expectedBytes > 0 && size < expectedBytes) {
      throw new Error(
        'The book did not download completely. Please try again.',
      );
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
    return size;
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
