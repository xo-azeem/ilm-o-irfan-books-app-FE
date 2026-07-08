import { memo } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';

type ProfileInfoFieldProps = {
  label: string;
  value: string;
  isLast?: boolean;
};

export const ProfileInfoField = memo(function ProfileInfoField({
  label,
  value,
  isLast = false,
}: ProfileInfoFieldProps) {
  return (
    <View
      className={`gap-1 px-4 py-3.5 ${
        !isLast ? 'border-b border-app-border dark:border-app-border-dark' : ''
      }`}>
      <Text className="text-[12px] font-medium uppercase tracking-wide text-app-muted dark:text-app-muted-dark">
        {label}
      </Text>
      <Text className="text-[17px] leading-[22px] text-app-ink dark:text-app-ink-dark">
        {value}
      </Text>
    </View>
  );
});
