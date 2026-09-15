import {
  errorCodes,
  isErrorWithCode,
  saveDocuments,
} from '@react-native-documents/picker';
import { File, Paths } from 'expo-file-system';

import { exportMyData } from '@/lib/supabase';

/**
 * Download my data.
 *
 * The backend builds the document (`my_data_export`, one JSON object of
 * everything held about the reader); this writes it to the app's cache and
 * hands it to the system "save as" sheet, so the reader picks where it goes
 * — Files, Drive, a share target. The cached copy is removed afterwards
 * either way: the only copy that should persist is the one they chose.
 *
 * `saved` is false when they dismissed the sheet; that is not an error.
 */
export async function exportMyDataToFile(): Promise<{ saved: boolean }> {
  const data = await exportMyData();

  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `ilm-o-irfan-my-data-${stamp}.json`;
  const file = new File(Paths.cache, fileName);

  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(JSON.stringify(data, null, 2));

  try {
    const result = await saveDocuments({
      sourceUris: [file.uri],
      fileName,
      mimeType: 'application/json',
      copy: true,
    });
    return { saved: result.length > 0 };
  } catch (error) {
    // The picker reports a dismissed sheet as an error code, not a result.
    if (
      isErrorWithCode(error) &&
      error.code === errorCodes.OPERATION_CANCELED
    ) {
      return { saved: false };
    }
    throw error;
  } finally {
    try {
      if (file.exists) {
        file.delete();
      }
    } catch {
      // The cache is the OS's to sweep if we could not.
    }
  }
}
