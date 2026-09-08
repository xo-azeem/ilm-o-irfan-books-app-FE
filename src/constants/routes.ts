export const ROUTES = {
  HOME: 'Home',
  SEARCH: 'Search',
  MY_LIBRARY: 'MyLibrary',
  PROFILE: 'Profile',
  MAIN_TABS: 'MainTabs',
  BOOK_DETAIL: 'BookDetail',
  BOOK_READER: 'BookReader',
  COLLECTION: 'Collection',
  WISHLIST: 'Wishlist',
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
  [ROUTES.COLLECTION]: 'Collection',
  [ROUTES.WISHLIST]: 'Wishlist',
  [ROUTES.LOGIN]: 'Login',
  [ROUTES.SIGN_UP]: 'Sign up',
};

/**
 * Admin destinations.
 *
 * Four tabs, grouped by what an operator is working on rather than by which
 * table a record lives in: Today (what needs me), Library (everything readers
 * see), People (readers, access, plans) and System (the weekly jobs). Books
 * and Catalog were always the same job, so they are segments of one screen;
 * plans moved to People, because every question about a person ends at their
 * subscription.
 */
export const ADMIN_ROUTES = {
  // Tabs
  TODAY: 'AdminToday',
  LIBRARY: 'AdminLibrary',
  PEOPLE: 'AdminPeople',
  SYSTEM: 'AdminSystem',

  // Library stack — books, authors, categories and shelves as four segments
  LIBRARY_HOME: 'AdminLibraryHome',
  BOOK_EDITOR: 'AdminBookEditor',
  PDF_PREVIEW: 'AdminPdfPreview',
  AUTHOR_EDITOR: 'AdminAuthorEditor',
  CATEGORY_EDITOR: 'AdminCategoryEditor',
  COLLECTION_EDITOR: 'AdminCollectionEditor',

  // People stack — readers and plans as two segments
  PEOPLE_HOME: 'AdminPeopleHome',
  USER_DETAIL: 'AdminUserDetail',
  PLAN_EDITOR: 'AdminPlanEditor',

  // System stack
  SYSTEM_HOME: 'AdminSystemHome',
  ANALYTICS: 'AdminAnalytics',
  STORAGE: 'AdminStorage',
  HISTORY: 'AdminHistory',
  SETTINGS: 'AdminSettings',
} as const;
