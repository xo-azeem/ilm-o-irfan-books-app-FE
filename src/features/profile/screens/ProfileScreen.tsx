import { useCallback } from 'react';
import { Alert, View } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/app/navigation/types';
import { Screen, Section } from '@/components/layout';
import { Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import {
  profileAchievements,
  profileGroups,
  profileLessonsSummary,
  profileUser,
} from '@/features/profile/data/profileContent';
import type { ProfileStackParamList, ProfileStackScreen } from '@/features/profile/navigation/types';
import { useAuthStore } from '@/stores/authStore';
import { THEME_PREFERENCE_LABELS, useThemeStore } from '@/stores/themeStore';

import { ProfileAchievements } from '../components/ProfileAchievements';
import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileSettingRow } from '../components/ProfileSettingRow';

export function ProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const signOut = useAuthStore(state => state.signOut);
  const themePreference = useThemeStore(state => state.themePreference);

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
              signOut();
              rootNavigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: ROUTES.LOGIN }],
                }),
              );
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

  return (
    <Screen contentContainerClassName="px-5 pt-0">
      <ProfileHeader user={profileUser} onEdit={handleEditProfile} />

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
