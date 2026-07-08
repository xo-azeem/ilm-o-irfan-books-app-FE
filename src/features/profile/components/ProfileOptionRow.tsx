import { memo } from 'react';
import { Pressable, View, useColorScheme } from 'react-native';
import { Check } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { theme } from '@/theme/palette';

type ProfileOptionRowProps = {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  isLast?: boolean;
};

export const ProfileOptionRow = memo(function ProfileOptionRow({
  label,
  description,
  selected,
  onPress,
  isLast = false,
}: ProfileOptionRowProps) {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? theme.dark : theme.light;

  return (
    <Pressable
      onPress={onPress}
      className={`min-h-[52px] flex-row items-center gap-3 px-4 py-3 active:opacity-60 ${
        !isLast ? 'border-b border-app-border dark:border-app-border-dark' : ''
      }`}>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-[17px] leading-[22px] text-app-ink dark:text-app-ink-dark">
          {label}
        </Text>
        {description ? (
          <Text className="text-[13px] leading-[18px] text-app-muted dark:text-app-muted-dark">
            {description}
          </Text>
        ) : null}
      </View>
      {selected ? <Check size={18} color={colors.primary} strokeWidth={2.5} /> : null}
    </Pressable>
  );
});
