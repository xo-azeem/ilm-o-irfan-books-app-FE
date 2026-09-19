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
import Animated, { FadeIn } from 'react-native-reanimated';

import { AuthSplash } from '@/app/navigation/AuthSplash';
import {
  navigationRef,
  onNavigationReady,
  setAdminShellReady,
  setConsumerShellReady,
} from '@/app/navigation/navigationRef';
import { MainTabBar } from '@/components/navigation/MainTabBar';
import { TAB_TRANSITION } from '@/components/navigation/tabTransition';
import { ROUTES } from '@/constants/routes';
import { AdminNavigator } from '@/features/admin/navigation/AdminNavigator';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { SignUpScreen } from '@/features/auth/screens/SignUpScreen';
import { EnterCodeScreen } from '@/features/auth/screens/EnterCodeScreen';
import { ForgotPasswordScreen } from '@/features/auth/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '@/features/auth/screens/ResetPasswordScreen';
import { VerifyEmailScreen } from '@/features/auth/screens/VerifyEmailScreen';
import { BookDetailScreen } from '@/features/book-detail/screens/BookDetailScreen';
import { CollectionScreen } from '@/features/collection/screens/CollectionScreen';
import { HomeScreen } from '@/features/home/screens/HomeScreen';
import { LibraryScreen } from '@/features/library/screens/LibraryScreen';
import { OnboardingNavigator } from '@/features/onboarding/navigation/OnboardingNavigator';
import { ProfileNavigator } from '@/features/profile/navigation/ProfileNavigator';
import { BookReaderScreen } from '@/features/reader/screens/BookReaderScreen';
import { SearchScreen } from '@/features/search/screens/SearchScreen';
import { AppGateScreen } from '@/features/status/screens/AppGateScreen';
import { WishlistScreen } from '@/features/wishlist/screens/WishlistScreen';
import { prefetchAppStatus, useAppGate } from '@/hooks/useAppStatus';
import { prefetchHomeCatalog } from '@/hooks/useCatalog';
import { queryClient } from '@/lib/queryClient';
import { pushAvailable, requestPushPermission } from '@/services/push';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { usePushStore } from '@/stores/pushStore';
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

/** The dissolve between shells when an admin switches to the app and back. */
const SHELL_FADE_MS = 220;

/** The screens the maintenance notice stands aside for, and no others. */
const AUTH_ROUTES: ReadonlySet<string> = new Set([
  ROUTES.LOGIN,
  ROUTES.SIGN_UP,
  ROUTES.VERIFY_EMAIL,
  ROUTES.ENTER_CODE,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
]);

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
        name={ROUTES.VERIFY_EMAIL}
        component={VerifyEmailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name={ROUTES.ENTER_CODE}
        component={EnterCodeScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name={ROUTES.FORGOT_PASSWORD}
        component={ForgotPasswordScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name={ROUTES.RESET_PASSWORD}
        component={ResetPasswordScreen}
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
  const viewingAsReader = useAuthStore(state => state.viewingAsReader);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const onboarded = useOnboardingStore(state => state.completed);
  const { isDark, colors } = useTheme();
  const [splashVisible, setSplashVisible] = useState(true);

  const sessionReady = isHydrated && roleResolved;
  const hideSplash = useCallback(() => setSplashVisible(false), []);

  // Which shell an admin gets. The role decides whether the admin tool is
  // available at all; the flag decides whether they are in it right now. An
  // admin using the app as a reader is still an admin everywhere else —
  // access, the paywall, the signed-URL function all read `isAdmin` directly.
  const showAdmin = isAdmin && !viewingAsReader;

  // Set by "Admin sign-in" on the maintenance notice; see "The admin's way
  // through the door" below.
  const [signingInThroughGate, setSigningInThroughGate] = useState(false);

  // A returning reader never sees first-run, even on a reinstall where the
  // onboarding flag was cleared but the session survived in the keychain.
  // Someone coming through the maintenance notice to sign in is not on
  // first-run either — they asked for a screen, not a tour.
  const needsOnboarding =
    !onboarded && !isAuthenticated && !isAdmin && !signingInThroughGate;

  // ── The door ─────────────────────────────────────────────────────────────
  // Maintenance and the version floor are read under the splash, in the same
  // hold as the feed, and refreshed on every return to the foreground. Either
  // replaces the reader shells wholesale; admins are never held out, so the
  // switches can always be reached to turn them off. The splash waits for
  // the answer (within the same cap as the feed) so a reader is never shown
  // Home for a beat before the notice slides over it.
  const appGate = useAppGate();
  const [appStatusSettled, setAppStatusSettled] = useState(false);

  // ── The admin's way through the door ────────────────────────────────────
  // The notice replaces the reader shell, sign-in screens included — so a
  // signed-out admin could never reach the switch that lifts it. "Admin
  // sign-in" on the notice mounts the reader shell on Login instead, and
  // the gate stays down only while the sign-in screens are in front: it
  // comes back the moment the route leaves them (guest, back) or a session
  // resolves as a reader. An admin session takes the admin shell anyway.
  const userId = useAuthStore(state => state.userId);
  const accessCheckedFor = useAuthStore(state => state.accessCheckedFor);
  const gate = signingInThroughGate ? null : appGate;

  const signInThroughGate = useCallback(() => {
    const auth = useAuthStore.getState();
    // A reader is already signed in: the admin has to replace that session.
    const start = () => {
      useOnboardingStore.getState().requestSignIn();
      setSigningInThroughGate(true);
    };
    if (auth.isAuthenticated) {
      void auth.signOut().finally(start);
    } else {
      start();
    }
  }, []);

  useEffect(() => {
    if (!signingInThroughGate) {
      return;
    }
    const readerSignedIn =
      isAuthenticated && !isAdmin && accessCheckedFor === userId;
    if (isAdmin || readerSignedIn) {
      setSigningInThroughGate(false);
    }
  }, [
    accessCheckedFor,
    isAdmin,
    isAuthenticated,
    signingInThroughGate,
    userId,
  ]);

  const onNavigationStateChange = useCallback(() => {
    if (!signingInThroughGate) {
      return;
    }
    const current = navigationRef.getCurrentRoute()?.name;
    if (current && !AUTH_ROUTES.has(current)) {
      setSigningInThroughGate(false);
    }
  }, [signingInThroughGate]);

  // Re-run on every change of account, not just once: the session provider
  // clears the whole query cache when the signed-in user changes, and the
  // observers above do not refetch on their own after a clear. Until this
  // lands the readers hold the last answer they had, so nothing blinks.
  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    let mounted = true;
    void prefetchAppStatus(queryClient).finally(() => {
      if (mounted) {
        setAppStatusSettled(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, [isHydrated, userId]);

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
  const landsOnHome = !showAdmin && !needsOnboarding;

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
    sessionReady &&
    (!landsOnHome || (homeFeedSettled && appStatusSettled) || feedHoldExpired);

  // ── Push notifications ────────────────────────────────────────────────────
  // A tapped notification can only land in the reader app: the admin tool
  // and first-run have none of its routes. The ref parks the intent until
  // this says the consumer shell is up — and the splash is gone, so a cold
  // start from a tap does not navigate underneath the logo.
  const consumerShellUp =
    sessionReady && !showAdmin && !needsOnboarding && gate === null;
  useEffect(() => {
    setConsumerShellReady(consumerShellUp && !splashVisible);
    return () => setConsumerShellReady(false);
  }, [consumerShellUp, splashVisible]);

  // The admin tool has one push of its own — a reader asking to delete their
  // account — and it lands on People → Deletions. Same parking rule.
  const adminShellUp = sessionReady && showAdmin;
  useEffect(() => {
    setAdminShellReady(adminShellUp && !splashVisible);
    return () => setAdminShellReady(false);
  }, [adminShellUp, splashVisible]);

  // The OS permission prompt, once. Asked after the splash lifts on Home, so
  // the first thing a reader sees is the app and not a system dialog — or
  // over the admin tool, which has a push of its own to receive. Declining
  // is remembered by the OS; the Notifications screen points at the
  // device's settings from then on.
  useEffect(() => {
    if (
      splashVisible ||
      !(consumerShellUp || adminShellUp) ||
      !pushAvailable()
    ) {
      return;
    }
    const push = usePushStore.getState();
    if (push.promptedAt) {
      return;
    }
    push.markPrompted();
    void requestPushPermission().then(result => {
      if (result === 'granted') {
        usePushStore.getState().requestSync();
      }
    });
  }, [adminShellUp, consumerShellUp, splashVisible]);

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
        <NavigationContainer
          ref={navigationRef}
          theme={navigationTheme}
          onReady={onNavigationReady}
          onStateChange={onNavigationStateChange}
        >
          {/* The three shells are separate trees, so a change of shell is a
              remount. Keyed and faded in, so an admin stepping between the
              tool and the app sees a dissolve rather than a hard cut. At
              launch the splash is still over this, so the fade costs nothing
              there. */}
          <Animated.View
            key={
              showAdmin
                ? 'admin'
                : gate
                  ? `gate:${gate}`
                  : needsOnboarding
                    ? 'onboarding'
                    : 'app'
            }
            entering={FadeIn.duration(SHELL_FADE_MS)}
            style={styles.root}
          >
            {showAdmin ? (
              <AdminNavigator />
            ) : gate ? (
              <AppGateScreen gate={gate} onAdminSignIn={signInThroughGate} />
            ) : needsOnboarding ? (
              <OnboardingNavigator />
            ) : (
              <ConsumerNavigator />
            )}
          </Animated.View>
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
