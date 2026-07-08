import { memo } from 'react';
import { Switch, View } from 'react-native';

import { Text } from '@/components/ui';
import { palette } from '@/theme/palette';

type ProfileToggleRowProps = {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
};

export const ProfileToggleRow = memo(function ProfileToggleRow({
  label,
  description,
  value,
  onValueChange,
  isLast = false,
}: ProfileToggleRowProps) {
  return (
    <View
      className={`min-h-[52px] flex-row items-center gap-3 px-4 py-3 ${
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
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#D8E0D9', true: palette.green }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
});
