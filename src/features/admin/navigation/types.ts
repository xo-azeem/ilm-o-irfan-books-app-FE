import type { NavigatorScreenParams } from '@react-navigation/native';

import type { BookStatusFilter } from '@/services/admin';

/** The four segments of the Library tab. */
export type LibrarySegment = 'books' | 'authors' | 'categories' | 'shelves';

/** The two segments of the People tab. */
export type PeopleSegment = 'readers' | 'plans';

export type AdminLibraryStackParamList = {
  AdminLibraryHome: { segment?: LibrarySegment; status?: BookStatusFilter } | undefined;
  AdminBookEditor: { bookId?: string };
  AdminPdfPreview: { bookId: string; title: string };
  AdminAuthorEditor: { authorId?: string };
  AdminCategoryEditor: { categoryId?: string };
  AdminCollectionEditor: { collectionId?: string };
};

export type AdminPeopleStackParamList = {
  AdminPeopleHome: { segment?: PeopleSegment } | undefined;
  AdminUserDetail: { userId: string };
  AdminPlanEditor: { planId?: string };
};

export type AdminSystemStackParamList = {
  AdminSystemHome: undefined;
  AdminAnalytics: undefined;
  AdminStorage: undefined;
  AdminHistory: undefined;
  AdminSettings: undefined;
};

export type AdminTabParamList = {
  AdminToday: undefined;
  AdminLibrary: NavigatorScreenParams<AdminLibraryStackParamList> | undefined;
  AdminPeople: NavigatorScreenParams<AdminPeopleStackParamList> | undefined;
  AdminSystem: NavigatorScreenParams<AdminSystemStackParamList> | undefined;
};
