export const auth = {
  // Shared fields
  email: 'Email',
  emailPlaceholder: 'name@example.com',
  password: 'Password',
  passwordPlaceholder: 'Your password',
  fullName: 'Full name',
  fullNamePlaceholder: 'Your full name',
  phone: 'Phone',
  phonePlaceholder: '+92 300 123 4567',
  confirmPassword: 'Confirm password',
  confirmPasswordPlaceholder: 'Repeat your password',
  atLeastEightCharacters: 'At least 8 characters',
  show: 'Show',
  hide: 'Hide',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  sixDigitCode: 'Six-digit code',
  google: 'Google',
  continueWithGoogle: 'Continue with Google',
  openingGoogle: 'Opening Google…',
  orDivider: 'or',

  // Validation
  missingDetails: 'Missing details',
  enterEmailAndPassword: 'Please enter your email and password.',
  enterFullName: 'Please enter your full name.',
  invalidEmail: 'Invalid email',
  enterValidEmail: 'Please enter a valid email address.',
  invalidPhone: 'Invalid phone',
  enterValidPhone: 'Please enter a valid phone number.',
  weakPassword: 'Weak password',
  passwordTooShort: 'Password must be at least 8 characters.',
  passwordMismatch: 'Password mismatch',
  passwordsDoNotMatch: 'Passwords do not match.',
  passwordsDoNotMatchLong: 'The two passwords do not match.',

  // Server-side refusals, in the app's own words
  errors: {
    invalidCredentials: 'That email and password do not match.',
    emailTaken: 'An account with that email already exists. Sign in instead.',
    emailNotConfirmed: 'Confirm your email before signing in.',
    rateLimited: 'Too many attempts. Wait a minute and try again.',
    weakPassword: 'That password is too easy to guess. Choose a longer one.',
    samePassword: 'The new password must be different from the old one.',
    network: 'Could not reach the server. Check your connection and try again.',
    signupsClosed: 'New accounts are not being created right now.',
  },

  // Login
  login: {
    title: 'Welcome back.',
    subtitle: 'Your shelf is where you left it.',
    newHere: 'New here?',
    forgotPassword: 'Forgot password?',
    signingIn: 'Signing in…',
    sendingCode: 'Sending code…',
    emailMeCode: 'Email me a sign-in code',
    continueAsGuest: 'Continue as guest',
    failedTitle: 'Sign in failed',
    failedFallback: 'Unable to sign in. Try again.',
    googleUnavailableTitle: 'Google sign-in unavailable',
    googleUnavailable:
      'This build has no Google client configured. Sign in with your email and password.',
    googleFailedTitle: 'Google sign-in failed',
    enterEmailTitle: 'Enter your email',
    enterEmailForCode:
      'Type the address you signed up with and we will email a code.',
    noAccountTitle: 'No account for that address',
    noAccountMessage: 'Check the spelling, or create an account with it.',
    couldNotSendCode: 'Could not send a code',
    waitAMinute: 'Please wait a minute and try again.',
  },

  // Sign-up
  signUp: {
    title: 'Start your shelf.',
    subtitle:
      'A few details, then seven decades of Ilm-o-Irfan are yours to browse.',
    alreadyHaveAccount: 'Already have an account?',
    creating: 'Creating account…',
    create: 'Create account',
    withGoogle: 'Sign up with Google',
    failedTitle: 'Sign up failed',
    failedFallback: 'Unable to create account. Try again.',
    googleUnavailableTitle: 'Google sign-up unavailable',
    googleUnavailable:
      'This build has no Google client configured. Create an account with your email instead.',
    googleFailedTitle: 'Google sign-up failed',
    pausedTitle: 'Sign-ups are paused.',
    pausedSubtitle:
      'New accounts are not being created right now. Existing accounts work as usual, and the whole catalogue is open to browse.',
    signInInstead: 'Sign in instead',
    browseLibrary: 'Browse the library',
  },

  // Forgot password
  forgot: {
    title: 'Forgot your password?',
    subtitle: 'Enter your email and we will send a code to set a new one.',
    backToSignIn: 'Back to sign in',
    rememberedIt: 'Remembered it?',
    enterSignUpEmail: 'Please enter the email address you signed up with.',
    couldNotSendEmail: 'Could not send the email',
    sending: 'Sending…',
    sendResetCode: 'Send reset code',
    alreadyHaveCode: 'I already have a code',
    enterEmailFirst: 'Type the address the code was sent to first.',
  },

  // Reset password
  reset: {
    title: 'Set a new password.',
    confirmedSubtitle: (email: string) =>
      `You have confirmed ${email}. Choose a new password below.`,
    yourAccount: 'your account',
    codeSubtitle: (email: string | null) =>
      `Enter the six-digit code we emailed${email ? ` to ${email}` : ''}, then choose a new password.`,
    updatedTitle: 'Password updated',
    updatedMessage: 'You are signed in with your new password.',
    enterCodeTitle: 'Enter the code',
    enterCodeMessage:
      'Type your email and the six-digit code from the reset email.',
    failedTitle: 'Could not reset the password',
    failedFallback: 'The code may be wrong or expired. Request a new one.',
    emailSent: 'Email sent',
    newCodeOnWay: (email: string) => `A new code is on its way to ${email}.`,
    couldNotResend: 'Could not resend',
    resendIn: (seconds: number) => `Resend in ${seconds}s`,
    resendEmail: 'Resend email',
    resetCode: 'Reset code',
    resetCodePlaceholder: '123456',
    newPassword: 'New password',
    confirmNewPassword: 'Confirm new password',
    typeItAgain: 'Type it again',
    setNewPassword: 'Set new password',
    noCode: 'No code?',
  },

  // Code entry (shared)
  code: {
    verify: 'Verify code',
    checking: 'Checking…',
    enterAllDigits: (count: number) =>
      `Enter all ${count} digits from the email.`,
    hint: (count: number, email: string) =>
      `Enter the ${count}-digit code we emailed to ${email}. You can paste it.`,
    sentTitle: 'Code sent',
    sentMessage: (email: string) =>
      `A new code is on its way to ${email}. Check spam if it does not arrive.`,
    couldNotResend: 'Could not resend',
    resendIn: (seconds: number) => `Resend code in ${seconds}s`,
    sending: 'Sending…',
    sendNew: 'Send a new code',
    resend: 'Resend code',
    rateLimited:
      'A code was sent very recently. Wait a moment before asking for another.',
    expired: 'That code has expired. Request a new one and try again.',
    invalid: 'That code is not right. Check the digits and try again.',
    other: 'The code could not be checked. Please try again.',
  },

  // Enter-code screen, per flow
  enterCode: {
    wrongAddress: 'Wrong address?',
    backToSignIn: 'Back to sign in',
    signup: {
      title: 'Check your email.',
      subtitle: (email: string) =>
        `Enter the code we emailed to ${email}, or open the secure link in the same email on this phone.`,
      verify: 'Verify email',
    },
    recovery: {
      title: 'Enter the reset code.',
      subtitle: (email: string) =>
        `We emailed a six-digit code to ${email}. Enter it here, then choose a new password. The secure link in the email works too, on this phone.`,
      verify: 'Continue',
    },
    signin: {
      title: 'Enter your sign-in code.',
      subtitle: (email: string) =>
        `We emailed a six-digit code to ${email}. Enter it here, or open the secure link in the same email on this phone.`,
      verify: 'Sign in',
    },
  },

  // Google
  googleErrors: {
    cancelled: 'Google sign-in was cancelled.',
    unavailable: 'Google sign-in is not available in this build.',
    noIdToken:
      'Google did not return an ID token. Check that GOOGLE_WEB_CLIENT_ID is the Web client of the same Google Cloud project.',
    inProgress: 'Google sign-in is already in progress.',
    playServices:
      'Google Play services are missing or out of date on this device.',
    failed: 'Google sign-in failed.',
  },

  // Links opened from an email
  link: {
    didNotWork: 'Link did not work',
    couldNotSignIn: 'Could not sign you in',
    mayHaveExpired: 'The link may have expired. Request a new one.',
  },
};
