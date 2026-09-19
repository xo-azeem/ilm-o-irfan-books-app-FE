import type { onboarding as en } from '@/i18n/strings/en/onboarding';

export const onboarding: typeof en = {
  welcome: {
    headline: 'علم،\nآگے بڑھایا ہوا۔',
    blurb: 'علم و عرفان کی سات دہائیوں کے شیلف، اب آپ کی جیب میں۔',
    start: 'دریافت شروع کریں',
    haveAccount: 'میرا اکاؤنٹ پہلے سے ہے',
  },
  subjects: {
    title: 'بتائیں آپ کو کیا کھینچتا ہے۔',
    subtitle: 'تین یا زیادہ چنیں۔ ہوم انہی کے گرد ترتیب پاتا ہے۔',
    readingLanguage: 'مطالعے کی زبان',
    continueChosen: chosen => `جاری رکھیں · ${chosen} منتخب`,
    pickMore: more => `${more} اور چنیں`,
    labels: {
      seerat: 'سیرت',
      tafseer: 'تفسیر',
      fiqh: 'فقہ',
      hadith: 'حدیث',
      'urdu-adab': 'اردو ادب',
      history: 'تاریخ',
      philosophy: 'فلسفہ',
      education: 'تعلیم',
      biography: 'سوانح',
      language: 'زبان',
    },
  },
  readingLanguages: {
    both: 'دونوں',
    urdu: 'اردو',
    english: 'English',
  },
  rhythm: {
    title: 'آپ کس طرح کے قاری ہیں؟',
    subtitle: 'اس سے آپ کا روزانہ ہدف اور یاد دہانی کا وقت طے ہوتا ہے۔',
    continue: 'جاری رکھیں',
    skip: 'ابھی چھوڑیں',
    options: {
      casual: { label: 'کبھی کبھار', detail: 'چند صفحے، جب دل چاہے' },
      daily: { label: 'روزانہ', detail: 'ہر روز 20 منٹ' },
      'night-owl': {
        label: 'رات کا قاری',
        detail: 'عشاء کے بعد، مدھم روشنی میں',
      },
      weekend: {
        label: 'ہفتہ وار قاری',
        detail: 'جمعہ سے اتوار تک لمبی نشستیں',
      },
      scholar: { label: 'محقق', detail: 'کئی کتابیں ایک ساتھ' },
    },
  },
};
