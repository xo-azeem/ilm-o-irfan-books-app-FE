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
};

export type ProfileStackScreen = Exclude<
  keyof ProfileStackParamList,
  'ProfileMain'
>;
