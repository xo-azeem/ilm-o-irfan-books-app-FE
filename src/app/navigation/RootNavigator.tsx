import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthSplash } from '@/app/navigation/AuthSplash';
import { MainTabBar } from '@/components/navigation/MainTabBar';
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
import { useTheme } from '@/theme/ThemeContext';

import type { RootStackParamList, RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function renderTabBar(props: BottomTabBarProps) {
  return <MainTabBar {...props} />;
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
  const { colors } = useTheme();
  const contentStyle = useMemo(
    () => ({ flex: 1, backgroundColor: colors.background }),
    [colors.background],
  );

  return (
    <Stack.Navigator
      initialRouteName={ROUTES.MAIN_TABS}
      screenOptions={{
        headerShown: false,
        contentStyle,
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
  const { isDark, colors } = useTheme();
  const [splashVisible, setSplashVisible] = useState(true);

  const sessionReady = isHydrated && roleResolved;
  const hideSplash = useCallback(() => setSplashVisible(false), []);

  const navigationTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        primary: colors.primary,
        background: colors.background,
        card: colors.background,
        text: colors.ink,
        border: colors.border,
        notification: colors.primary,
      },
    }),
    [colors.background, colors.border, colors.ink, colors.primary, isDark],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {sessionReady ? (
        <NavigationContainer theme={navigationTheme}>
          {isAdmin ? <AdminNavigator /> : <ConsumerNavigator />}
        </NavigationContainer>
      ) : null}
      {splashVisible ? (
        <View style={styles.splashLayer} pointerEvents="auto">
          <AuthSplash ready={sessionReady} onFinished={hideSplash} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splashLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});
