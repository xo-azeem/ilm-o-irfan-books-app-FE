import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { ProfileStackParamList } from '@/features/profile/navigation/types';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  MainTabs: NavigatorScreenParams<RootTabParamList> | undefined;
  BookDetail: { bookId: string };
  BookReader: { bookId: string };
  Wishlist: undefined;
};

export type RootTabParamList = {
  Home: undefined;
  Search: undefined;
  MyLibrary: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};


export type RootTabScreenProps<T extends keyof RootTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;

export type BookDetailScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'BookDetail'
>;
