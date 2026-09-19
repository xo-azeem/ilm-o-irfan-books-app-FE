export { supabase } from './client';
export {
  AUTH_REDIRECT_URL,
  exportMyData,
  getAuthUser,
  getSignedPdfUrl,
  isEmailNotConfirmed,
  listSessions,
  readEmailChangeProgress,
  requestEmailChange,
  requestPasswordReset,
  resendEmailChangeCodes,
  resendSignUpConfirmation,
  resetPasswordWithCode,
  revokeSession,
  sendPasswordChangeCode,
  sendSignInCode,
  setNewPassword,
  signInWithEmail,
  signOut,
  signOutOtherDevices,
  signUpWithEmail,
  verifyEmailChangeCode,
  verifyEmailCode,
  verifyRecoveryCode,
  verifySignInCode,
  type AuthSession,
  type EmailChangeProgress,
} from './auth';
export { describeOtpError, type OtpErrorKind } from './otpErrors';
export { describeAuthError } from './authErrors';
export {
  GoogleSignInCancelled,
  forgetGoogleSession,
  isGoogleSignInAvailable,
  linkGoogleIdentity,
  signInWithGoogle,
  unlinkGoogleIdentity,
} from './googleAuth';
