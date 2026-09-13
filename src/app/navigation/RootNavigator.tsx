import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { TAB_TRANSITION } from '@/components/navigation/tabTransition';
import { ROUTES } from '@/constants/routes';
import { AdminNavigator } from '@/features/admin/navigation/AdminNavigator';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { SignUpScreen } from '@/features/auth/screens/SignUpScreen';
import { BookDetailScreen } from '@/features/book-detail/screens/BookDetailScreen';
import { CollectionScreen } from '@/features/collection/screens/CollectionScreen';
import { HomeScreen } from '@/features/home/screens/HomeScreen';
import { LibraryScreen } from '@/features/library/screens/LibraryScreen';
import { OnboardingNavigator } from '@/features/onboarding/navigation/OnboardingNavigator';
import { ProfileNavigator } from '@/features/profile/navigation/ProfileNavigator';
import { BookReaderScreen } from '@/features/reader/screens/BookReaderScreen';
import { SearchScreen } from '@/features/search/screens/SearchScreen';
import { WishlistScreen } from '@/features/wishlist/screens/WishlistScreen';
import { prefetchHomeCatalog } from '@/hooks/useCatalog';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useTheme } from '@/theme/ThemeContext';

import type { RootStackParamList, RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * The most the Home feed may add to the splash once the session is known.
 * Long enough for a typical round trip to land, short enough that a stalled
 * request shows a skeleton rather than a logo that never leaves.
 */
const FEED_HOLD_MS = 1500;

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
        ...TAB_TRANSITION,
      }}
    >
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

  // Read once, at mount: a navigator's initial route cannot change later, so
  // subscribing to the flag would only cause pointless re-renders.
  const [initialRoute] = useState<keyof RootStackParamList>(() =>
    useOnboardingStore.getState().wantsSignIn ? ROUTES.LOGIN : ROUTES.MAIN_TABS,
  );

  // Clear the one-shot intent once it has been spent, so a later remount does
  // not bounce the reader back to sign-in.
  useEffect(() => {
    useOnboardingStore.getState().clearSignInIntent();
  }, []);

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false, contentStyle, freezeOnBlur: true }}
    >
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
        name={ROUTES.COLLECTION}
        component={CollectionScreen}
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
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const onboarded = useOnboardingStore(state => state.completed);
  const { isDark, colors } = useTheme();
  const [splashVisible, setSplashVisible] = useState(true);

  const sessionReady = isHydrated && roleResolved;
  const hideSplash = useCallback(() => setSplashVisible(false), []);

  // A returning reader never sees first-run, even on a reinstall where the
  // onboarding flag was cleared but the session survived in the keychain.
  const needsOnboarding = !onboarded && !isAuthenticated && !isAdmin;

  // ── Warming Home under the splash ─────────────────────────────────────────
  // The splash holds for at least a second anyway, and for a signed-in reader
  // the session check is a network round trip on top of that. The Home feed
  // used to start only once all of that had finished and Home had mounted —
  // so the splash lifted onto a skeleton, and the real page dropped in half a
  // second later, mid-fade. Starting the feed here instead lets it overlap the
  // session check, and Home draws its first frame with data already in hand.
  const [homeFeedSettled, setHomeFeedSettled] = useState(false);
  useEffect(() => {
    if (!isHydrated || needsOnboarding) {
      return;
    }
    let mounted = true;
    void prefetchHomeCatalog(queryClient).finally(() => {
      if (mounted) {
        setHomeFeedSettled(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, [isHydrated, needsOnboarding]);

  // Whether the first screen under the splash is Home. The admin tool and
  // first-run have nothing to wait for. (Sign-in is not a launch destination:
  // `wantsSignIn` is transient and only ever set from first-run, after this.)
  const landsOnHome = !isAdmin && !needsOnboarding;

  // The feed is allowed to hold the splash, but only briefly: past this the
  // skeleton is the honest state, and a slow network should not look like a
  // hung app. Counted from the session resolving, not from launch, so a slow
  // session check does not eat the whole allowance before the feed gets any.
  const [feedHoldExpired, setFeedHoldExpired] = useState(false);
  useEffect(() => {
    if (!sessionReady) {
      return;
    }
    const timer = setTimeout(() => setFeedHoldExpired(true), FEED_HOLD_MS);
    return () => clearTimeout(timer);
  }, [sessionReady]);

  const splashReady =
    sessionReady && (!landsOnHome || homeFeedSettled || feedHoldExpired);

  const navigationTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.ink,
        border: colors.border,
        notification: colors.primary,
      },
    }),
    [
      colors.background,
      colors.border,
      colors.ink,
      colors.primary,
      colors.surface,
      isDark,
    ],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {sessionReady ? (
        <NavigationContainer theme={navigationTheme}>
          {isAdmin ? (
            <AdminNavigator />
          ) : needsOnboarding ? (
            <OnboardingNavigator />
          ) : (
            <ConsumerNavigator />
          )}
        </NavigationContainer>
      ) : null}
      {splashVisible ? (
        <View style={styles.splashLayer} pointerEvents="auto">
          <AuthSplash ready={splashReady} onFinished={hideSplash} />
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
    ...StyleSheet.absoluteFill,
    zIndex: 10,
  },
});
