import { Platform } from 'react-native';

import defaultBookPdf from '@/assets/books/default-book.pdf';

export const DEFAULT_BOOK_PDF = defaultBookPdf;

const ANDROID_BUNDLE_PDF = 'default-book.pdf';

export type BookPdfSource =
  | number
  | {
      uri: string;
      cache?: boolean;
      cacheFileName?: string;
    };

export function getBookPdfSource(_bookId?: string): BookPdfSource {
  if (Platform.OS === 'android') {
    return {
      uri: `bundle-assets://${ANDROID_BUNDLE_PDF}`,
      cache: true,
      cacheFileName: ANDROID_BUNDLE_PDF,
    };
  }

  return DEFAULT_BOOK_PDF;
}
