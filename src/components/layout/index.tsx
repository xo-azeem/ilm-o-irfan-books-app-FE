import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, ScrollView, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useAppInsets } from '@/hooks/useAppInsets';
import { DisplayText, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

type ScreenProps = PropsWithChildren<{
  scrollable?: boolean;
  contentContainerClassName?: string;
  safeAreaEdges?: Edge[];
  scrollViewProps?: Omit<ScrollViewProps, 'children' | 'className' | 'contentContainerClassName'>;
}>;

export function Screen({
  children,
  scrollable = true,
  contentContainerClassName,
  safeAreaEdges = ['top', 'left', 'right'],
  scrollViewProps,
}: ScreenProps) {
  const { scrollEndPadding, contentBottomInset } = useAppInsets();

  if (!scrollable) {
    return (
      <SafeAreaView
        className="flex-1 bg-app-bg dark:bg-app-bg-dark"
        edges={safeAreaEdges}>
        <View
          className={`flex-1 ${contentContainerClassName ?? 'px-5'}`}
          style={{ paddingBottom: contentBottomInset }}>
          {children}
        </View>
      </SafeAreaView>
    );
  }

  const { contentContainerStyle, ...restScrollProps } = scrollViewProps ?? {};

  return (
    <SafeAreaView
      className="flex-1 bg-app-bg dark:bg-app-bg-dark"
      edges={safeAreaEdges}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName={`pt-1 ${contentContainerClassName ?? 'px-5'}`}
        contentContainerStyle={[
          { paddingBottom: scrollEndPadding },
          contentContainerStyle,
        ]}
        {...restScrollProps}>
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
        <DisplayText className="text-[34px] font-bold leading-[41px] tracking-tight text-app-ink dark:text-app-ink-dark">
          {title}
        </DisplayText>
        {subtitle ? (
          <Text className="text-[15px] leading-5 text-app-muted dark:text-app-muted-dark">
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
        <Text className="px-1 text-[13px] font-medium uppercase tracking-widest text-app-muted dark:text-app-muted-dark">
          {title}
        </Text>
      ) : null}
      <View className="overflow-hidden rounded-[14px] bg-app-surface dark:bg-app-surface-dark">
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
  onPress,
}: ListRowProps) {
  const { colors } = useTheme();
  const rowClassName = `min-h-[52px] flex-row items-center gap-3 px-4 py-3 ${
    !isLast ? 'border-b border-app-border dark:border-app-border-dark' : ''
  }`;

  const content = (
    <>
      {leading}
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          className="text-[17px] leading-[22px] text-app-ink dark:text-app-ink-dark"
          numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            className="text-[13px] leading-[18px] text-app-muted dark:text-app-muted-dark"
            numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </>
  );

  if (onPress) {
    const pressHighlight = colors.fill;

    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) =>
          pressed ? { backgroundColor: pressHighlight } : undefined
        }
        className={rowClassName}
        accessibilityRole="button">
        {content}
      </Pressable>
    );
  }

  return <View className={rowClassName}>{content}</View>;
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
  accentClassName = 'bg-app-fill dark:bg-app-fill-dark',
}: MediaCardProps) {
  return (
    <View className="overflow-hidden rounded-[16px] bg-app-surface dark:bg-app-surface-dark">
      <View className={`h-28 w-full ${accentClassName}`} />
      <View className="gap-1 p-4">
        <DisplayText className="text-[17px] font-semibold leading-[22px] text-app-ink dark:text-app-ink-dark">
          {title}
        </DisplayText>
        <Text className="text-[15px] leading-5 text-app-muted dark:text-app-muted-dark">
          {subtitle}
        </Text>
        {meta ? (
          <Text className="pt-1 text-[13px] text-app-muted dark:text-app-muted-dark">
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
    <View className="items-center justify-center rounded-[16px] bg-app-surface px-6 py-12 dark:bg-app-surface-dark">
      <DisplayText className="mb-2 text-center text-[17px] font-semibold text-app-ink dark:text-app-ink-dark">
        {title}
      </DisplayText>
      <Text className="max-w-[260px] text-center text-[15px] leading-5 text-app-muted dark:text-app-muted-dark">
        {message}
      </Text>
    </View>
  );
}
