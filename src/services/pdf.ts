import ReactNativeBlobUtil from 'react-native-blob-util';
import { createMMKV } from 'react-native-mmkv';

import { getBookPdfSource, type BookPdfSource } from '@/constants/books';
import { getSignedPdfUrl } from '@/lib/supabase';
import { syncDownload } from '@/services/account';

const storage = createMMKV({ id: 'ilm-offline-books' });
const directory = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/books`;

function key(bookId: string) {
  return `book:${bookId}`;
}

function filePath(bookId: string) {
  return `${directory}/${bookId}.pdf`;
}

export async function getLocalPdf(bookId: string): Promise<string | null> {
  const path = storage.getString(key(bookId));
  if (!path || !(await ReactNativeBlobUtil.fs.exists(path))) {
    if (path) storage.remove(key(bookId));
    return null;
  }
  return `file://${path}`;
}

function remoteSource(bookId: string, uri: string): BookPdfSource {
  return { uri, cache: true, cacheFileName: `${bookId}.pdf` };
}

export async function resolvePdfSource(
  bookId: string,
  options?: { allowDevBundle?: boolean },
): Promise<BookPdfSource> {
  const local = await getLocalPdf(bookId);
  if (local) return remoteSource(bookId, local);

  if (__DEV__ && options?.allowDevBundle) {
    try {
      return getBookPdfSource(bookId);
    } catch {
      // Bundled sample missing — fall through to signed URL.
    }
  }

  const { url } = await getSignedPdfUrl(bookId);
  return remoteSource(bookId, url);
}

export async function downloadPdf(bookId: string) {
  if (!(await ReactNativeBlobUtil.fs.exists(directory))) {
    await ReactNativeBlobUtil.fs.mkdir(directory);
  }
  await syncDownload(bookId, 'pending');
  const target = filePath(bookId);
  const temporary = `${target}.part`;
  try {
    const { url, fileSizeBytes } = await getSignedPdfUrl(bookId);
    await ReactNativeBlobUtil.config({ path: temporary }).fetch('GET', url);
    const stats = await ReactNativeBlobUtil.fs.stat(temporary);
    if (!Number(stats.size)) throw new Error('The downloaded PDF was empty.');
    if (await ReactNativeBlobUtil.fs.exists(target)) await ReactNativeBlobUtil.fs.unlink(target);
    await ReactNativeBlobUtil.fs.mv(temporary, target);
    storage.set(key(bookId), target);
    await syncDownload(bookId, 'completed', fileSizeBytes ?? Number(stats.size));
    return `file://${target}`;
  } catch (error) {
    if (await ReactNativeBlobUtil.fs.exists(temporary)) await ReactNativeBlobUtil.fs.unlink(temporary);
    await syncDownload(bookId, 'failed').catch(() => undefined);
    throw error;
  }
}

export async function removeLocalPdf(bookId: string) {
  const path = storage.getString(key(bookId));
  if (path && await ReactNativeBlobUtil.fs.exists(path)) await ReactNativeBlobUtil.fs.unlink(path);
  storage.remove(key(bookId));
}
