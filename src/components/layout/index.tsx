import { memo, type PropsWithChildren, type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

import { IconButton } from '@/components/ui/Button';
import { Display, Text } from '@/components/ui/Text';
import { useAppInsets } from '@/hooks/useAppInsets';
import { layout } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

export type ScreenProps = PropsWithChildren<{
  scrollable?: boolean;
  /** Horizontal page padding. Admin screens run denser than the reader app. */
  padding?: number;
  /** Vertical rhythm between direct children. */
  gap?: number;
  /** Painted behind the content — a header wash or a blurred cover. */
  backdrop?: ReactNode;
  /** Pinned above the tab bar, e.g. an admin FAB or a sticky save bar. */
  overlay?: ReactNode;
  /** Suppresses the top safe-area inset for screens that bleed to the notch. */
  edgeToEdge?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  scrollViewProps?: Omit<ScrollViewProps, 'children' | 'contentContainerStyle'>;
}>;

/**
 * The page shell. Owns the background, the safe-area top inset and the bottom
 * clearance for the floating tab bar, so no screen has to work any of that out
 * for itself.
 */
export const Screen = memo(function Screen({
  children,
  scrollable = true,
  padding = layout.screenPadding,
  gap,
  backdrop,
  overlay,
  edgeToEdge = false,
  contentStyle,
  scrollViewProps,
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { scrollEndPadding, contentBottomInset } = useAppInsets();

  // The design places content 52px from the top of a 390×844 frame, which is
  // the status bar plus a consistent 8pt of breathing room.
  const paddingTop = edgeToEdge ? 0 : insets.top + 8;

  const inner = (
    <View style={[{ paddingHorizontal: padding, gap }, contentStyle]}>{children}</View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {backdrop}

      {scrollable ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop, paddingBottom: scrollEndPadding }}
          {...scrollViewProps}>
          {inner}
        </ScrollView>
      ) : (
        <View style={[styles.static, { paddingTop, paddingBottom: contentBottomInset }]}>
          {inner}
        </View>
      )}

      {overlay}
    </View>
  );
});

export type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** Right-aligned controls — view toggles, a settings gear, a Save action. */
  action?: ReactNode;
  /** Renders the back chevron above the title, as on every profile sub-screen. */
  onBack?: () => void;
  /** Admin headings run one step smaller than the reader app's. */
  dense?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * The standard page heading. When `onBack` is given the chevron sits on its own
 * line above the title, matching the profile and admin stacks.
 */
export const ScreenHeader = memo(function ScreenHeader({
  title,
  subtitle,
  action,
  onBack,
  dense = false,
  style,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      {onBack ? (
        <View style={styles.backRow}>
          <IconButton
            icon={ChevronLeft}
            onPress={onBack}
            variant="plain"
            buttonSize={36}
            accessibilityLabel="Go back"
          />
          {action}
        </View>
      ) : null}

      <View style={styles.titleRow}>
        <View style={styles.titles}>
          <Display size={dense ? 'screenDense' : 'screen'}>{title}</Display>
          {subtitle ? (
            <Text size={fontSize.bodySmall} leading={1.6} tone="muted">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {!onBack ? action : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  static: {
    flex: 1,
  },
  header: {
    gap: 14,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titles: {
    flex: 1,
    gap: 8,
  },
});

export { Card, PressableCard, Divider, SectionHeader, Callout } from '@/components/ui/Surface';
export { EmptyState } from '@/components/ui/EmptyState';
