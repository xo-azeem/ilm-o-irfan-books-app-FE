import { memo } from 'react';
import { View } from 'react-native';

import { DisplayText, Text } from '@/components/ui';
import type { ProfileStat } from '@/features/profile/data/profileContent';

type ProfileStatsRowProps = {
  stats: ProfileStat[];
};

export const ProfileStatsRow = memo(function ProfileStatsRow({
  stats,
}: ProfileStatsRowProps) {
  return (
    <View className="mb-8 overflow-hidden rounded-[16px] bg-app-surface dark:bg-app-surface-dark">
      <View className="flex-row items-center py-4">
        {stats.map((stat, index) => (
          <View key={stat.id} className="flex-1 flex-row items-center">
            <View className="flex-1 items-center px-2">
              <DisplayText className="text-[20px] font-bold text-app-ink dark:text-app-ink-dark">
                {stat.value}
              </DisplayText>
              <Text className="mt-1 text-center text-[12px] font-medium text-app-muted dark:text-app-muted-dark">
                {stat.label}
              </Text>
            </View>
            {index < stats.length - 1 ? (
              <View className="h-9 w-px bg-app-border dark:bg-app-border-dark" />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
});
