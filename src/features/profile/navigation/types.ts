export type ProfileStackParamList = {
  /** The reading record — statistics, streak, goal, achievements — with the settings menu beneath. */
  ProfileMain: undefined;
  PersonalDetails: undefined;
  Subscription: undefined;
  Downloads: undefined;
  Notifications: undefined;
  Appearance: undefined;
  Language: undefined;
  HelpCenter: undefined;
  PrivacySecurity: undefined;
  /** Email verification state and the Google link. */
  SignInMethods: undefined;
  /** New password with an emailed code. */
  ChangePassword: undefined;
  /** Every session on the account, and the power to end the others. */
  Devices: undefined;
};

export type ProfileStackScreen = Exclude<
  keyof ProfileStackParamList,
  'ProfileMain'
>;
