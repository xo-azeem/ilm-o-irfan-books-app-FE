import ReactNativeBlobUtil from 'react-native-blob-util';

import { env } from '@/config/env';

import { supabase } from './client';
import { COVER_MAX_BYTES, PDF_MAX_BYTES, slugify } from './types';

export type UploadProgress = (fraction: number) => void;

type Bucket = 'covers' | 'pdfs';

function extensionFor(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('avif')) return 'avif';
  return 'jpg';
}

function localPath(uri: string): string {
  return decodeURI(uri.replace(/^file:\/\//, ''));
}

/**
 * Streams the file straight to Storage. The shared supabase-js client aborts
 * after 12s and buffers the whole body in memory, neither of which survives a
 * 100 MB PDF, so uploads go through the native HTTP layer instead.
 */
async function uploadFile(
  bucket: Bucket,
  objectPath: string,
  fileUri: string,
  contentType: string,
  onProgress?: UploadProgress,
): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Your session expired. Sign in again to upload.');
  }

  const endpoint = `${env.supabaseUrl}/storage/v1/object/${bucket}/${encodeURIComponent(objectPath)}`;

  const task = ReactNativeBlobUtil.fetch(
    'POST',
    endpoint,
    {
      Authorization: `Bearer ${token}`,
      apikey: env.supabaseAnonKey,
      'Content-Type': contentType,
      'x-upsert': 'true',
      'cache-control': '3600',
    },
    ReactNativeBlobUtil.wrap(localPath(fileUri)),
  );

  if (onProgress) {
    task.uploadProgress({ interval: 150 }, (written, total) => {
      onProgress(total > 0 ? Math.min(written / total, 1) : 0);
    });
  }

  const response = await task;
  const status = response.info().status;

  if (status < 200 || status >= 300) {
    let message = `Upload failed (${status}).`;
    try {
      const parsed = JSON.parse(response.data) as { message?: string; error?: string };
      message = parsed.message ?? parsed.error ?? message;
    } catch {
      // Non-JSON error body; the status message is enough.
    }
    throw new Error(message);
  }

  onProgress?.(1);
  return `${bucket}/${objectPath}`;
}

export async function uploadAdminCover(
  localUri: string,
  slug: string,
  mime = 'image/jpeg',
  onProgress?: UploadProgress,
): Promise<string> {
  const name = slugify(slug) || 'cover';
  const objectPath = `${name}-${Date.now()}.${extensionFor(mime)}`;
  return uploadFile('covers', objectPath, localUri, mime, onProgress);
}

export async function uploadAdminAvatar(
  localUri: string,
  slug: string,
  mime = 'image/jpeg',
  onProgress?: UploadProgress,
): Promise<string> {
  const name = slugify(slug) || 'author';
  const objectPath = `authors/${name}-${Date.now()}.${extensionFor(mime)}`;
  return uploadFile('covers', objectPath, localUri, mime, onProgress);
}

export async function uploadAdminPdf(
  localUri: string,
  slug: string,
  sizeBytes?: number | null,
  onProgress?: UploadProgress,
): Promise<{ path: string; sizeBytes: number | null }> {
  const name = slugify(slug) || 'book';
  const objectPath = `${name}-${Date.now()}.pdf`;
  const path = await uploadFile('pdfs', objectPath, localUri, 'application/pdf', onProgress);

  let resolvedSize = sizeBytes ?? null;
  if (resolvedSize == null) {
    try {
      const stat = await ReactNativeBlobUtil.fs.stat(localPath(localUri));
      resolvedSize = Number(stat.size) || null;
    } catch {
      // Size is optional metadata; the reader probes Content-Length too.
    }
  }

  return { path, sizeBytes: resolvedSize };
}

/** Removes a storage object the editor replaced or abandoned. */
export async function removeStoragePath(path: string | null | undefined) {
  if (!path) return;
  const [bucket, ...rest] = path.split('/');
  if (bucket !== 'covers' && bucket !== 'pdfs') return;
  const objectName = rest.join('/');
  if (!objectName) return;
  await supabase.storage.from(bucket).remove([objectName]);
}

export function validateCoverSize(bytes: number | undefined): string | null {
  if (bytes && bytes > COVER_MAX_BYTES) {
    return `Covers must be ${Math.round(COVER_MAX_BYTES / 1024 / 1024)} MB or smaller.`;
  }
  return null;
}

export function validatePdfSize(bytes: number | undefined | null): string | null {
  if (bytes && bytes > PDF_MAX_BYTES) {
    return `PDFs must be ${Math.round(PDF_MAX_BYTES / 1024 / 1024)} MB or smaller.`;
  }
  return null;
}
