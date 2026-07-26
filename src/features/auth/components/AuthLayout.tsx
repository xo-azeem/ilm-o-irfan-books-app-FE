import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

import { AppLogo } from '@/components/brand';
import { DisplayText, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

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
  const { colors } = useTheme();
  const layout = useAuthLayoutMetrics(scrollable);

  const header = (
    <View style={{ gap: layout.headerGap }}>
      <AppLogo size={layout.logoSize} />
      <View style={{ gap: 8, maxWidth: 340 }}>
        <DisplayText
          className="font-bold tracking-tight text-app-ink dark:text-app-ink-dark"
          style={{
            fontSize: layout.titleSize,
            lineHeight: layout.titleLineHeight,
            letterSpacing: -0.6,
          }}>
          {title}
        </DisplayText>
        <Text
          className="text-app-muted dark:text-app-muted-dark"
          style={{
            fontSize: layout.subtitleSize,
            lineHeight: Math.round(layout.subtitleSize * 1.45),
          }}>
          {subtitle}
        </Text>
      </View>
    </View>
  );

  const content = (
    <View
      style={[
        styles.content,
        {
          maxWidth: layout.contentMaxWidth,
          paddingHorizontal: layout.horizontalPadding,
          paddingTop: layout.topPad,
          paddingBottom: layout.bottomPad,
          flex: scrollable ? undefined : 1,
        },
      ]}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          style={({ pressed }) => [
            styles.backBtn,
            { opacity: pressed ? 0.55 : 1, marginBottom: layout.compact ? 8 : 12 },
          ]}>
          <ChevronLeft size={22} color={colors.primary} strokeWidth={2.25} />
          <Text
            className="text-[17px] font-medium text-app-primary dark:text-app-primary-dark"
            style={{ marginLeft: -2 }}>
            Back
          </Text>
        </Pressable>
      ) : null}

      {scrollable ? (
        <>
          <View style={{ marginTop: onBack ? 0 : layout.logoToTitleGap * 0.35 }}>
            {header}
          </View>
          <View style={{ marginTop: layout.titleToFormGap, gap: layout.sectionGap }}>
            {children}
          </View>
          {footer ? (
            <View style={{ marginTop: layout.footerGap, alignItems: 'center' }}>
              {footer}
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.fillColumn}>
          <View>
            <View style={{ marginTop: layout.logoToTitleGap * 0.4 }}>{header}</View>
            <View style={{ marginTop: layout.titleToFormGap, gap: layout.sectionGap }}>
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        {scrollable ? (
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces>
            {content}
          </ScrollView>
        ) : (
          <View className="flex-1">{content}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    alignSelf: 'center',
  },
  fillColumn: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: -6,
    paddingVertical: 4,
  },
});
