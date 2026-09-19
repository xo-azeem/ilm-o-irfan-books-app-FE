import type { profile as en } from '@/i18n/strings/en/profile';

export const profile: typeof en = {
  yourReadingRecord: 'آپ کا مطالعاتی ریکارڈ',
  recordStartsHere: 'آپ کا ریکارڈ یہاں سے شروع ہوتا ہے۔',
  recordSignIn:
    'سائن ان کریں تاکہ آپ کا سلسلہ، مکمل کی ہوئی کتابیں اور مطالعے کا وقت ہر ڈیوائس پر محفوظ رہے۔',
  reader: 'قاری',
  memberSince: year => `${year} سے رکن`,
  plan: { admin: 'ایڈمن', premium: 'پریمیم', free: 'مفت' },
  stats: {
    booksFinished: 'کتابیں\nمکمل',
    pagesBookmarked: 'صفحات\nبک مارک',
    booksOffline: 'کتابیں\nآف لائن',
  },
  streak: {
    days: count => (count === 1 ? '1 دن' : `${count} دن`),
    label: 'مطالعے کا سلسلہ',
    longest: longest => `مطالعے کا سلسلہ · طویل ترین ${longest}`,
  },
  goal: {
    title: 'اس مہینے کا ہدف',
    count: (completed, target) => `${completed} / ${target} کتابیں`,
    changeGoal: count => `${count}۔ ہدف بدلیں`,
    reached: 'ہدف پورا ہو گیا۔ اس مہینے اب جو بھی پڑھیں وہ بونس ہے۔',
    remaining: remaining => `اس مہینے کے ہدف تک ${remaining} اور باقی ہیں۔`,
    couldNotSave: 'ہدف محفوظ نہیں ہو سکا',
    save: 'ہدف محفوظ کریں',
    fewer: 'کم کتابیں',
    more: 'زیادہ کتابیں',
    perMonth: count => (count === 1 ? 'کتاب فی مہینہ' : 'کتابیں فی مہینہ'),
    alreadyDone: completed =>
      `آپ اس مہینے پہلے ہی ${completed} مکمل کر چکے ہیں — محفوظ کرتے ہی یہ ہدف پورا ہو جائے گا۔`,
    soFar: (completed, more) =>
      `اس مہینے اب تک ${completed} مکمل۔ ${more} اور سے یہ ہدف پورا ہو جائے گا۔`,
  },
  achievements: {
    title: 'اعزازات',
    earnedOf: (earned, total) => `${total} میں سے ${earned}`,
    progress: (current, target) => `${target} میں سے ${current}`,
    locked: 'مقفل',
    medal: label => `${label} تمغہ`,
    names: {
      'first-book': 'پہلی کتاب',
      'streak-7': 'ہفتے کا سلسلہ',
      'books-25': '25 کتابیں',
      'night-reader': 'رات کا قاری',
    },
  },
  adminCard: {
    title: 'آپ ایپ کو قاری کے طور پر استعمال کر رہے ہیں',
    body: 'یہ ایڈمن اکاؤنٹ ہے، اس لیے ہر کتاب بغیر رکنیت کھلتی ہے۔ قارئین کو وہاں پے وال نظر آتا ہے جہاں آپ کو نہیں۔',
    back: 'ایڈمن پینل پر واپس',
  },
  signOut: {
    button: 'سائن آؤٹ',
    title: 'سائن آؤٹ کریں؟',
    body: 'آپ کا سلسلہ، مکمل کی ہوئی کتابیں اور ڈاؤن لوڈ آپ کے اکاؤنٹ میں محفوظ رہتے ہیں۔ جب چاہیں دوبارہ سائن ان کر کے وہیں سے شروع کریں۔',
  },
  settings: {
    title: 'ترتیبات',
    groups: { account: 'اکاؤنٹ', preferences: 'ترجیحات', support: 'معاونت' },
    rows: {
      personal: 'ذاتی تفصیلات',
      subscription: 'رکنیت',
      downloads: 'ڈاؤن لوڈز',
      notifications: 'اطلاعات',
      appearance: 'ظاہری شکل',
      language: 'زبان',
      help: 'مدد',
      privacy: 'رازداری و تحفظ',
    },
    on: 'آن',
  },
  appearance: {
    title: 'ظاہری شکل',
    subtitle: 'اس ڈیوائس پر ایپ کیسی نظر آئے، یہ چنیں۔',
    themes: { light: 'روشن', dark: 'تاریک', system: 'سسٹم' },
    textSize: 'حروف کا سائز',
    appTextSize: 'ایپ کے حروف کا سائز',
    appliedEverywhere: 'ہر اسکرین پر لاگو',
    textSizeA11y: label => `${label} حروف کا سائز`,
    scales: {
      small: 'چھوٹا',
      default: 'طے شدہ',
      large: 'بڑا',
      xlarge: 'سب سے بڑا',
    },
    readingDefaults: 'مطالعے کی ترتیبات',
    pageTone: 'صفحے کا رنگ',
    pageToneHint: 'ہر کتاب پر لاگو جو آپ کھولیں',
    pageToneA11y: label => `${label} صفحے کا رنگ`,
    readingMode: 'مطالعے کا انداز',
    keepAwake: 'اسکرین جاگتی رکھیں',
    keepAwakeHint: 'جب تک کتاب کھلی ہو',
  },
  notifications: {
    title: 'اطلاعات',
    subtitle: 'چنیں کہ آپ کی ڈیوائس تک کیا پہنچے۔',
    unavailableTitle: 'اس بلڈ میں اطلاعات دستیاب نہیں۔',
    unavailableBody:
      'ایپ کا یہ نسخہ Firebase پروجیکٹ فائل کے بغیر بنایا گیا ہے۔',
    deniedTitle: 'علم و عرفان کی اطلاعات بند ہیں۔',
    deniedBody:
      'جب تک آپ اپنی ڈیوائس کی ترتیبات میں اس ایپ کے لیے اطلاعات آن نہ کریں، نیچے دی گئی کوئی چیز آپ تک نہیں پہنچے گی۔',
    openSettings: 'ترتیبات کھولیں',
    askTitle: 'نئی کتابوں کی خبر پانے کے لیے اطلاعات کی اجازت دیں۔',
    askBody:
      'آپ کی ڈیوائس ایک بار پوچھے گی۔ آپ کبھی بھی اس کی ترتیبات میں فیصلہ بدل سکتے ہیں۔',
    turnOn: 'آن کریں',
    library: 'لائبریری',
    newBooks: 'نئی کتابیں اور مجموعے',
    newBooksHint: 'جب نئی کتابیں یا کوئی نیا مجموعہ آئے',
    changes: 'میری کتابوں میں تبدیلیاں',
    changesHint: 'جب آپ کی کوئی کتاب ہٹے، اپ ڈیٹ ہو یا اس کا نیا ایڈیشن آئے',
    changesSignIn: 'اپنی کتابوں کی تبدیلیوں کی خبر پانے کے لیے سائن ان کریں',
    account: 'اکاؤنٹ',
    membership: 'رکنیت',
    membershipHint: 'جب آپ کی رکنیت شروع یا ختم ہو',
    membershipSignIn: 'اپنی رکنیت کی خبر پانے کے لیے سائن ان کریں',
    footer:
      'اس ڈیوائس کی نوٹیفکیشن ٹرے میں پہنچتی ہیں۔ ہر قسم کی آواز اور اہمیت آپ کی ڈیوائس کی نوٹیفکیشن ترتیبات میں بدلی جا سکتی ہے۔',
  },
  downloads: {
    title: 'ڈاؤن لوڈز',
    oneOffline: 'ایک کتاب آف لائن دستیاب ہے۔',
    manyOffline: count => `${count} کتابیں آف لائن دستیاب ہیں۔`,
    emptyTitle: 'ابھی کچھ محفوظ نہیں۔',
    emptyMessage:
      'کوئی کتاب کھول کر اس کے مینو سے ڈاؤن لوڈ چنیں؛ وہ یہاں، اس ڈیوائس پر محفوظ اور بغیر انٹرنیٹ تیار ملے گی۔',
    backToProfile: 'پروفائل پر واپس',
    used: size => `${size} استعمال شدہ`,
    ofLimit: size => `${size} کی حد میں سے`,
    autoRemoved: 'مکمل کی ہوئی کتابیں 30 دن بعد خود بخود ہٹا دی جاتی ہیں۔',
    removeAll: 'تمام ڈاؤن لوڈ ہٹائیں',
    removeTitle: 'ڈاؤن لوڈ ہٹائیں؟',
    removeMessage: title =>
      `${title} آپ کی لائبریری میں رہے گی مگر کھولنے کے لیے انٹرنیٹ درکار ہوگا۔`,
    removeAllTitle: 'تمام ڈاؤن لوڈ ہٹائیں؟',
    removeAllMessage:
      'ہر کتاب آپ کی لائبریری میں رہے گی، مگر انہیں کھولنے کے لیے انٹرنیٹ درکار ہوگا۔',
    downloadingPercent: percent => `ڈاؤن لوڈ ہو رہی ہے · ${percent}%`,
    cancelDownloadOf: title => `${title} کا ڈاؤن لوڈ منسوخ کریں`,
    removeFromDownloads: title => `${title} کو ڈاؤن لوڈز سے ہٹائیں`,
    availableOffline: size => `${size} · آف لائن دستیاب`,
    notOnDevice: size => `${size} · اس ڈیوائس پر نہیں`,
    gb: value => `${value} GB`,
    mb: value => `${value} MB`,
  },
  help: {
    title: 'مدد',
    searchPlaceholder: 'مدد کے موضوعات تلاش کریں',
    nothingMatched: query =>
      `“${query}” سے کچھ نہیں ملا۔ کوئی اور لفظ آزمائیں، یا نیچے ہمیں ای میل کریں۔`,
    emailA11y: email => `${email} کو ای میل کریں`,
    stillStuck: 'اب بھی مسئلہ ہے؟',
    replyTime: '24 گھنٹے میں جواب',
    emailUs: 'ای میل کریں',
    about: 'ایپ کے بارے میں',
    version: 'ورژن',
    build: 'بلڈ',
    platform: 'پلیٹ فارم',
    rateApp: 'ایپ کو ریٹ کریں',
    subject: 'Ilm o Irfan support',
    noMailApp: 'کوئی میل ایپ نہیں',
    writeToUs: email => `ہمیں ${email} پر لکھیں۔`,
    storeFailed: 'اسٹور نہیں کھل سکا',
    storeFallback: 'براہِ کرم اپنے ایپ اسٹور میں Ilm o Irfan تلاش کریں۔',
    topics: [
      {
        question: 'آف لائن مطالعے کے لیے کتابیں کیسے ڈاؤن لوڈ کروں؟',
        answer:
          'کوئی بھی کتاب کھولیں اور ریڈر اسکرین پر ڈاؤن لوڈ کا نشان دبائیں۔ ڈاؤن لوڈ شدہ کتابیں پروفائل ← ڈاؤن لوڈز میں نظر آتی ہیں۔',
      },
      {
        question: 'کیا میرا مطالعہ مختلف ڈیوائسز پر ہم آہنگ رہتا ہے؟',
        answer:
          'جی ہاں۔ ہر ڈیوائس پر ایک ہی اکاؤنٹ سے سائن ان کریں، آپ کا مطالعاتی مقام، بک مارک اور محفوظ کتابیں ہم آہنگ رہیں گی۔',
      },
      {
        question: 'اپنی رکنیت کا انتظام کیسے کروں؟',
        answer:
          'پروفائل ← رکنیت میں جا کر اپنا پلان، تجدید کی تاریخ اور ادائیگی کے اختیارات دیکھیں۔',
      },
      {
        question: 'ایپ کی زبان کیسے بدلوں؟',
        answer:
          'پروفائل ← زبان کھولیں اور دستیاب زبانوں میں سے چنیں۔ ایپ آپ کا انتخاب فوراً لاگو کر دے گی۔',
      },
    ],
  },
  language: {
    title: 'زبان',
    subtitle: 'انٹرفیس پر فوراً لاگو ہوتی ہے۔',
    default: 'طے شدہ',
    note: 'کتابوں کے عنوان اور صفحات ہمیشہ اپنے ہی رسم الخط میں نظر آتے ہیں، انٹرفیس کی زبان کچھ بھی ہو۔',
  },
};
