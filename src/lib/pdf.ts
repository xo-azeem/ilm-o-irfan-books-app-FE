import ReactNativeBlobUtil from 'react-native-blob-util';

import { api } from '@/api';
import { ApiError } from '@/api/edge';
import type { BookPdfSource } from '@/constants/books';

/**
 * Fetch a short-lived signed URL and cache the PDF on device for the reader.
 */
export async function loadBookPdf(bookId: string): Promise<{
  source: BookPdfSource;
  fileSizeBytes?: number | null;
}> {
  const signed = await api.getSignedPdf(bookId);
  const dirs = ReactNativeBlobUtil.fs.dirs;
  const path = `${dirs.CacheDir}/ilm-pdf-${bookId}.pdf`;

  const exists = await ReactNativeBlobUtil.fs.exists(path);
  if (!exists) {
    const res = await ReactNativeBlobUtil.config({
      path,
      fileCache: true,
    }).fetch('GET', signed.signedUrl);

    if (res.info().status >= 400) {
      throw new ApiError(
        'PDF_DOWNLOAD_FAILED',
        'Could not download the book file',
        res.info().status,
      );
    }
  }

  try {
    await api.downloadsCreate(bookId, signed.fileSizeBytes ?? undefined);
  } catch {
    // Telemetry only — reading still works if this fails.
  }

  return {
    source: { uri: `file://${path}`, cache: true },
    fileSizeBytes: signed.fileSizeBytes,
  };
}
