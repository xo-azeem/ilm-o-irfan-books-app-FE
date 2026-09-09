import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/app/navigation/types';
import { api } from '@/api';
import type { Profile } from '@/api/types';
import { Screen, Section } from '@/components/layout';
import { ROUTES } from '@/constants/routes';
import {
  profileAchievements,
  profileGroups,
  profileLessonsSummary,
  type ProfileUser,
} from '@/features/profile/data/profileContent';
import type { ProfileStackParamList, ProfileStackScreen } from '@/features/profile/navigation/types';
import { useAuthStore } from '@/stores/authStore';
import { useEntitlementStore } from '@/stores/entitlementStore';
import { THEME_PREFERENCE_LABELS, useThemeStore } from '@/stores/themeStore';
import { palette } from '@/theme/palette';

import { ProfileAchievements } from '../components/ProfileAchievements';
import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileSettingRow } from '../components/ProfileSettingRow';

function initialsFromName(name: string | null | undefined, email: string | null): string {
  const source = (name || email || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function ProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const signOut = useAuthStore(state => state.signOut);
  const themePreference = useThemeStore(state => state.themePreference);
  const canAccessPremium = useEntitlementStore(s => s.canAccessPremium);
  const entitlement = useEntitlementStore(s => s.status);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.profileRead();
        if (!cancelled) {
          setProfile(data);
        }
      } catch {
        if (!cancelled) {
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const user: ProfileUser = useMemo(() => {
    const name = profile?.full_name || 'Reader';
    const email = profile?.email || '';
    const year = profile?.created_at
      ? new Date(profile.created_at).getFullYear()
      : new Date().getFullYear();
    return {
      name,
      email,
      initials: initialsFromName(profile?.full_name, profile?.email ?? null),
      memberSince: `Member since ${year}`,
      plan: canAccessPremium
        ? entitlement?.isAdmin
          ? 'Admin'
          : 'Premium'
        : 'Free',
    };
  }, [profile, canAccessPremium, entitlement?.isAdmin]);

  const handleEditProfile = useCallback(() => {
    navigation.navigate('PersonalDetails');
  }, [navigation]);

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
                await signOut();
                rootNavigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: ROUTES.LOGIN }],
                  }),
                );
              })();
            },
          },
        ]);
        return;
      }

      if (screen) {
        navigation.navigate(screen);
      }
    },
    [navigation, rootNavigation, signOut],
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg dark:bg-app-bg-dark">
        <ActivityIndicator size="large" color={palette.green} />
      </View>
    );
  }

  return (
    <Screen contentContainerClassName="px-5 pt-0">
      <ProfileHeader user={user} onEdit={handleEditProfile} />

      <View className="gap-7">
        <ProfileAchievements
          achievements={profileAchievements}
          lessonsLabel={profileLessonsSummary.label}
          lessonsValue={profileLessonsSummary.value}
        />

        {profileGroups.map(group => (
          <Section key={group.id} title={group.title || undefined}>
            {group.rows.map((row, index) => (
              <ProfileSettingRow
                key={row.id}
                row={
                  row.id === 'row-appearance'
                    ? {
                        ...row,
                        value: THEME_PREFERENCE_LABELS[themePreference],
                      }
                    : row.id === 'row-subscription'
                      ? {
                          ...row,
                          value: user.plan,
                        }
                      : row
                }
                isLast={index === group.rows.length - 1}
                onPress={() => handleRowPress(row.id, row.screen)}
              />
            ))}
          </Section>
        ))}
      </View>
    </Screen>
  );
}
