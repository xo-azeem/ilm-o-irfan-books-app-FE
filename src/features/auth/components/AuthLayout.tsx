import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

import { DiagonalTexture, Display, IconButton, RadialGlow, Text } from '@/components/ui';
import { layout } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

export type AuthLayoutProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  onBack?: () => void;
}>;

/**
 * The shared frame for sign-in, sign-up and the first-run flow: a woven
 * diagonal texture, a single green bloom behind the heading, and a serif title
 * that carries the whole page.
 */
export function AuthLayout({ title, subtitle, footer, onBack, children }: AuthLayoutProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <DiagonalTexture color={colors.primary} opacity={0.07} angle={115} />
      <RadialGlow
        color={colors.primary}
        opacity={0.28}
        size={460}
        top={-140}
        left={-35}
        style={styles.glow}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 20) + 20 },
          ]}>
          {onBack ? (
            <IconButton
              icon={ChevronLeft}
              onPress={onBack}
              variant="plain"
              buttonSize={36}
              accessibilityLabel="Go back"
              style={styles.back}
            />
          ) : null}

          <View style={styles.heading}>
            <Display size={38} tracking={-0.6}>
              {title}
            </Display>
            {subtitle ? (
              <Text size={fontSize.bodySmall} leading={1.6} tone="muted">
                {subtitle}
              </Text>
            ) : null}
          </View>

          <View style={styles.body}>{children}</View>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  glow: {
    // Centres the bloom on the heading rather than the screen.
    left: '50%',
    marginLeft: -230,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPadding + 6,
    gap: 26,
  },
  back: {
    alignSelf: 'flex-start',
  },
  heading: {
    gap: 10,
    marginTop: 24,
  },
  body: {
    gap: 26,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 24,
    alignItems: 'center',
  },
});
