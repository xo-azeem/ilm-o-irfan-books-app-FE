export type ProfileStackParamList = {
  /** The reading record — statistics, streak, goal and achievements. */
  ProfileMain: undefined;
  /** The settings menu. Statistics live on ProfileMain, so this is navigation only. */
  Settings: undefined;
  PersonalDetails: undefined;
  Subscription: undefined;
  Downloads: undefined;
  Notifications: undefined;
  Appearance: undefined;
  Language: undefined;
  HelpCenter: undefined;
  PrivacySecurity: undefined;
};

export type ProfileStackScreen = Exclude<keyof ProfileStackParamList, 'ProfileMain'>;
