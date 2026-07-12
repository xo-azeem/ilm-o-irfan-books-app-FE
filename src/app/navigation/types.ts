import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  MainTabs: undefined;
  BookDetail: { bookId: string };
};

export type RootTabParamList = {
  Home: undefined;
  Search: undefined;
  MyLibrary: undefined;
  Profile: undefined;
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
