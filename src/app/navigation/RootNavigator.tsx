import { View } from 'react-native';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthSplash } from '@/app/navigation/AuthSplash';
import { CustomTabBar } from '@/components/navigation/CustomTabBar';
import { ROUTES } from '@/constants/routes';
import { AdminNavigator } from '@/features/admin/navigation/AdminNavigator';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { SignUpScreen } from '@/features/auth/screens/SignUpScreen';
import { BookDetailScreen } from '@/features/book-detail/screens/BookDetailScreen';
import { BookReaderScreen } from '@/features/reader/screens/BookReaderScreen';
import { HomeScreen } from '@/features/home/screens/HomeScreen';
import { LibraryScreen } from '@/features/library/screens/LibraryScreen';
import { ProfileNavigator } from '@/features/profile/navigation/ProfileNavigator';
import { SearchScreen } from '@/features/search/screens/SearchScreen';
import { WishlistScreen } from '@/features/wishlist/screens/WishlistScreen';
import { useAuthStore } from '@/stores/authStore';

import type { RootStackParamList, RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const STACK_CONTENT_STYLE = { flex: 1 } as const;

function renderTabBar(props: BottomTabBarProps) {
  return <CustomTabBar {...props} />;
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        animation: 'none',
      }}>
      <Tab.Screen name={ROUTES.HOME} component={HomeScreen} />
      <Tab.Screen name={ROUTES.SEARCH} component={SearchScreen} />
      <Tab.Screen name={ROUTES.MY_LIBRARY} component={LibraryScreen} />
      <Tab.Screen name={ROUTES.PROFILE} component={ProfileNavigator} />
    </Tab.Navigator>
  );
}

function ConsumerNavigator() {
  return (
    <Stack.Navigator
      initialRouteName={ROUTES.MAIN_TABS}
      screenOptions={{
        headerShown: false,
        contentStyle: STACK_CONTENT_STYLE,
        freezeOnBlur: true,
      }}>
      <Stack.Screen name={ROUTES.MAIN_TABS} component={MainTabs} />
      <Stack.Screen
        name={ROUTES.LOGIN}
        component={LoginScreen}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen
        name={ROUTES.SIGN_UP}
        component={SignUpScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name={ROUTES.BOOK_DETAIL}
        component={BookDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name={ROUTES.BOOK_READER}
        component={BookReaderScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name={ROUTES.WISHLIST}
        component={WishlistScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}

export function RootNavigator() {
  const isHydrated = useAuthStore(state => state.isHydrated);
  const roleResolved = useAuthStore(state => state.roleResolved);
  const isAdmin = useAuthStore(state => state.isAdmin);

  if (!isHydrated || !roleResolved) {
    return <AuthSplash />;
  }

  return (
    <View className="flex-1">
      <NavigationContainer>
        {isAdmin ? <AdminNavigator /> : <ConsumerNavigator />}
      </NavigationContainer>
    </View>
  );
}
