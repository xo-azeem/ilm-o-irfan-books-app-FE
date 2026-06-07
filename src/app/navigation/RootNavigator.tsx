import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import {
  BookOpen,
  Compass,
  Heart,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';

import { TabIcon } from '@/components/navigation/TabIcon';
import { ROUTES } from '@/constants/routes';
import { ExploreScreen } from '@/features/explore/screens/ExploreScreen';
import { LibraryScreen } from '@/features/library/screens/LibraryScreen';
import { ProfileScreen } from '@/features/profile/screens/ProfileScreen';
import { WishlistScreen } from '@/features/wishlist/screens/WishlistScreen';

import type { RootTabParamList } from './types';
import { useTabBarOptions } from './useTabBarOptions';

const Tab = createBottomTabNavigator<RootTabParamList>();

function makeTabIcon(Icon: LucideIcon) {
  return function TabBarIcon({
    color,
    focused,
  }: {
    color: string;
    focused: boolean;
  }) {
    return <TabIcon Icon={Icon} color={color} focused={focused} />;
  };
}

const ExploreTabIcon = makeTabIcon(Compass);
const LibraryTabIcon = makeTabIcon(BookOpen);
const WishlistTabIcon = makeTabIcon(Heart);
const ProfileTabIcon = makeTabIcon(UserRound);

export function RootNavigator() {
  const screenOptions = useTabBarOptions();

  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={screenOptions}>
        <Tab.Screen
          name={ROUTES.EXPLORE}
          component={ExploreScreen}
          options={{
            tabBarLabel: 'Explore',
            tabBarIcon: ExploreTabIcon,
          }}
        />
        <Tab.Screen
          name={ROUTES.LIBRARY}
          component={LibraryScreen}
          options={{
            tabBarLabel: 'Library',
            tabBarIcon: LibraryTabIcon,
          }}
        />
        <Tab.Screen
          name={ROUTES.WISHLIST}
          component={WishlistScreen}
          options={{
            tabBarLabel: 'Wishlist',
            tabBarIcon: WishlistTabIcon,
          }}
        />
        <Tab.Screen
          name={ROUTES.PROFILE}
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ProfileTabIcon,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
