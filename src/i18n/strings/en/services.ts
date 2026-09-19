/**
 * Sentences composed away from any screen: errors thrown by the services,
 * and the few fallbacks the mappers write into catalogue data.
 */
export const services = {
  expectedData: 'Expected data was not returned.',
  mustBeSignedIn: 'You must be signed in.',
  networkError:
    'Could not reach the server. Check your connection and try again.',
  requestFailed: (status: number) => `Request failed (${status}).`,
  couldNotComplete: 'The request could not be completed. Please try again.',
  couldNotLoadLibrary: 'Could not load library.',
  profileNotCreated: 'Your profile has not been created yet.',
  goalRange: (min: number, max: number) =>
    `Goal must be a whole number from ${min} to ${max}.`,
  shelves: {
    trending: {
      title: 'Trending this week',
      subtitle: 'The same shelf for every reader',
    },
    arrivals: { title: 'New arrivals', subtitle: 'Fresh on the shelf' },
  },
  book: {
    unknownAuthor: 'Unknown',
    digitalEdition: 'Digital edition',
    readAtYourPace: 'Read at your pace',
    minRead: (minutes: number) => `${minutes} min read`,
    hourRead: (hours: number) => `${hours} hr read`,
    blurbUnattributed: 'A thoughtful read from the Ilm o Irfan library.',
    blurbBy: (author: string) => `A thoughtful read by ${author}.`,
    defaultGenre: 'Islamic Studies',
    pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
    continueReading: 'Continue reading',
    bookmarkNote: (page: number) => `Page ${page}`,
  },
  deletion: {
    requestExists: 'A deletion request is already open for this account.',
    nothingToWithdraw: 'There is no deletion request to withdraw.',
    reasonTooLong: (max: number) => `Keep the reason under ${max} characters.`,
    subscriptionActive:
      'Cancel your membership in the App Store or Google Play first, then request deletion.',
    billingUnresolved:
      'The store is still settling a payment on your membership. Resolve it there first.',
    adminAccount: 'Admin accounts cannot be deleted from the app.',
    fallback: 'The request could not be completed.',
  },
  vault: {
    notEnoughSpace:
      'There is not enough free space on this device for this book. Free up some space and try again.',
    empty: 'This book file is empty.',
    notPdf: 'This book file is not a PDF.',
    damaged: 'This download is damaged.',
  },
  pdf: {
    cancelled: 'The PDF download was cancelled.',
    missing: 'This book file is missing from storage.',
    downloadFailed: (status: number) =>
      `Could not download the PDF (${status}).`,
    invalid: 'This book file is missing or is not a valid PDF.',
    incomplete: 'The book did not download completely. Please try again.',
    couldNotDownload: 'Could not download the PDF.',
  },
  avatar: {
    tooLarge: 'That photo is larger than 5 MB. Pick a smaller one.',
    uploadFailed: (status: number) => `Could not upload the photo (${status}).`,
    pathMissing: 'The server did not say where to store the photo.',
  },
  export: { shareTitle: 'Share my data' },
  billing: {
    cannotPurchase: 'Membership cannot be purchased in this build.',
    unavailableIos:
      'Purchases are not available on this Apple ID / device (check Screen Time or Ask to Buy).',
    unavailableAndroid:
      'Purchases are not available on this Google Play account / device.',
    cannotRestore: 'Purchases cannot be restored in this build.',
    purchaseFailed: 'The purchase could not be completed. Please try again.',
  },
  admin: {
    nothingInWindow: 'Nothing recorded in this window yet.',
    fetchingLink: 'Fetching a signed link…',
  },
  loading: 'Loading',
};
