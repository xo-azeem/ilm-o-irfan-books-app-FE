import type { NavigatorScreenParams } from '@react-navigation/native';

export type AdminBooksStackParamList = {
  AdminBookList: undefined;
  AdminBookEditor: { bookId?: string };
  AdminPdfPreview: { bookId: string; title: string };
};

export type AdminCatalogStackParamList = {
  AdminCatalogHome: undefined;
  AdminAuthorEditor: { authorId?: string };
  AdminCategoryEditor: { categoryId?: string };
  AdminCollectionEditor: { collectionId?: string };
};

export type AdminPeopleStackParamList = {
  AdminPeopleList: undefined;
  AdminUserDetail: { userId: string };
};

export type AdminTabParamList = {
  AdminOverview: undefined;
  AdminBooks: NavigatorScreenParams<AdminBooksStackParamList> | undefined;
  AdminCatalog: NavigatorScreenParams<AdminCatalogStackParamList> | undefined;
  AdminPeople: NavigatorScreenParams<AdminPeopleStackParamList> | undefined;
};
