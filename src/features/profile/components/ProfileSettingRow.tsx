import { memo } from 'react';
import { Pressable, View, useColorScheme } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { ListRow } from '@/components/layout';
import { Text } from '@/components/ui';
import { theme } from '@/theme/palette';
import type { ProfileRow } from '@/features/profile/data/profileContent';

type ProfileSettingRowProps = {
  row: ProfileRow;
  isLast: boolean;
  onPress?: () => void;
};

export const ProfileSettingRow = memo(function ProfileSettingRow({
  row,
  isLast,
  onPress,
}: ProfileSettingRowProps) {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? theme.dark : theme.light;
  const accent = isDark ? row.accentDark : row.accent;
  const Icon = row.icon;

  if (row.destructive) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        className="min-h-[52px] flex-row items-center justify-center gap-2 px-4 py-3 active:opacity-55">
        <Icon size={16} color={accent} strokeWidth={2} />
        <Text className="text-[16px] font-semibold" style={{ color: accent }}>
          {row.label}
        </Text>
      </Pressable>
    );
  }

  return (
    <ListRow
      title={row.label}
      leading={
        <View
          className="h-8 w-8 items-center justify-center rounded-[9px]"
          style={{ backgroundColor: `${accent}${isDark ? '20' : '12'}` }}>
          <Icon size={16} color={accent} strokeWidth={1.9} />
        </View>
      }
      trailing={
        <View className="flex-row items-center gap-1.5">
          {row.value ? (
            <Text className="text-[15px] text-app-faint dark:text-app-faint-dark">
              {row.value}
            </Text>
          ) : null}
          <ChevronRight color={colors.faint} size={15} strokeWidth={2.25} />
        </View>
      }
      isLast={isLast}
      onPress={onPress}
    />
  );
});
