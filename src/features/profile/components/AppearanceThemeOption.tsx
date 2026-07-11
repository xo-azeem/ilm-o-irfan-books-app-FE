import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { Text } from '@/components/ui';
import type { AppearanceOption } from '@/features/profile/data/profileContent';
import { useTheme } from '@/theme/ThemeContext';

type AppearanceThemeOptionProps = {
  option: AppearanceOption;
  selected: boolean;
  onPress: () => void;
};

export const AppearanceThemeOption = memo(function AppearanceThemeOption({
  option,
  selected,
  onPress,
}: AppearanceThemeOptionProps) {
  const { colors } = useTheme();
  const Icon = option.icon;

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3.5 rounded-[14px] border px-4 py-3.5 active:opacity-90 ${
        selected
          ? 'border-app-primary bg-app-fill dark:border-app-primary-dark dark:bg-app-fill-dark'
          : 'border-app-border bg-app-surface dark:border-app-border-dark dark:bg-app-surface-dark'
      }`}>
      <View
        className={`h-10 w-10 items-center justify-center rounded-[12px] ${
          selected ? 'bg-app-surface dark:bg-app-surface-dark' : 'bg-app-fill dark:bg-app-fill-dark'
        }`}>
        <Icon
          size={18}
          color={selected ? colors.primary : colors.muted}
          strokeWidth={1.75}
        />
      </View>

      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-[16px] font-semibold text-app-ink dark:text-app-ink-dark">
          {option.label}
        </Text>
        <Text className="text-[13px] leading-[18px] text-app-muted dark:text-app-muted-dark">
          {option.description}
        </Text>
      </View>

      {selected ? (
        <Check size={20} color={colors.primary} strokeWidth={2.25} />
      ) : (
        <View className="h-5 w-5" />
      )}
    </Pressable>
  );
});
