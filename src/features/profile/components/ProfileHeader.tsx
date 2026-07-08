import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Pencil } from 'lucide-react-native';

import { DisplayText, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';
import type { ProfileUser } from '@/features/profile/data/profileContent';

type ProfileHeaderProps = {
  user: ProfileUser;
  onEdit?: () => void;
};

export const ProfileHeader = memo(function ProfileHeader({
  user,
  onEdit,
}: ProfileHeaderProps) {
  const { colors } = useTheme();

  return (
    <View className="mb-8 items-center px-2 pt-1">
      <View className="relative mb-5">
        <View className="h-[88px] w-[88px] items-center justify-center rounded-full bg-app-primary dark:bg-app-primary-dark">
          <DisplayText className="text-[30px] font-bold text-app-on-primary dark:text-app-on-primary-dark">
            {user.initials}
          </DisplayText>
        </View>

        <Pressable
          onPress={onEdit}
          accessibilityLabel="Edit profile"
          accessibilityRole="button"
          className="absolute -bottom-0.5 -right-0.5 h-9 w-9 items-center justify-center rounded-full border-2 border-app-bg bg-app-surface active:opacity-70 dark:border-app-bg-dark dark:bg-app-surface-dark">
          <Pencil size={15} color={colors.primary} strokeWidth={2} />
        </Pressable>
      </View>

      <DisplayText className="text-center text-[24px] font-bold leading-[28px] text-app-ink dark:text-app-ink-dark">
        {user.name}
      </DisplayText>

      <View className="mt-2.5 rounded-full bg-app-fill px-3 py-1 dark:bg-app-fill-dark">
        <Text className="text-[11px] font-semibold uppercase tracking-wide text-app-primary dark:text-app-primary-dark">
          {user.plan}
        </Text>
      </View>

      <Text className="mt-4 text-center text-[15px] text-app-muted dark:text-app-muted-dark">
        {user.email}
      </Text>

      <Text className="mt-1 text-center text-[13px] text-app-faint dark:text-app-faint-dark">
        {user.memberSince}
      </Text>
    </View>
  );
});
