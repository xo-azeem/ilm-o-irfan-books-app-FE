import type { NavigatorScreenParams } from '@react-navigation/native';

import type { BookStatusFilter } from '@/services/admin';

export type AdminBooksStackParamList = {
  AdminBookList: { status?: BookStatusFilter } | undefined;
  AdminBookEditor: { bookId?: string };
  AdminPdfPreview: { bookId: string; title: string };
};

export type AdminCatalogStackParamList = {
  AdminCatalogHome: undefined;
  AdminAuthorList: undefined;
  AdminAuthorEditor: { authorId?: string };
  AdminCategoryList: undefined;
  AdminCategoryEditor: { categoryId?: string };
  AdminCollectionList: undefined;
  AdminCollectionEditor: { collectionId?: string };
};

export type AdminPeopleStackParamList = {
  AdminPeopleList: undefined;
  AdminUserDetail: { userId: string };
};

export type AdminSystemStackParamList = {
  AdminSystemHome: undefined;
  AdminAnalytics: undefined;
  AdminPlanList: undefined;
  AdminPlanEditor: { planId?: string };
  AdminMedia: undefined;
  AdminAuditLog: undefined;
  AdminSettings: undefined;
};

export type AdminTabParamList = {
  AdminOverview: undefined;
  AdminBooks: NavigatorScreenParams<AdminBooksStackParamList> | undefined;
  AdminCatalog: NavigatorScreenParams<AdminCatalogStackParamList> | undefined;
  AdminPeople: NavigatorScreenParams<AdminPeopleStackParamList> | undefined;
  AdminSystem: NavigatorScreenParams<AdminSystemStackParamList> | undefined;
};
