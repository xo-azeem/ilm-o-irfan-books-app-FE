export const profile = {
  yourReadingRecord: 'Your reading record',
  recordStartsHere: 'Your record starts here.',
  recordSignIn:
    'Sign in to keep your streak, your finished books and your reading time across devices.',
  reader: 'Reader',
  memberSince: (year: number) => `Member since ${year}`,
  plan: { admin: 'Admin', premium: 'Premium', free: 'Free' },
  stats: {
    booksFinished: 'BOOKS\nFINISHED',
    pagesBookmarked: 'PAGES\nBOOKMARKED',
    booksOffline: 'BOOKS\nOFFLINE',
  },
  streak: {
    days: (count: number) => (count === 1 ? '1 day' : `${count} days`),
    label: 'Reading streak',
    longest: (longest: number) => `Reading streak · longest ${longest}`,
  },
  goal: {
    title: 'This month’s goal',
    count: (completed: number, target: number) =>
      `${completed} / ${target} books`,
    changeGoal: (count: string) => `${count}. Change goal`,
    reached: 'Goal reached. Anything else this month is a bonus.',
    remaining: (remaining: number) =>
      `${remaining} more to reach this month’s goal.`,
    couldNotSave: 'Could not save the goal',
    save: 'Save goal',
    fewer: 'Fewer books',
    more: 'More books',
    perMonth: (count: number): string =>
      count === 1 ? 'book a month' : 'books a month',
    alreadyDone: (completed: number) =>
      `You have already finished ${completed} this month — this goal is done the moment you save it.`,
    soFar: (completed: number, more: number) =>
      `${completed} finished so far this month. ${more} more would reach this goal.`,
  },
  achievements: {
    title: 'Achievements',
    earnedOf: (earned: number, total: number) => `${earned} of ${total}`,
    progress: (current: number, target: number) => `${current} of ${target}`,
    locked: 'Locked',
    medal: (label: string) => `${label} medal`,
    names: {
      'first-book': 'First book',
      'streak-7': 'Week streak',
      'books-25': '25 books',
      'night-reader': 'Night reader',
    },
  },
  adminCard: {
    title: 'You’re using the app as a reader',
    body: 'This is an admin account, so every book opens without a membership. Readers see the paywall where you don’t.',
    back: 'Back to admin panel',
  },
  signOut: {
    button: 'Sign out',
    title: 'Sign out?',
    body: 'Your streak, finished books and downloads stay on your account. Sign back in at any time to pick up where you left off.',
  },
  settings: {
    title: 'Settings',
    groups: {
      account: 'Account',
      preferences: 'Preferences',
      support: 'Support',
    },
    rows: {
      personal: 'Personal details',
      subscription: 'Subscription',
      downloads: 'Downloads',
      notifications: 'Notifications',
      appearance: 'Appearance',
      language: 'Language',
      help: 'Help center',
      privacy: 'Privacy & security',
    },
    on: 'On',
  },
  appearance: {
    title: 'Appearance',
    subtitle: 'Choose how the app looks on this device.',
    themes: { light: 'Light', dark: 'Dark', system: 'System' },
    textSize: 'Text size',
    appTextSize: 'App text size',
    appliedEverywhere: 'Applied to every screen',
    textSizeA11y: (label: string) => `${label} text size`,
    scales: {
      small: 'Small',
      default: 'Default',
      large: 'Large',
      xlarge: 'Largest',
    },
    readingDefaults: 'Reading defaults',
    pageTone: 'Page tone',
    pageToneHint: 'Applied to every book you open',
    pageToneA11y: (label: string) => `${label} page tone`,
    readingMode: 'Reading mode',
    keepAwake: 'Keep screen awake',
    keepAwakeHint: 'While the reader is open',
  },
  notifications: {
    title: 'Notifications',
    subtitle: 'Choose what reaches your device.',
    unavailableTitle: 'Notifications are not available in this build.',
    unavailableBody:
      'This copy of the app was built without its Firebase project file.',
    deniedTitle: 'Notifications are off for Ilm o Irfan.',
    deniedBody:
      "Nothing below will reach you until you turn them on for this app in your device's settings.",
    openSettings: 'Open settings',
    askTitle: 'Allow notifications to hear about new books.',
    askBody:
      'Your device will ask once. You can change your mind in its settings at any time.',
    turnOn: 'Turn on',
    library: 'Library',
    newBooks: 'New books & collections',
    newBooksHint: 'When fresh titles or a new collection arrive',
    changes: 'Changes to my books',
    changesHint:
      'When a book you have is removed, updated or gets a new edition',
    changesSignIn: 'Sign in to be told when a book you have changes',
    account: 'Account',
    membership: 'Membership',
    membershipHint: 'When your membership starts or ends',
    membershipSignIn: 'Sign in to be told about your membership',
    footer:
      'Delivered to this device’s notification tray. Sounds and importance for each kind can be tuned in your device’s notification settings.',
  },
  downloads: {
    title: 'Downloads',
    oneOffline: 'One book available offline.',
    manyOffline: (count: number) => `${count} books available offline.`,
    emptyTitle: 'Nothing saved yet.',
    emptyMessage:
      'Open a book and choose Download from its menu; it will be here, sealed on this device and ready without a connection.',
    backToProfile: 'Back to profile',
    used: (size: string) => `${size} used`,
    ofLimit: (size: string) => `OF ${size} LIMIT`,
    autoRemoved: 'Finished books are removed automatically after 30 days.',
    removeAll: 'Remove all downloads',
    removeTitle: 'Remove download?',
    removeMessage: (title: string) =>
      `${title} will stay in your library but need a connection to open.`,
    removeAllTitle: 'Remove all downloads?',
    removeAllMessage:
      'Every book stays in your library, but you will need a connection to open them.',
    downloadingPercent: (percent: number) => `DOWNLOADING · ${percent}%`,
    cancelDownloadOf: (title: string) => `Cancel download of ${title}`,
    removeFromDownloads: (title: string) => `Remove ${title} from downloads`,
    availableOffline: (size: string) => `${size} · available offline`,
    notOnDevice: (size: string) => `${size} · not on this device`,
    gb: (value: string) => `${value} GB`,
    mb: (value: number) => `${value} MB`,
  },
  help: {
    title: 'Help center',
    searchPlaceholder: 'Search help topics',
    nothingMatched: (query: string) =>
      `Nothing matched “${query}”. Try a different word, or email us below.`,
    emailA11y: (email: string) => `Email ${email}`,
    stillStuck: 'Still stuck?',
    replyTime: 'replies in 24h',
    emailUs: 'Email us',
    about: 'About',
    version: 'Version',
    build: 'Build',
    platform: 'Platform',
    rateApp: 'Rate the app',
    subject: 'Ilm o Irfan support',
    noMailApp: 'No mail app',
    writeToUs: (email: string) => `Write to us at ${email}.`,
    storeFailed: 'Could not open the store',
    storeFallback: 'Please search for Ilm o Irfan in your app store.',
    topics: [
      {
        question: 'How do I download books for offline reading?',
        answer:
          'Open any book and tap the download icon on the reader screen. Downloaded titles appear under Profile → Downloads.',
      },
      {
        question: 'Can I sync progress across devices?',
        answer:
          'Yes. Sign in with the same account on each device and your reading progress, highlights, and saved lessons will stay in sync.',
      },
      {
        question: 'How do I manage my subscription?',
        answer:
          'Go to Profile → Subscription to view your plan, renewal date, and billing options.',
      },
      {
        question: 'How do I change the app language?',
        answer:
          'Open Profile → Language and choose from the available languages. The app will apply your selection immediately.',
      },
    ],
  },
  language: {
    title: 'Language',
    subtitle: 'Applies to the interface immediately.',
    default: 'Default',
    note: 'Book titles and pages always appear in their own script, whichever language the interface is in.',
  },
};
