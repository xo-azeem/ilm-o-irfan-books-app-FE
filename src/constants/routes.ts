export const ROUTES = {
  HOME: 'Home',
  SEARCH: 'Search',
  MY_LIBRARY: 'MyLibrary',
  PROFILE: 'Profile',
  MAIN_TABS: 'MainTabs',
  BOOK_DETAIL: 'BookDetail',
  BOOK_READER: 'BookReader',
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
  [ROUTES.WISHLIST]: 'Wishlist',
  [ROUTES.LOGIN]: 'Login',
  [ROUTES.SIGN_UP]: 'Sign up',
};

export const ADMIN_ROUTES = {
  OVERVIEW: 'AdminOverview',
  BOOKS: 'AdminBooks',
  CATALOG: 'AdminCatalog',
  PEOPLE: 'AdminPeople',
  BOOK_LIST: 'AdminBookList',
  BOOK_EDITOR: 'AdminBookEditor',
  PDF_PREVIEW: 'AdminPdfPreview',
  CATALOG_HOME: 'AdminCatalogHome',
  AUTHOR_EDITOR: 'AdminAuthorEditor',
  CATEGORY_EDITOR: 'AdminCategoryEditor',
  COLLECTION_EDITOR: 'AdminCollectionEditor',
  PEOPLE_LIST: 'AdminPeopleList',
  USER_DETAIL: 'AdminUserDetail',
} as const;
