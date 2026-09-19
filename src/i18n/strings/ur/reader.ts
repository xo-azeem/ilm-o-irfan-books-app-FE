import type { reader as en } from '@/i18n/strings/en/reader';

export const reader: typeof en = {
  fallbackTitle: 'کتاب',
  fileMissing:
    'اس کتاب کی فائل ہماری لائبریری میں موجود نہیں۔ آپ کی رکنیت میں کوئی خرابی نہیں — براہِ کرم اطلاع دیں، ہم اسے بحال کر دیں گے۔',
  noLongerAvailable: 'یہ کتاب اب دستیاب نہیں۔',
  unableToOpen: 'یہ کتاب نہیں کھل سکی۔',
  pdfNotDisplayed: 'یہ PDF دکھائی نہیں جا سکی۔',
  couldNotBeOpened: 'یہ کتاب نہیں کھولی جا سکی۔',
  fileUpdated:
    'اس کتاب کی فائل اپ ڈیٹ ہو گئی ہے۔ نئی فائل کھولنے کے لیے دوبارہ کوشش کریں — اور آف لائن رکھنے کے لیے دوبارہ ڈاؤن لوڈ کریں۔',
  removeDownloadTitle: 'ڈاؤن لوڈ ہٹائیں؟',
  removeDownloadMessage: title =>
    `${title} آپ کی لائبریری میں رہے گی مگر کھولنے کے لیے انٹرنیٹ درکار ہوگا۔`,
  downloadFailedTitle: 'ڈاؤن لوڈ ناکام',
  downloadFailedMessage:
    'کتاب آف لائن مطالعے کے لیے محفوظ نہیں ہو سکی۔ براہِ کرم دوبارہ کوشش کریں۔',
  showReadingControls: 'مطالعے کے کنٹرول دکھائیں',
  loadingBook: 'کتاب لوڈ ہو رہی ہے',
  closeTheBook: 'کتاب بند کریں',
  readingOptions: 'مطالعے کے اختیارات',
  pageShort: (page, total) => `صفحہ ${page} از ${total}`,
  pageStatus: (page, total, percent) =>
    `صفحہ ${page} از ${total} · ${percent}%`,
  dragHint: 'صفحہ کہیں سے بھی کھینچیں',
  error: {
    title: 'یہ صفحہ نہیں پہنچا۔',
    savedAtPage: page =>
      `آپ کا مقام صفحہ ${page} پر محفوظ ہے۔ اپنا کنکشن چیک کر کے دوبارہ کوشش کریں۔`,
    saved: 'آپ کا مقام محفوظ ہے۔ اپنا کنکشن چیک کر کے دوبارہ کوشش کریں۔',
    readDownloaded: 'ڈاؤن لوڈ شدہ صفحات پڑھیں',
  },
  locked: {
    youWereOnPage: page => `آپ صفحہ ${page} پر تھے۔ یہ محفوظ ہے۔`,
    renew: 'رکنیت کی تجدید کریں',
    backToLibrary: 'لائبریری پر واپس',
  },
  sheet: {
    title: 'مطالعہ',
    readingMode: 'مطالعے کا انداز',
    pageTone: 'صفحے کا رنگ',
    brightness: 'روشنی',
    zoom: 'زوم',
    zoomOut: 'زوم آؤٹ',
    zoomIn: 'زوم ان',
    goToPage: 'صفحے پر جائیں',
    pageRange: total => `1 – ${total}`,
    pageNumber: 'صفحہ نمبر',
    bookmarked: 'بک مارک ہو گیا',
    bookmark: 'بک مارک',
    pageN: page => `صفحہ ${page}`,
    thisPage: 'یہ صفحہ',
    downloading: 'ڈاؤن لوڈ ہو رہی ہے…',
    downloaded: 'ڈاؤن لوڈ شدہ',
    download: 'ڈاؤن لوڈ',
    preparing: 'تیاری…',
    onThisDevice: 'اس ڈیوائس پر',
    keepOffline: 'آف لائن نسخہ رکھیں',
  },
  modes: {
    flip: {
      label: 'ورق',
      tag: 'کاغذ کی طرح',
      hint: 'صفحے کاغذ کی طرح جلد پر پلٹتے ہیں',
    },
    swipe: {
      label: 'سوائپ',
      tag: 'صفحہ بہ صفحہ',
      hint: 'ایک وقت میں ایک صفحہ، کروٹ کے ساتھ',
    },
    scroll: {
      label: 'اسکرول',
      tag: 'ایک کالم',
      hint: 'پوری کتاب ایک کالم میں، جسے آپ اسکرول کرتے ہیں',
    },
  },
  tones: { paper: 'کاغذ', sepia: 'سیپیا', midnight: 'نیم شب' },
};
