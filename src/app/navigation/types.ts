import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

export type RootTabParamList = {
  Explore: undefined;
  Library: undefined;
  Wishlist: undefined;
  Profile: undefined;
};

export type RootTabScreenProps<T extends keyof RootTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, T>,
    BottomTabScreenProps<RootTabParamList>
  >;
