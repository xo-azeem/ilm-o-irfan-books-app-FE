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
import { palette } from '@/theme/palette';

import { useAuthLayoutMetrics } from '../hooks/useAuthLayoutMetrics';

type AuthLayoutProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  footer?: ReactNode;
  onBack?: () => void;
  scrollable?: boolean;
}>;

export function AuthLayout({
  title,
  subtitle,
  footer,
  onBack,
  scrollable = false,
  children,
}: AuthLayoutProps) {
  const layout = useAuthLayoutMetrics(scrollable);

  const header = (
    <View className="items-center">
      <AppLogo size={layout.logoSize} />
      <View
        className="items-center px-2"
        style={{ marginTop: layout.logoToTitleGap, gap: layout.titleSubtitleGap }}>
        <DisplayText
          className="text-center font-bold tracking-tight text-app-ink dark:text-app-ink-dark"
          style={{
            fontSize: layout.compact ? 26 : 28,
            lineHeight: layout.compact ? 32 : 34,
          }}>
          {title}
        </DisplayText>
        <Text
          className="max-w-[292px] text-center text-app-muted dark:text-app-muted-dark"
          style={{
            fontSize: layout.compact ? 15 : 16,
            lineHeight: layout.compact ? 22 : 24,
          }}>
          {subtitle}
        </Text>
      </View>
    </View>
  );

  const body = (
    <View
      style={{
        width: '100%',
        maxWidth: layout.contentMaxWidth,
        paddingHorizontal: layout.horizontalPadding,
        alignSelf: 'center',
        flex: scrollable ? undefined : 1,
      }}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="-ml-1 flex-row items-center gap-0.5 self-start py-1 active:opacity-60"
          style={{ marginBottom: layout.compact ? 8 : 12 }}>
          <ChevronLeft size={22} color={palette.green} strokeWidth={2.25} />
          <Text className="text-[15px] font-medium text-app-primary dark:text-app-primary-dark">
            Back
          </Text>
        </Pressable>
      ) : (
        <View style={{ height: layout.compact ? 20 : 28 }} />
      )}

      {scrollable ? (
        <>
          {header}
          <View style={{ marginTop: layout.headerToFormGap, gap: layout.blockGap }}>
            {children}
          </View>
          {footer ? (
            <View style={{ marginTop: layout.footerGap, alignItems: 'center' }}>{footer}</View>
          ) : null}
        </>
      ) : (
        <View className="flex-1 justify-between">
          <View>
            {header}
            <View style={{ marginTop: layout.headerToFormGap, gap: layout.blockGap }}>
              {children}
            </View>
          </View>
          {footer ? (
            <View style={{ paddingTop: layout.footerGap, alignItems: 'center' }}>
              {footer}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView
      className="flex-1 bg-app-bg dark:bg-app-bg-dark"
      edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scrollable ? (
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              alignItems: 'center',
              paddingBottom: layout.footerGap,
            }}>
            {body}
          </ScrollView>
        ) : (
          <View className="flex-1">{body}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
