/** The maintenance and update notices, the tab bar and the shared furniture. */
export const status = {
  defaultMaintenance:
    'We’re doing a little work on the library. It will be back shortly — your books, progress and downloads are exactly where you left them.',
  signOutFirst: 'Sign out first?',
  signOutFirstMessage: (email: string) =>
    `${email} is signed in on this phone. Admin sign-in signs that account out; it can sign back in once the library reopens.`,
  keepIt: 'Keep it',
  signOutAndContinue: 'Sign out and continue',
  appStore: 'App Store',
  playStore: 'Play Store',
  openStore: (store: string) => `Open the ${store}`,
  searchInStore: (store: string) =>
    `Search for “Ilm o Irfan” in the ${store} and tap Update.`,
  mailSubject: 'Ilm o Irfan',
  noMailApp: 'No mail app found',
  writeToUs: (email: string) => `Write to us at ${email}.`,
  backInAMoment: 'Back in a moment.',
  newerApp: 'A newer app is waiting.',
  stillClosed: (time: string) =>
    ` Still closed — checked at ${time}. This page opens by itself the moment the library is back.`,
  unsupported: (version: string) =>
    `This version (${version}) is no longer supported. Update to keep reading — your books, progress and downloads carry over.`,
  checking: 'Checking…',
  tryAgain: 'Try again',
  updateApp: 'Update the app',
  contactSupport: 'Contact support',
  footer: (email: string, version: string) => `${email} · version ${version}`,
  adminSignIn: 'Admin sign-in',
  adminSignInHint: 'Opens the sign-in screen for admin accounts',
};

export const tabs = {
  home: 'Home',
  discover: 'Discover',
  library: 'Library',
  profile: 'Profile',
};

/** The push banner and the copy the app composes for a notification tap. */
export const push = {
  dismiss: 'Dismiss notification',
};
