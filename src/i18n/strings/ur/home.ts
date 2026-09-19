import type { access as enAccess, home as en } from '@/i18n/strings/en/home';

export const home: typeof en = {
  greeting: {
    stillAwake: 'ابھی تک جاگ رہے ہیں',
    morning: 'صبح بخیر',
    afternoon: 'دوپہر بخیر',
    evening: 'شام بخیر',
  },
  greetingWithName: (greeting, name) => `${greeting}، ${name}`,
  readyForAnotherChapter: 'ایک اور باب کے لیے تیار؟',
  notifications: 'اطلاعات',
  yourProfile: 'آپ کی پروفائل',
  discovery: 'دریافت',
  personalised: 'آپ کے لیے',
  coldStart: {
    title: 'آج کل مقبول',
    subtitle: 'جہاں سے دوسرے قاری شروع کر رہے ہیں',
  },
  seeMembershipPlans: 'رکنیت کے پلان دیکھیں',
  seePlansFrom: (price, interval) =>
    `پلان دیکھیں، ${price}${interval ? ` / ${interval}` : ''} سے شروع`,
  couldNotLoadCatalog: 'کیٹلاگ لوڈ نہیں ہو سکا۔',
  serverDidNotRespond:
    'سرور نے جواب نہیں دیا۔ اپنا کنکشن چیک کریں، پھر دوبارہ کوشش کریں۔',
  nothingWasLost: 'کچھ ضائع نہیں ہوا۔ اپنا کنکشن چیک کر کے دوبارہ کوشش کریں۔',
  continueReading: 'مطالعہ جاری رکھیں',
  allCount: count => `تمام ${count}`,
  curatedCollections: 'منتخب مجموعے',
  curatedSubtitle: 'ہمارے مدیروں کی ترتیب دی ہوئی مطالعاتی راہیں',
  featuredOf: (index, count) => `نمایاں ${index} از ${count}`,
  readNow: 'ابھی پڑھیں',
  coverCaption: title => `سرورق · ${title}`,
  removeFromWishlist: 'خواہش کی فہرست سے ہٹائیں',
  saveForLater: 'بعد کے لیے محفوظ کریں',
  membershipBand: 'لامحدود مطالعہ، ایک رکنیت',
  keepAccessUntil: date => `${date} تک آپ کی مکمل رسائی برقرار رہے گی۔`,
  mood: {
    title: 'آج رات آپ کیسا پڑھنا چاہتے ہیں؟',
    labels: {
      Reflective: 'فکر انگیز',
      Curious: 'متجسس',
      Focused: 'یکسو',
      Calm: 'پُرسکون',
    },
    replies: {
      Reflective: 'آج رات گہرے پانی ہیں۔ آہستہ چلیں۔',
      Curious: 'اچھا، تو آپ متجسس ہیں۔ شروعات ایسے ہی ہوتی ہے۔',
      Focused: 'یکسوئی سہی۔ فون الٹا رکھ دیں، مہربانی۔',
      Calm: 'پُرسکون۔ سمجھیں چائے بن گئی۔',
    },
  },
};

export const access: typeof enAccess = {
  reasons: {
    active: {
      title: 'رکنیت فعال ہے',
      message: 'آپ کو پوری لائبریری تک مکمل رسائی حاصل ہے۔',
    },
    admin: {
      title: 'عملے کی رسائی',
      message: 'آپ رکنیت کے ساتھ یا اس کے بغیر، کوئی بھی کتاب کھول سکتے ہیں۔',
    },
    trial: {
      title: 'آپ آزمائشی مدت میں ہیں',
      message:
        'پوری لائبریری سے لطف اٹھائیں۔ آزمائش ختم ہونے کی تاریخ رکنیت میں درج ہے۔',
    },
    grace: {
      title: 'ہم آپ کی ادائیگی دوبارہ آزما رہے ہیں',
      message: 'پڑھتے رہیں — دوبارہ کوشش کے دوران کچھ بھی رکتا نہیں۔',
    },
    billing_issue_paid_through: {
      title: 'آپ کے کارڈ پر توجہ درکار ہے',
      message:
        'آپ کی رکنیت موجودہ مدت کے لیے ادا شدہ ہے، اس لیے پڑھتے رہیں۔ رسائی برقرار رکھنے کے لیے اپنا کارڈ اپ ڈیٹ کریں۔',
    },
    cancelled_paid_through: {
      title: 'آپ کی رکنیت ختم ہونے والی ہے',
      message:
        'ختم ہونے تک آپ کی مکمل رسائی برقرار رہے گی۔ اس کے بعد جاری رکھنے کے لیے کبھی بھی دوبارہ رکنیت لیں۔',
    },
    lapsed: {
      title: 'آپ کی رکنیت ختم ہو گئی ہے',
      message:
        'تجدید کریں اور وہیں سے شروع کریں جہاں چھوڑا تھا — آپ کی لائبریری جوں کی توں ہے۔',
    },
    expired: {
      title: 'آپ کی رکنیت ختم ہو گئی ہے',
      message:
        'تجدید کریں اور وہیں سے شروع کریں جہاں چھوڑا تھا — آپ کی لائبریری جوں کی توں ہے۔',
    },
    none: {
      title: 'پوری لائبریری پڑھیں',
      message: 'علم و عرفان کی ہر کتاب رکنیت میں شامل ہے۔',
    },
  },
};
