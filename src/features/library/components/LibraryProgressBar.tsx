import { memo } from 'react';
import { View } from 'react-native';

type LibraryProgressBarProps = {
  value: number;
};

export const LibraryProgressBar = memo(function LibraryProgressBar({
  value,
}: LibraryProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-app-fill dark:bg-app-fill-dark">
      <View
        className="h-full rounded-full bg-app-primary dark:bg-app-primary-dark"
        style={{ width: `${Math.round(clamped * 100)}%` }}
      />
    </View>
  );
});
