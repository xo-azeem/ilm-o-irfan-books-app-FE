import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { DisplayText, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

type ExploreSectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  trailing?: ReactNode;
};

export function ExploreSectionHeader({
  title,
  subtitle,
  actionLabel = 'See all',
  onActionPress,
  trailing,
}: ExploreSectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View className="mb-4 flex-row items-end justify-between gap-3">
      <View className="min-w-0 flex-1 gap-0.5">
        <DisplayText className="text-[20px] font-semibold tracking-tight text-app-ink dark:text-app-ink-dark">
          {title}
        </DisplayText>
        {subtitle ? (
          <Text className="text-[13px] text-app-muted dark:text-app-muted-dark">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ??
        (onActionPress ? (
          <Pressable
            onPress={onActionPress}
            className="flex-row items-center gap-0.5 active:opacity-60">
            <Text className="text-[14px] font-medium text-app-primary dark:text-app-primary-dark">
              {actionLabel}
            </Text>
            <ChevronRight size={16} color={colors.primary} strokeWidth={2} />
          </Pressable>
        ) : null)}
    </View>
  );
}
