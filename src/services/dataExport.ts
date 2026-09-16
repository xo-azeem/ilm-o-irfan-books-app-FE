import { Platform, Share } from 'react-native';
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
  const { file, fileName } = await writeExportToCache();

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
    discard(file);
  }
}

/**
 * Share my data: the same document, handed to the OS share sheet instead of
 * the save-as picker — Drive, Mail, AirDrop, whatever the phone offers. iOS
 * shares the file itself; Android's sheet takes text, so the JSON goes as
 * the message. `shared` is false when the sheet was dismissed.
 */
export async function shareMyData(): Promise<{ shared: boolean }> {
  const { file, fileName, json } = await writeExportToCache();
  try {
    const result = await Share.share(
      Platform.OS === 'ios'
        ? { url: file.uri, title: fileName }
        : { message: json, title: fileName },
      { dialogTitle: 'Share my data', subject: fileName },
    );
    return { shared: result.action === Share.sharedAction };
  } finally {
    discard(file);
  }
}

async function writeExportToCache() {
  const data = await exportMyData();
  const json = JSON.stringify(data, null, 2);

  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `ilm-o-irfan-my-data-${stamp}.json`;
  const file = new File(Paths.cache, fileName);

  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(json);
  return { file, fileName, json };
}

function discard(file: File) {
  try {
    if (file.exists) {
      file.delete();
    }
  } catch {
    // The cache is the OS's to sweep if we could not.
  }
}
