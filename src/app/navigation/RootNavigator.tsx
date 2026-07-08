import { useEffect } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';

import { CustomTabBar } from '@/components/navigation/CustomTabBar';
import { ROUTES } from '@/constants/routes';
import { HomeScreen } from '@/features/home/screens/HomeScreen';

import { lazyScreen } from './lazyScreen';
import type { RootTabParamList } from './types';

const SearchScreen = lazyScreen(
  () => import('@/features/search/screens/SearchScreen'),
  'SearchScreen',
);
const LibraryScreen = lazyScreen(
  () => import('@/features/library/screens/LibraryScreen'),
  'LibraryScreen',
);
const ProfileScreen = lazyScreen(
  () => import('@/features/profile/screens/ProfileScreen'),
  'ProfileScreen',
);

const TAB_SCREEN_PRELOADERS = [
  () => import('@/features/search/screens/SearchScreen'),
  () => import('@/features/library/screens/LibraryScreen'),
  () => import('@/features/profile/screens/ProfileScreen'),
] as const;

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootNavigator() {
  useEffect(() => {
    let cancelled = false;
    let idleHandle: ReturnType<typeof requestIdleCallback> | undefined;
    let preloadIndex = 0;

    const preloadNextScreen = () => {
      if (cancelled || preloadIndex >= TAB_SCREEN_PRELOADERS.length) {
        return;
      }

      const loadScreen = TAB_SCREEN_PRELOADERS[preloadIndex];
      preloadIndex += 1;

      void loadScreen().finally(() => {
        if (!cancelled) {
          idleHandle = requestIdleCallback(preloadNextScreen);
        }
      });
    };

    idleHandle = requestIdleCallback(preloadNextScreen);

    return () => {
      cancelled = true;
      if (idleHandle !== undefined) {
        cancelIdleCallback(idleHandle);
      }
    };
  }, []);

  return (
    <View className="flex-1">
      <NavigationContainer>
        <Tab.Navigator
          detachInactiveScreens={false}
          tabBar={props => <CustomTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            lazy: true,
            freezeOnBlur: true,
            animation: 'none',
          }}>
          <Tab.Screen name={ROUTES.HOME} component={HomeScreen} />
          <Tab.Screen name={ROUTES.SEARCH} component={SearchScreen} />
          <Tab.Screen name={ROUTES.MY_LIBRARY} component={LibraryScreen} />
          <Tab.Screen name={ROUTES.PROFILE} component={ProfileScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </View>
  );
}
