export const ROUTES = {
  HOME: 'Home',
  SEARCH: 'Search',
  MY_LIBRARY: 'MyLibrary',
  PROFILE: 'Profile',
  MAIN_TABS: 'MainTabs',
  BOOK_DETAIL: 'BookDetail',
  BOOK_READER: 'BookReader',
  LOGIN: 'Login',
  SIGN_UP: 'SignUp',
} as const;

export type RouteName = (typeof ROUTES)[keyof typeof ROUTES];

export const ROUTE_LABELS: Record<RouteName, string> = {
  [ROUTES.HOME]: 'Home',
  [ROUTES.SEARCH]: 'Search',
  [ROUTES.MY_LIBRARY]: 'My Library',
  [ROUTES.PROFILE]: 'Profile',
  [ROUTES.MAIN_TABS]: 'Main',
  [ROUTES.BOOK_DETAIL]: 'Book',
  [ROUTES.BOOK_READER]: 'Reader',
  [ROUTES.LOGIN]: 'Login',
  [ROUTES.SIGN_UP]: 'Sign up',
};
