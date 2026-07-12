export const ROUTES = {
  HOME: 'Home',
  SEARCH: 'Search',
  MY_LIBRARY: 'MyLibrary',
  PROFILE: 'Profile',
  MAIN_TABS: 'MainTabs',
  BOOK_DETAIL: 'BookDetail',
} as const;

export type RouteName = (typeof ROUTES)[keyof typeof ROUTES];

export const ROUTE_LABELS: Record<RouteName, string> = {
  [ROUTES.HOME]: 'Home',
  [ROUTES.SEARCH]: 'Search',
  [ROUTES.MY_LIBRARY]: 'My Library',
  [ROUTES.PROFILE]: 'Profile',
};
