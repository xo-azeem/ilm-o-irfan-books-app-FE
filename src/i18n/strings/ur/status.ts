import type {
  push as enPush,
  status as en,
  tabs as enTabs,
} from '@/i18n/strings/en/status';

export const status: typeof en = {
  defaultMaintenance:
    'ہم لائبریری پر تھوڑا سا کام کر رہے ہیں۔ یہ جلد واپس آ جائے گی — آپ کی کتابیں، پیش رفت اور ڈاؤن لوڈ بالکل وہیں ہیں جہاں آپ نے چھوڑے تھے۔',
  signOutFirst: 'پہلے سائن آؤٹ کریں؟',
  signOutFirstMessage: email =>
    `اس فون پر ${email} سائن ان ہے۔ ایڈمن سائن ان اس اکاؤنٹ کو سائن آؤٹ کر دے گا؛ لائبریری کھلنے پر یہ دوبارہ سائن ان ہو سکتا ہے۔`,
  keepIt: 'رہنے دیں',
  signOutAndContinue: 'سائن آؤٹ کر کے جاری رکھیں',
  appStore: 'App Store',
  playStore: 'Play Store',
  openStore: store => `${store} کھولیں`,
  searchInStore: store =>
    `${store} میں “Ilm o Irfan” تلاش کریں اور Update دبائیں۔`,
  mailSubject: 'Ilm o Irfan',
  noMailApp: 'کوئی میل ایپ نہیں ملی',
  writeToUs: email => `ہمیں ${email} پر لکھیں۔`,
  backInAMoment: 'ابھی واپس آتے ہیں۔',
  newerApp: 'نئی ایپ آپ کی منتظر ہے۔',
  stillClosed: time =>
    ` ابھی بھی بند ہے — ${time} پر چیک کیا۔ لائبریری واپس آتے ہی یہ صفحہ خود بخود کھل جائے گا۔`,
  unsupported: version =>
    `یہ ورژن (${version}) اب سپورٹ نہیں کیا جاتا۔ پڑھتے رہنے کے لیے اپ ڈیٹ کریں — آپ کی کتابیں، پیش رفت اور ڈاؤن لوڈ ساتھ چلتے ہیں۔`,
  checking: 'جانچ ہو رہی ہے…',
  tryAgain: 'دوبارہ کوشش کریں',
  updateApp: 'ایپ اپ ڈیٹ کریں',
  contactSupport: 'سپورٹ سے رابطہ کریں',
  footer: (email, version) => `${email} · ورژن ${version}`,
  adminSignIn: 'ایڈمن سائن ان',
  adminSignInHint: 'ایڈمن اکاؤنٹس کے لیے سائن ان اسکرین کھولتا ہے',
};

export const tabs: typeof enTabs = {
  home: 'ہوم',
  discover: 'دریافت',
  library: 'لائبریری',
  profile: 'پروفائل',
};

export const push: typeof enPush = {
  dismiss: 'اطلاع بند کریں',
};
