export type ProfileStackParamList = {
  ProfileMain: undefined;
  PersonalDetails: undefined;
  Subscription: undefined;
  Downloads: undefined;
  Notifications: undefined;
  Appearance: undefined;
  Language: undefined;
  HelpCenter: undefined;
  RateApp: undefined;
  PrivacySecurity: undefined;
  About: undefined;
};

export type ProfileStackScreen = Exclude<
  keyof ProfileStackParamList,
  'ProfileMain'
>;
