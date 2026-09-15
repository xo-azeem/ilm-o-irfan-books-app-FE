import type { NavigatorScreenParams } from '@react-navigation/native';

import type { BookStatusFilter } from '@/services/admin';

/** The four segments of the Library tab. */
export type LibrarySegment = 'books' | 'authors' | 'categories' | 'shelves';

/** The three segments of the People tab. */
export type PeopleSegment = 'readers' | 'plans' | 'deletions';

export type AdminLibraryStackParamList = {
  AdminLibraryHome:
    { segment?: LibrarySegment; status?: BookStatusFilter } | undefined;
  /** `batchId` opens the editor to add a new draft to that bulk upload. */
  AdminBookEditor: { bookId?: string; batchId?: string };
  AdminPdfPreview: { bookId: string; title: string };
  AdminAuthorEditor: { authorId?: string };
  AdminCategoryEditor: { categoryId?: string };
  AdminCategoryBooks: { categoryId: string };
  AdminCollectionEditor: { collectionId?: string };
  AdminUploadBatches: undefined;
  AdminUploadBatch: { batchId: string };
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
