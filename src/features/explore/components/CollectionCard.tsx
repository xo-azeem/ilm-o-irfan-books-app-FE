import { Pressable, View } from 'react-native';

import { DisplayText, Text } from '@/components/ui';

type CollectionCardProps = {
  title: string;
  subtitle: string;
  bookCount: number;
  accent: string;
  onPress?: () => void;
};

export function CollectionCard({
  title,
  subtitle,
  bookCount,
  accent,
  onPress,
}: CollectionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="min-w-[260px] flex-1 overflow-hidden rounded-2xl border border-app-border bg-app-surface p-4 dark:border-app-border-dark dark:bg-app-surface-dark active:opacity-90">
      <View
        className="mb-3 h-0.5 w-8 rounded-full"
        style={{ backgroundColor: accent }}
      />
      <DisplayText className="mb-1 text-[16px] font-semibold text-app-ink dark:text-app-ink-dark">
        {title}
      </DisplayText>
      <Text className="mb-3 text-[13px] leading-[18px] text-app-muted dark:text-app-muted-dark">
        {subtitle}
      </Text>
      <Text className="text-[12px] font-medium text-app-primary dark:text-app-primary-dark">
        {bookCount} books →
      </Text>
    </Pressable>
  );
}
