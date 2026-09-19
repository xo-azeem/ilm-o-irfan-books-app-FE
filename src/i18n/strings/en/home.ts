export const home = {
  greeting: {
    stillAwake: 'Still awake',
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
  },
  /** The greeting with the reader's name after it, in the language's own punctuation. */
  greetingWithName: (greeting: string, name: string) => `${greeting}, ${name}`,
  readyForAnotherChapter: 'Ready for another chapter?',
  notifications: 'Notifications',
  yourProfile: 'Your profile',
  discovery: 'Discovery',
  personalised: 'Personalised',
  coldStart: {
    title: 'Popular right now',
    subtitle: 'Where other readers are starting',
  },
  seeMembershipPlans: 'See membership plans',
  seePlansFrom: (price: string, interval: string | null) =>
    `See plans from ${price}${interval ? ` / ${interval}` : ''}`,
  couldNotLoadCatalog: 'Could not load the catalog.',
  serverDidNotRespond:
    'The server did not respond. Check your connection, then try again.',
  nothingWasLost: 'Nothing was lost. Check your connection and try again.',
  continueReading: 'Continue reading',
  allCount: (count: number) => `All ${count}`,
  curatedCollections: 'Curated collections',
  curatedSubtitle: 'Reading paths built by our editors',
  featuredOf: (index: number, count: number) => `Featured ${index} of ${count}`,
  readNow: 'Read now',
  coverCaption: (title: string) => `COVER · ${title.toUpperCase()}`,
  removeFromWishlist: 'Remove from wishlist',
  saveForLater: 'Save for later',
  membershipBand: 'Unlimited reading, one membership',
  keepAccessUntil: (date: string) => `You keep full access until ${date}.`,
  mood: {
    title: 'How are you reading tonight?',
    labels: {
      Reflective: 'Reflective',
      Curious: 'Curious',
      Focused: 'Focused',
      Calm: 'Calm',
    },
    replies: {
      Reflective: 'Deep waters tonight. Go gently.',
      Curious: "Oh, so you're curious. That's how it starts.",
      Focused: 'Focused it is. Phone face-down, please.',
      Calm: 'Calm. Consider the tea poured.',
    },
  },
};

/** Paywall and access-state wording, shared by Home, the reader and Membership. */
export const access = {
  reasons: {
    active: {
      title: 'Membership active',
      message: 'You have full access to the library.',
    },
    admin: {
      title: 'Staff access',
      message: 'You can open any book, with or without a membership.',
    },
    trial: {
      title: 'You are on a trial',
      message:
        'Enjoy the full library. Your trial end date is shown in Membership.',
    },
    grace: {
      title: 'We are retrying your payment',
      message:
        'Keep reading — nothing is interrupted while the retry is in progress.',
    },
    billing_issue_paid_through: {
      title: 'Your card needs attention',
      message:
        'Your membership is paid through the current period, so keep reading. Update your card to avoid losing access.',
    },
    cancelled_paid_through: {
      title: 'Your membership is ending',
      message:
        'You keep full access until it ends. Resubscribe any time to continue after that.',
    },
    lapsed: {
      title: 'Your membership has ended',
      message:
        'Renew to pick up exactly where you left off — your library is untouched.',
    },
    expired: {
      title: 'Your membership has ended',
      message:
        'Renew to pick up exactly where you left off — your library is untouched.',
    },
    none: {
      title: 'Read the whole library',
      message: 'Every book in Ilm o Irfan is included with a membership.',
    },
  },
};
