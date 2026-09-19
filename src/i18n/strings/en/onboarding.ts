export const onboarding = {
  welcome: {
    headline: 'Knowledge,\ncarried forward.',
    blurb: "Seven decades of Ilm-o-Irfan's shelves, now in your pocket.",
    start: 'Start exploring',
    haveAccount: 'I already have an account',
  },
  subjects: {
    title: 'Tell us what pulls you in.',
    subtitle: 'Pick three or more. Home rearranges itself around them.',
    readingLanguage: 'Reading language',
    continueChosen: (chosen: number) => `Continue · ${chosen} chosen`,
    pickMore: (more: number) => `Pick ${more} more`,
    labels: {
      seerat: 'Seerat',
      tafseer: 'Tafseer',
      fiqh: 'Fiqh',
      hadith: 'Hadith',
      'urdu-adab': 'Urdu literature',
      history: 'History',
      philosophy: 'Philosophy',
      education: 'Education',
      biography: 'Biography',
      language: 'Language',
    },
  },
  readingLanguages: {
    both: 'Both',
    urdu: 'اردو',
    english: 'English',
  },
  rhythm: {
    title: 'What kind of reader are you?',
    subtitle: 'Sets your daily goal and when we nudge you.',
    continue: 'Continue',
    skip: 'Skip for now',
    options: {
      casual: { label: 'Casual', detail: 'A few pages, now and then' },
      daily: { label: 'Daily', detail: '20 minutes every day' },
      'night-owl': { label: 'Night owl', detail: 'After Isha, lights low' },
      weekend: {
        label: 'Weekend reader',
        detail: 'Long sittings, Friday to Sunday',
      },
      scholar: { label: 'Scholar', detail: 'Several books in parallel' },
    },
  },
};
