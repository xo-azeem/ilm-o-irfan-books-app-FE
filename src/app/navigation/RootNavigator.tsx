import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';

import { CustomTabBar } from '@/components/navigation/CustomTabBar';
import { ROUTES } from '@/constants/routes';
import { HomeScreen } from '@/features/home/screens/HomeScreen';
import { LibraryScreen } from '@/features/library/screens/LibraryScreen';
import { ProfileScreen } from '@/features/profile/screens/ProfileScreen';
import { SearchScreen } from '@/features/search/screens/SearchScreen';

import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootNavigator() {
  return (
    <View className="flex-1">
      <NavigationContainer>
        <Tab.Navigator
          tabBar={props => <CustomTabBar {...props} />}
          screenOptions={{ headerShown: false }}>
          <Tab.Screen name={ROUTES.HOME} component={HomeScreen} />
          <Tab.Screen name={ROUTES.SEARCH} component={SearchScreen} />
          <Tab.Screen name={ROUTES.MY_LIBRARY} component={LibraryScreen} />
          <Tab.Screen name={ROUTES.PROFILE} component={ProfileScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </View>
  );
}
