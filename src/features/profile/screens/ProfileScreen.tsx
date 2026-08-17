import { useCallback } from 'react';
import { Alert, View } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bookmark, Flame } from 'lucide-react-native';

import type { RootStackParamList } from '@/app/navigation/types';
import { GuestAuthPanel } from '@/components/auth/GuestAuthPanel';
import { Screen, Section } from '@/components/layout';
import { Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import {
  profileGroups,
} from '@/features/profile/data/profileContent';
import { useLibrary, useProfile, useSubscription } from '@/hooks/useAccount';
import type { ProfileStackParamList, ProfileStackScreen } from '@/features/profile/navigation/types';
import { useAuthStore } from '@/stores/authStore';
import { THEME_PREFERENCE_LABELS, useThemeStore } from '@/stores/themeStore';
import { palette } from '@/theme/palette';

import { ProfileAchievements } from '../components/ProfileAchievements';
import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileSettingRow } from '../components/ProfileSettingRow';

export function ProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const signOut = useAuthStore(state => state.signOut);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const themePreference = useThemeStore(state => state.themePreference);
  const { data: profile } = useProfile();
  const { data: library } = useLibrary();
  const { data: subscription } = useSubscription();
  const profileUser = {
    name: profile?.fullName || 'Your profile',
    email: profile?.email || '',
    initials: (profile?.fullName || 'Y').split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase(),
    memberSince: profile?.memberSince || '',
    plan: subscription?.active ? subscription.plan?.name ?? 'Premium' : 'Free',
  };
  const profileAchievements = [
    { id: 'achievement-streak', label: 'Day streak', value: String(library?.streak ?? 0), caption: 'Keep the momentum', icon: Flame, accent: palette.sunflower, accentDark: palette.sunflower },
    { id: 'achievement-saved', label: 'Saved', value: String(library?.wishlistCount ?? 0), caption: 'In your library', icon: Bookmark, accent: palette.green, accentDark: palette.yellowGreen },
  ];
  const profileLessonsSummary = { label: 'Lessons', value: String(library?.progress.length ?? 0) };
  const dynamicGroups = profileGroups
    .map(group => ({
      ...group,
      rows: group.rows
        .filter(row => isAuthenticated || row.id !== 'row-signout')
        .map(row =>
          row.id === 'row-downloads'
            ? { ...row, value: String(library?.downloads.length ?? 0) }
            : row.id === 'row-subscription'
              ? { ...row, value: profileUser.plan }
              : row,
        ),
    }))
    .filter(group => group.rows.length > 0);

  const handleEditProfile = useCallback(() => {
    if (!isAuthenticated) {
      rootNavigation.navigate(ROUTES.LOGIN);
      return;
    }
    navigation.navigate('PersonalDetails');
  }, [isAuthenticated, navigation, rootNavigation]);

  const handleRowPress = useCallback(
    (rowId: string, screen?: ProfileStackScreen) => {
      if (rowId === 'row-signout') {
        Alert.alert('Sign out', 'Are you sure you want to sign out?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign out',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                try {
                  await signOut();
                } catch {
                  // Local state still clears in the store finally block.
                }
                rootNavigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: ROUTES.MAIN_TABS }],
                  }),
                );
              })();
            },
          },
        ]);
        return;
      }

      const needsAuth =
        screen === 'PersonalDetails' ||
        screen === 'Subscription' ||
        screen === 'Downloads';

      if (needsAuth && !isAuthenticated) {
        rootNavigation.navigate(ROUTES.LOGIN);
        return;
      }

      if (screen) {
        navigation.navigate(screen);
      }
    },
    [isAuthenticated, navigation, rootNavigation, signOut],
  );

  return (
    <Screen contentContainerClassName="px-5 pt-0">
      {isAuthenticated ? (
        <ProfileHeader user={profileUser} onEdit={handleEditProfile} />
      ) : (
        <View className="mb-7 mt-2">
          <GuestAuthPanel
            title="Sign in to your library"
            message="Browse freely. Sign in to manage your profile, subscription, and downloads."
          />
        </View>
      )}

      <View className="gap-7">
        {isAuthenticated ? (
          <ProfileAchievements
            achievements={profileAchievements}
            lessonsLabel={profileLessonsSummary.label}
            lessonsValue={profileLessonsSummary.value}
          />
        ) : null}

        {dynamicGroups.map(group => (
          <Section key={group.id} title={group.title || undefined}>
            {group.rows.map((row, index) => (
              <ProfileSettingRow
                key={row.id}
                row={
                  row.id === 'row-appearance'
                    ? { ...row, value: THEME_PREFERENCE_LABELS[themePreference] }
                    : row
                }
                isLast={index === group.rows.length - 1}
                onPress={() => handleRowPress(row.id, row.screen)}
              />
            ))}
          </Section>
        ))}
      </View>

      <Text className="mt-8 pb-2 text-center text-[12px] text-app-faint dark:text-app-faint-dark">
        Ilm o Irfan · v1.0.0
      </Text>
    </Screen>
  );
}
