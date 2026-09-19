import type { auth as en } from '@/i18n/strings/en/auth';

export const auth: typeof en = {
  email: 'ای میل',
  emailPlaceholder: 'name@example.com',
  password: 'پاس ورڈ',
  passwordPlaceholder: 'آپ کا پاس ورڈ',
  fullName: 'پورا نام',
  fullNamePlaceholder: 'آپ کا پورا نام',
  phone: 'فون',
  phonePlaceholder: '+92 300 123 4567',
  confirmPassword: 'پاس ورڈ کی تصدیق',
  confirmPasswordPlaceholder: 'پاس ورڈ دوبارہ لکھیں',
  atLeastEightCharacters: 'کم از کم 8 حروف',
  show: 'دکھائیں',
  hide: 'چھپائیں',
  showPassword: 'پاس ورڈ دکھائیں',
  hidePassword: 'پاس ورڈ چھپائیں',
  sixDigitCode: 'چھ ہندسوں کا کوڈ',
  google: 'Google',
  continueWithGoogle: 'Google کے ساتھ جاری رکھیں',
  openingGoogle: 'Google کھل رہا ہے…',
  orDivider: 'یا',

  missingDetails: 'تفصیلات نامکمل ہیں',
  enterEmailAndPassword: 'براہِ کرم اپنا ای میل اور پاس ورڈ درج کریں۔',
  enterFullName: 'براہِ کرم اپنا پورا نام درج کریں۔',
  invalidEmail: 'ای میل درست نہیں',
  enterValidEmail: 'براہِ کرم درست ای میل ایڈریس درج کریں۔',
  invalidPhone: 'فون نمبر درست نہیں',
  enterValidPhone: 'براہِ کرم درست فون نمبر درج کریں۔',
  weakPassword: 'کمزور پاس ورڈ',
  passwordTooShort: 'پاس ورڈ کم از کم 8 حروف کا ہونا چاہیے۔',
  passwordMismatch: 'پاس ورڈ مختلف ہیں',
  passwordsDoNotMatch: 'دونوں پاس ورڈ ایک جیسے نہیں۔',
  passwordsDoNotMatchLong: 'دونوں پاس ورڈ ایک جیسے نہیں ہیں۔',

  errors: {
    invalidCredentials: 'یہ ای میل اور پاس ورڈ آپس میں نہیں ملتے۔',
    emailTaken: 'اس ای میل سے پہلے ہی ایک اکاؤنٹ موجود ہے۔ سائن ان کریں۔',
    emailNotConfirmed: 'سائن ان سے پہلے اپنے ای میل کی تصدیق کریں۔',
    rateLimited: 'بہت زیادہ کوششیں ہو گئیں۔ ایک منٹ رک کر دوبارہ کوشش کریں۔',
    weakPassword: 'یہ پاس ورڈ آسانی سے بوجھا جا سکتا ہے۔ لمبا پاس ورڈ چنیں۔',
    samePassword: 'نیا پاس ورڈ پرانے سے مختلف ہونا چاہیے۔',
    network: 'سرور تک رسائی نہیں ہو سکی۔ انٹرنیٹ چیک کر کے دوبارہ کوشش کریں۔',
    signupsClosed: 'اس وقت نئے اکاؤنٹ نہیں بنائے جا رہے۔',
  },

  login: {
    title: 'خوش آمدید۔',
    subtitle: 'آپ کا شیلف وہیں ہے جہاں آپ نے چھوڑا تھا۔',
    newHere: 'نئے ہیں؟',
    forgotPassword: 'پاس ورڈ بھول گئے؟',
    signingIn: 'سائن ان ہو رہا ہے…',
    sendingCode: 'کوڈ بھیجا جا رہا ہے…',
    emailMeCode: 'مجھے سائن ان کوڈ ای میل کریں',
    continueAsGuest: 'مہمان کے طور پر جاری رکھیں',
    failedTitle: 'سائن ان نہیں ہو سکا',
    failedFallback: 'سائن ان نہیں ہو سکا۔ دوبارہ کوشش کریں۔',
    googleUnavailableTitle: 'Google سائن ان دستیاب نہیں',
    googleUnavailable:
      'اس بلڈ میں Google کلائنٹ موجود نہیں۔ اپنے ای میل اور پاس ورڈ سے سائن ان کریں۔',
    googleFailedTitle: 'Google سائن ان ناکام',
    enterEmailTitle: 'اپنا ای میل درج کریں',
    enterEmailForCode:
      'وہ ای میل لکھیں جس سے آپ نے اکاؤنٹ بنایا تھا، ہم آپ کو کوڈ بھیج دیں گے۔',
    noAccountTitle: 'اس ایڈریس کا کوئی اکاؤنٹ نہیں',
    noAccountMessage: 'ہجے چیک کریں، یا اسی ایڈریس سے نیا اکاؤنٹ بنائیں۔',
    couldNotSendCode: 'کوڈ نہیں بھیجا جا سکا',
    waitAMinute: 'براہِ کرم ایک منٹ رک کر دوبارہ کوشش کریں۔',
  },

  signUp: {
    title: 'اپنا شیلف شروع کریں۔',
    subtitle: 'چند تفصیلات، اور علم و عرفان کی سات دہائیاں آپ کے سامنے۔',
    alreadyHaveAccount: 'پہلے سے اکاؤنٹ ہے؟',
    creating: 'اکاؤنٹ بن رہا ہے…',
    create: 'اکاؤنٹ بنائیں',
    withGoogle: 'Google سے سائن اپ کریں',
    failedTitle: 'سائن اپ نہیں ہو سکا',
    failedFallback: 'اکاؤنٹ نہیں بن سکا۔ دوبارہ کوشش کریں۔',
    googleUnavailableTitle: 'Google سائن اپ دستیاب نہیں',
    googleUnavailable:
      'اس بلڈ میں Google کلائنٹ موجود نہیں۔ اپنے ای میل سے اکاؤنٹ بنائیں۔',
    googleFailedTitle: 'Google سائن اپ ناکام',
    pausedTitle: 'سائن اپ عارضی طور پر بند ہے۔',
    pausedSubtitle:
      'اس وقت نئے اکاؤنٹ نہیں بنائے جا رہے۔ موجودہ اکاؤنٹ معمول کے مطابق کام کرتے ہیں، اور پوری لائبریری دیکھنے کے لیے کھلی ہے۔',
    signInInstead: 'سائن ان کریں',
    browseLibrary: 'لائبریری دیکھیں',
  },

  forgot: {
    title: 'پاس ورڈ بھول گئے؟',
    subtitle:
      'اپنا ای میل درج کریں، ہم نیا پاس ورڈ رکھنے کے لیے کوڈ بھیجیں گے۔',
    backToSignIn: 'سائن ان پر واپس',
    rememberedIt: 'یاد آ گیا؟',
    enterSignUpEmail:
      'براہِ کرم وہ ای میل درج کریں جس سے آپ نے اکاؤنٹ بنایا تھا۔',
    couldNotSendEmail: 'ای میل نہیں بھیجی جا سکی',
    sending: 'بھیجا جا رہا ہے…',
    sendResetCode: 'ری سیٹ کوڈ بھیجیں',
    alreadyHaveCode: 'میرے پاس کوڈ پہلے سے ہے',
    enterEmailFirst: 'پہلے وہ ای میل لکھیں جس پر کوڈ بھیجا گیا تھا۔',
  },

  reset: {
    title: 'نیا پاس ورڈ رکھیں۔',
    confirmedSubtitle: email =>
      `${email} کی تصدیق ہو گئی۔ نیچے نیا پاس ورڈ چنیں۔`,
    yourAccount: 'آپ کے اکاؤنٹ',
    codeSubtitle: email =>
      `ہم نے${email ? ` ${email} پر` : ''} جو چھ ہندسوں کا کوڈ ای میل کیا ہے وہ درج کریں، پھر نیا پاس ورڈ چنیں۔`,
    updatedTitle: 'پاس ورڈ بدل گیا',
    updatedMessage: 'آپ اپنے نئے پاس ورڈ کے ساتھ سائن ان ہیں۔',
    enterCodeTitle: 'کوڈ درج کریں',
    enterCodeMessage:
      'اپنا ای میل اور ری سیٹ ای میل والا چھ ہندسوں کا کوڈ لکھیں۔',
    failedTitle: 'پاس ورڈ ری سیٹ نہیں ہو سکا',
    failedFallback: 'کوڈ غلط یا زائد المیعاد ہو سکتا ہے۔ نیا کوڈ منگوائیں۔',
    emailSent: 'ای میل بھیج دی گئی',
    newCodeOnWay: email => `نیا کوڈ ${email} پر بھیجا جا رہا ہے۔`,
    couldNotResend: 'دوبارہ نہیں بھیجا جا سکا',
    resendIn: seconds => `${seconds} سیکنڈ بعد دوبارہ بھیجیں`,
    resendEmail: 'ای میل دوبارہ بھیجیں',
    resetCode: 'ری سیٹ کوڈ',
    resetCodePlaceholder: '123456',
    newPassword: 'نیا پاس ورڈ',
    confirmNewPassword: 'نئے پاس ورڈ کی تصدیق',
    typeItAgain: 'دوبارہ لکھیں',
    setNewPassword: 'نیا پاس ورڈ رکھیں',
    noCode: 'کوڈ نہیں ملا؟',
  },

  code: {
    verify: 'کوڈ کی تصدیق کریں',
    checking: 'جانچ ہو رہی ہے…',
    enterAllDigits: count => `ای میل والے تمام ${count} ہندسے درج کریں۔`,
    hint: (count, email) =>
      `${email} پر بھیجا گیا ${count} ہندسوں کا کوڈ درج کریں۔ آپ اسے پیسٹ بھی کر سکتے ہیں۔`,
    sentTitle: 'کوڈ بھیج دیا گیا',
    sentMessage: email =>
      `نیا کوڈ ${email} پر بھیجا جا رہا ہے۔ نہ ملے تو اسپیم فولڈر دیکھیں۔`,
    couldNotResend: 'دوبارہ نہیں بھیجا جا سکا',
    resendIn: seconds => `${seconds} سیکنڈ بعد دوبارہ بھیجیں`,
    sending: 'بھیجا جا رہا ہے…',
    sendNew: 'نیا کوڈ بھیجیں',
    resend: 'کوڈ دوبارہ بھیجیں',
    rateLimited:
      'ابھی ابھی ایک کوڈ بھیجا گیا ہے۔ دوسرا مانگنے سے پہلے تھوڑا انتظار کریں۔',
    expired:
      'یہ کوڈ زائد المیعاد ہو چکا ہے۔ نیا کوڈ منگوا کر دوبارہ کوشش کریں۔',
    invalid: 'یہ کوڈ درست نہیں۔ ہندسے چیک کر کے دوبارہ کوشش کریں۔',
    other: 'کوڈ کی جانچ نہیں ہو سکی۔ براہِ کرم دوبارہ کوشش کریں۔',
  },

  enterCode: {
    wrongAddress: 'غلط ایڈریس؟',
    backToSignIn: 'سائن ان پر واپس',
    signup: {
      title: 'اپنا ای میل دیکھیں۔',
      subtitle: email =>
        `${email} پر بھیجا گیا کوڈ درج کریں، یا اسی ای میل میں موجود محفوظ لنک اسی فون پر کھولیں۔`,
      verify: 'ای میل کی تصدیق کریں',
    },
    recovery: {
      title: 'ری سیٹ کوڈ درج کریں۔',
      subtitle: email =>
        `ہم نے ${email} پر چھ ہندسوں کا کوڈ بھیجا ہے۔ اسے یہاں درج کریں، پھر نیا پاس ورڈ چنیں۔ ای میل میں موجود محفوظ لنک بھی اسی فون پر کام کرتا ہے۔`,
      verify: 'جاری رکھیں',
    },
    signin: {
      title: 'اپنا سائن ان کوڈ درج کریں۔',
      subtitle: email =>
        `ہم نے ${email} پر چھ ہندسوں کا کوڈ بھیجا ہے۔ اسے یہاں درج کریں، یا اسی ای میل میں موجود محفوظ لنک اسی فون پر کھولیں۔`,
      verify: 'سائن ان',
    },
  },

  googleErrors: {
    cancelled: 'Google سائن ان منسوخ کر دیا گیا۔',
    unavailable: 'اس بلڈ میں Google سائن ان دستیاب نہیں۔',
    noIdToken:
      'Google نے ID ٹوکن واپس نہیں کیا۔ چیک کریں کہ GOOGLE_WEB_CLIENT_ID اسی Google Cloud پروجیکٹ کا ویب کلائنٹ ہے۔',
    inProgress: 'Google سائن ان پہلے سے جاری ہے۔',
    playServices: 'اس ڈیوائس پر Google Play services موجود نہیں یا پرانی ہیں۔',
    failed: 'Google سائن ان ناکام ہو گیا۔',
  },

  link: {
    didNotWork: 'لنک نے کام نہیں کیا',
    couldNotSignIn: 'آپ کو سائن ان نہیں کیا جا سکا',
    mayHaveExpired: 'لنک کی میعاد ختم ہو چکی ہو گی۔ نیا لنک منگوائیں۔',
  },
};
