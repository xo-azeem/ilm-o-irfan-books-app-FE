import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';

type ScreenProps = PropsWithChildren<{
  scrollable?: boolean;
  contentContainerClassName?: string;
  scrollViewProps?: Omit<ScrollViewProps, 'children' | 'className' | 'contentContainerClassName'>;
}>;

export function Screen({
  children,
  scrollable = true,
  contentContainerClassName,
  scrollViewProps,
}: ScreenProps) {
  if (!scrollable) {
    return (
      <SafeAreaView
        className="flex-1 bg-ios-bg dark:bg-ios-bg-dark"
        edges={['top']}>
        <View className={`flex-1 px-5 ${contentContainerClassName ?? ''}`}>
          {children}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-ios-bg dark:bg-ios-bg-dark"
      edges={['top']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName={`px-5 pb-28 pt-2 ${contentContainerClassName ?? ''}`}
        {...scrollViewProps}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  return (
    <View className="mb-6 flex-row items-end justify-between gap-4">
      <View className="flex-1 gap-1">
        <Text className="text-[34px] font-bold leading-[41px] tracking-tight text-ios-label dark:text-ios-label-dark">
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-[15px] leading-5 text-ios-secondary dark:text-ios-secondary-dark">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

type SectionProps = PropsWithChildren<{
  title?: string;
  className?: string;
}>;

export function Section({ title, children, className }: SectionProps) {
  return (
    <View className={`gap-2 ${className ?? ''}`}>
      {title ? (
        <Text className="px-1 text-[13px] font-normal uppercase tracking-wide text-ios-secondary dark:text-ios-secondary-dark">
          {title}
        </Text>
      ) : null}
      <View className="overflow-hidden rounded-[14px] bg-ios-surface dark:bg-ios-surface-dark">
        {children}
      </View>
    </View>
  );
}

type ListRowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  isLast?: boolean;
  onPress?: () => void;
};

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  isLast = false,
}: ListRowProps) {
  return (
    <View
      className={`min-h-[52px] flex-row items-center gap-3 px-4 py-3 ${
        !isLast ? 'border-b border-ios-separator dark:border-ios-separator-dark' : ''
      }`}>
      {leading}
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          className="text-[17px] leading-[22px] text-ios-label dark:text-ios-label-dark"
          numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            className="text-[13px] leading-[18px] text-ios-secondary dark:text-ios-secondary-dark"
            numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

type MediaCardProps = {
  title: string;
  subtitle: string;
  meta?: string;
  accentClassName?: string;
};

export function MediaCard({
  title,
  subtitle,
  meta,
  accentClassName = 'bg-ios-fill dark:bg-ios-fill-dark',
}: MediaCardProps) {
  return (
    <View className="overflow-hidden rounded-[16px] bg-ios-surface dark:bg-ios-surface-dark">
      <View className={`h-28 w-full ${accentClassName}`} />
      <View className="gap-1 p-4">
        <Text className="text-[17px] font-semibold leading-[22px] text-ios-label dark:text-ios-label-dark">
          {title}
        </Text>
        <Text className="text-[15px] leading-5 text-ios-secondary dark:text-ios-secondary-dark">
          {subtitle}
        </Text>
        {meta ? (
          <Text className="pt-1 text-[13px] text-ios-secondary dark:text-ios-secondary-dark">
            {meta}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

type EmptyStateProps = {
  title: string;
  message: string;
};

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View className="items-center justify-center rounded-[16px] bg-ios-surface px-6 py-12 dark:bg-ios-surface-dark">
      <Text className="mb-2 text-center text-[17px] font-semibold text-ios-label dark:text-ios-label-dark">
        {title}
      </Text>
      <Text className="max-w-[260px] text-center text-[15px] leading-5 text-ios-secondary dark:text-ios-secondary-dark">
        {message}
      </Text>
    </View>
  );
}
