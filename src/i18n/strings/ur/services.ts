import type { services as en } from '@/i18n/strings/en/services';

export const services: typeof en = {
  expectedData: 'متوقع ڈیٹا واپس نہیں آیا۔',
  mustBeSignedIn: 'آپ کا سائن ان ہونا ضروری ہے۔',
  networkError:
    'سرور تک رسائی نہیں ہو سکی۔ اپنا کنکشن چیک کر کے دوبارہ کوشش کریں۔',
  requestFailed: status => `درخواست ناکام ہوئی (${status})۔`,
  couldNotComplete: 'درخواست مکمل نہیں ہو سکی۔ براہِ کرم دوبارہ کوشش کریں۔',
  couldNotLoadLibrary: 'لائبریری لوڈ نہیں ہو سکی۔',
  profileNotCreated: 'آپ کی پروفائل ابھی نہیں بنی۔',
  goalRange: (min, max) => `ہدف ${min} سے ${max} تک کا پورا عدد ہونا چاہیے۔`,
  shelves: {
    trending: {
      title: 'اس ہفتے مقبول',
      subtitle: 'ہر قاری کے لیے ایک ہی شیلف',
    },
    arrivals: { title: 'نئی آمد', subtitle: 'شیلف پر تازہ' },
  },
  book: {
    unknownAuthor: 'نامعلوم',
    digitalEdition: 'ڈیجیٹل ایڈیشن',
    readAtYourPace: 'اپنی رفتار سے پڑھیں',
    minRead: minutes => `${minutes} منٹ کا مطالعہ`,
    hourRead: hours => `${hours} گھنٹے کا مطالعہ`,
    blurbUnattributed: 'علم و عرفان کی لائبریری سے ایک فکر انگیز کتاب۔',
    blurbBy: author => `${author} کی ایک فکر انگیز کتاب۔`,
    defaultGenre: 'اسلامیات',
    pageOf: (page, total) => `صفحہ ${page} از ${total}`,
    continueReading: 'مطالعہ جاری رکھیں',
    bookmarkNote: page => `صفحہ ${page}`,
  },
  deletion: {
    requestExists: 'اس اکاؤنٹ کے لیے حذف کاری کی درخواست پہلے سے کھلی ہے۔',
    nothingToWithdraw: 'واپس لینے کے لیے کوئی حذف کاری کی درخواست نہیں۔',
    reasonTooLong: max => `وجہ ${max} حروف سے کم رکھیں۔`,
    subscriptionActive:
      'پہلے App Store یا Google Play میں اپنی رکنیت منسوخ کریں، پھر حذف کاری کی درخواست دیں۔',
    billingUnresolved:
      'اسٹور ابھی آپ کی رکنیت کی ادائیگی نمٹا رہا ہے۔ پہلے وہاں معاملہ حل کریں۔',
    adminAccount: 'ایڈمن اکاؤنٹ ایپ سے حذف نہیں کیے جا سکتے۔',
    fallback: 'درخواست مکمل نہیں ہو سکی۔',
  },
  vault: {
    notEnoughSpace:
      'اس کتاب کے لیے ڈیوائس پر کافی جگہ نہیں۔ کچھ جگہ خالی کر کے دوبارہ کوشش کریں۔',
    empty: 'اس کتاب کی فائل خالی ہے۔',
    notPdf: 'اس کتاب کی فائل PDF نہیں ہے۔',
    damaged: 'یہ ڈاؤن لوڈ خراب ہو گیا ہے۔',
  },
  pdf: {
    cancelled: 'PDF ڈاؤن لوڈ منسوخ کر دیا گیا۔',
    missing: 'اس کتاب کی فائل اسٹوریج میں موجود نہیں۔',
    downloadFailed: status => `PDF ڈاؤن لوڈ نہیں ہو سکی (${status})۔`,
    invalid: 'اس کتاب کی فائل موجود نہیں یا درست PDF نہیں ہے۔',
    incomplete: 'کتاب پوری ڈاؤن لوڈ نہیں ہوئی۔ براہِ کرم دوبارہ کوشش کریں۔',
    couldNotDownload: 'PDF ڈاؤن لوڈ نہیں ہو سکی۔',
  },
  avatar: {
    tooLarge: 'یہ تصویر 5 MB سے بڑی ہے۔ چھوٹی تصویر چنیں۔',
    uploadFailed: status => `تصویر اپ لوڈ نہیں ہو سکی (${status})۔`,
    pathMissing: 'سرور نے نہیں بتایا کہ تصویر کہاں رکھنی ہے۔',
  },
  export: { shareTitle: 'میرا ڈیٹا شیئر کریں' },
  billing: {
    cannotPurchase: 'اس بلڈ میں رکنیت نہیں خریدی جا سکتی۔',
    unavailableIos:
      'اس Apple ID / ڈیوائس پر خریداریاں دستیاب نہیں (Screen Time یا Ask to Buy چیک کریں)۔',
    unavailableAndroid:
      'اس Google Play اکاؤنٹ / ڈیوائس پر خریداریاں دستیاب نہیں۔',
    cannotRestore: 'اس بلڈ میں خریداریاں بحال نہیں کی جا سکتیں۔',
    purchaseFailed: 'خریداری مکمل نہیں ہو سکی۔ براہِ کرم دوبارہ کوشش کریں۔',
  },
  admin: {
    nothingInWindow: 'اس مدت میں ابھی کچھ درج نہیں۔',
    fetchingLink: 'دستخط شدہ لنک حاصل کیا جا رہا ہے…',
  },
  loading: 'لوڈ ہو رہا ہے',
};
