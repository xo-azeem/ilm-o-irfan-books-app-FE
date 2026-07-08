import { memo } from 'react';
import { View } from 'react-native';

import { Screen, ScreenHeader, Section } from '@/components/layout';
import { Text } from '@/components/ui';
import {
  profileGroups,
  profileStats,
  profileUser,
} from '@/features/profile/data/profileContent';

import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileSettingRow } from '../components/ProfileSettingRow';
import { ProfileStatsRow } from '../components/ProfileStatsRow';

export const ProfileScreen = memo(function ProfileScreen() {
  return (
    <Screen contentContainerClassName="px-5 pt-0">
      <ScreenHeader title="Profile" />

      <ProfileHeader user={profileUser} />

      <ProfileStatsRow stats={profileStats} />

      <View className="gap-7">
        {profileGroups.map(group => (
          <Section key={group.id} title={group.title || undefined}>
            {group.rows.map((row, index) => (
              <ProfileSettingRow
                key={row.id}
                row={row}
                isLast={index === group.rows.length - 1}
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
});
