import { memo, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Display } from '@/components/ui/Text';
import { radius } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

const TIMING = {
  duration: 220,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Right-aligned action in the header, e.g. a "Reset" text button. */
  headerAction?: ReactNode;
  /** Pinned to the foot of the sheet — the primary action with a live count. */
  footer?: ReactNode;
  /** Sheets taller than this fraction of the screen scroll internally. */
  scrollable?: boolean;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * One sheet pattern serves filters, sort, reading settings and bulk actions:
 * a 26px top radius, a grab handle, and the primary action at the foot.
 */
export const Sheet = memo(function Sheet({
  visible,
  onClose,
  title,
  headerAction,
  footer,
  scrollable = true,
  children,
  contentStyle,
}: SheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, TIMING);
  }, [progress, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose, visible]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const panelStyle = useAnimatedStyle(() => ({
    // Slides from just below the fold; the scrim fades in over the same window.
    transform: [{ translateY: (1 - progress.value) * 44 }],
    opacity: progress.value,
  }));

  const Body = scrollable ? ScrollView : View;
  const bodyProps = scrollable
    ? {
        showsVerticalScrollIndicator: false,
        // A tap on a control while the keyboard is up should reach the control,
        // not be spent dismissing the keyboard.
        keyboardShouldPersistTaps: 'handled' as const,
        contentContainerStyle: styles.body,
      }
    : { style: styles.body };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      {/* Padding, not a window resize: a translucent modal is not resized for
          the keyboard on Android, so a sheet with a field would sit under it. */}
      <KeyboardAvoidingView behavior="padding" style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, scrimStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            style={StyleSheet.absoluteFill}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.panel,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderStrong,
              paddingBottom: Math.max(insets.bottom, 20) + 14,
            },
            panelStyle,
            contentStyle,
          ]}>
          <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />

          {title ? (
            <View style={styles.header}>
              <Display size={22}>{title}</Display>
              {headerAction}
            </View>
          ) : null}

          <Body {...bodyProps}>{children}</Body>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

/** Groups a labelled block of controls inside a sheet. */
export const SheetSection = memo(function SheetSection({
  children,
  gap = 11,
  style,
}: {
  children: ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[{ gap }, style]}>{children}</View>;
});

/** Sheet open/close state, so screens don't hand-roll a boolean each time. */
export function useSheet(initial = false) {
  const [visible, setVisible] = useState(initial);
  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  const toggle = useCallback(() => setVisible(current => !current), []);

  return useMemo(() => ({ visible, open, close, toggle }), [close, open, toggle, visible]);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  panel: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    paddingTop: 14,
    paddingHorizontal: 20,
    gap: 20,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: -20 },
    elevation: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  body: {
    gap: 20,
  },
  footer: {
    gap: 10,
  },
});
