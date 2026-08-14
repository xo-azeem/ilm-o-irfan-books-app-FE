import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

import { AppLogo } from '@/components/brand';
import { DisplayText, Text } from '@/components/ui';
import { APP_LOGO_SIZE } from '@/constants/images';
import { useTheme } from '@/theme/ThemeContext';

type AuthLayoutProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  footer?: ReactNode;
  onBack?: () => void;
}>;

export function AuthLayout({
  title,
  subtitle,
  footer,
  onBack,
  children,
}: AuthLayoutProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      className="flex-1 bg-app-bg dark:bg-app-bg-dark"
      edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="flex-grow px-5 pt-1 pb-8">
          {onBack ? (
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={12}
              className="-ml-1 mb-5 flex-row items-center gap-0.5 self-start py-1 active:opacity-60">
              <ChevronLeft size={22} color={colors.primary} strokeWidth={2.25} />
              <Text className="text-[17px] font-medium text-app-primary dark:text-app-primary-dark">
                Back
              </Text>
            </Pressable>
          ) : null}

          <View className="mb-8 gap-5">
            <AppLogo size={APP_LOGO_SIZE} />
            <View className="gap-1">
              <DisplayText className="text-[34px] font-bold leading-[41px] tracking-tight text-app-ink dark:text-app-ink-dark">
                {title}
              </DisplayText>
              <Text className="text-[15px] leading-5 text-app-muted dark:text-app-muted-dark">
                {subtitle}
              </Text>
            </View>
          </View>

          <View className="gap-6">{children}</View>

          {footer ? (
            <View className="mt-8 items-center">{footer}</View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
