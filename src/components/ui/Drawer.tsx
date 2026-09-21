import { memo, useCallback, useEffect, type ReactNode } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { IconButton } from '@/components/ui/Button';
import { DialogLayer, dismissDialog } from '@/components/ui/Dialog';
import { Display } from '@/components/ui/Text';
import { useStrings } from '@/i18n';
import { radius } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

const TIMING = {
  duration: 240,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

/** The panel takes most of a phone, and no more than this on a tablet. */
const MAX_WIDTH = 360;
const WIDTH_FRACTION = 0.84;
/** A drag past this much of the panel's width, or this fast, closes it. */
const CLOSE_FRACTION = 0.35;
const CLOSE_VELOCITY = 600;

export type DrawerProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Beside the title, before the close button. */
  headerAction?: ReactNode;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * A panel that slides in from the left edge and holds a list too long for a
 * sheet: categories, collections, anything an admin can add to without
 * limit. The scrim, the back button and a drag to the left all close it.
 *
 * The body is the caller's — usually a virtualised list with its own search
 * field — so the drawer draws nothing but the frame, and the list scrolls
 * inside it however long it gets.
 */
export const Drawer = memo(function Drawer({
  visible,
  onClose,
  title,
  headerAction,
  children,
  contentStyle,
}: DrawerProps) {
  const { colors } = useTheme();
  const s = useStrings();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.min(MAX_WIDTH, Math.round(screenWidth * WIDTH_FRACTION));

  // 0 is off screen to the left, 1 is fully in. The drag pulls it back toward
  // 0 and the release either finishes the close or springs it home.
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);

  useEffect(() => {
    drag.value = 0;
    progress.value = withTiming(visible ? 1 : 0, TIMING);
  }, [drag, progress, visible]);

  // A dialog raised from inside the drawer sits above it, so the back button
  // belongs to the dialog while one is up and to the drawer only after.
  const handleRequestClose = useCallback(() => {
    if (!dismissDialog()) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleRequestClose();
        return true;
      },
    );
    return () => subscription.remove();
  }, [handleRequestClose, visible]);

  const pan = Gesture.Pan()
    // Sideways only, so the list inside keeps its vertical scroll.
    .activeOffsetX([-12, 12])
    .failOffsetY([-16, 16])
    .onUpdate(event => {
      drag.value = Math.min(0, event.translationX);
    })
    .onEnd(event => {
      const closing =
        -drag.value > width * CLOSE_FRACTION ||
        event.velocityX < -CLOSE_VELOCITY;
      if (closing) {
        // Finish the slide, then hand the close to React; `visible` flips
        // and the panel is reset off screen for the next open.
        drag.value = withTiming(-width, TIMING, finished => {
          if (finished) runOnJS(onClose)();
        });
      } else {
        drag.value = withTiming(0, TIMING);
      }
    });

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: progress.value * (1 + drag.value / width),
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.value - 1) * width + drag.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleRequestClose}
    >
      {/* Padding, not a window resize: a translucent modal is not resized for
          the keyboard on Android, so a list with a search field would end
          under it. */}
      {/* A modal is a native root of its own on Android, and gestures inside
          it need their own handler root. */}
      <GestureHandlerRootView style={styles.root}>
        <KeyboardAvoidingView behavior="padding" style={styles.root}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.scrim },
              scrimStyle,
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={s.common.dismiss}
              style={StyleSheet.absoluteFill}
              onPress={onClose}
            />
          </Animated.View>

          <GestureDetector gesture={pan}>
            <Animated.View
              style={[
                styles.panel,
                {
                  width,
                  backgroundColor: colors.surface,
                  borderColor: colors.borderStrong,
                  paddingTop: insets.top + 14,
                  paddingBottom: Math.max(insets.bottom, 16),
                },
                panelStyle,
                contentStyle,
              ]}
            >
              <View style={styles.header}>
                <View style={styles.titles}>
                  {title ? <Display size={22}>{title}</Display> : null}
                </View>
                {headerAction}
                <IconButton
                  icon={X}
                  variant="plain"
                  buttonSize={36}
                  size={18}
                  onPress={onClose}
                  accessibilityLabel={s.common.dismiss}
                />
              </View>

              <View style={styles.body}>{children}</View>
            </Animated.View>
          </GestureDetector>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>

      {/* Dialogs asked for while the drawer is open draw here, above it: a
          second `Modal` would not be presented on iOS. */}
      <DialogLayer />
    </Modal>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  panel: {
    height: '100%',
    borderTopRightRadius: radius.sheet,
    borderBottomRightRadius: radius.sheet,
    borderRightWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 18,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 40,
    shadowOffset: { width: 20, height: 0 },
    elevation: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titles: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
});
