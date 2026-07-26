import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Search, X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeContext';
import { fonts, typography } from '@/theme/palette';

const OPEN_MS = 280;
const CLOSE_MS = 220;
const EASE = Easing.bezier(0.22, 1, 0.36, 1);

export const SEARCH_GLASS_BUTTON_SIZE = 44;
export const SEARCH_FIELD_HEIGHT = 48;

type SearchGlassButtonProps = {
  onPress: () => void;
  accessibilityLabel: string;
  icon: ReactNode;
};

/** Shared frosted circular control (search open / search close). */
export const SearchGlassButton = memo(function SearchGlassButton({
  onPress,
  accessibilityLabel,
  icon,
}: SearchGlassButtonProps) {
  const { isDark } = useTheme();
  const press = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(press.value, [0, 1], [1, 0.92]) }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 90 });
      }}
      onPressOut={() => {
        press.value = withTiming(0, { duration: 140 });
      }}
      hitSlop={6}>
      <Animated.View
        style={[
          styles.glassButton,
          {
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.10)'
              : 'rgba(255,255,255,0.62)',
            borderColor: isDark
              ? 'rgba(255,255,255,0.20)'
              : 'rgba(20,40,24,0.10)',
            shadowOpacity: isDark ? 0.35 : 0.12,
          },
          animStyle,
        ]}>
        {icon}
      </Animated.View>
    </Pressable>
  );
});

type ExpandableSearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

/** Pill search field — clear (X) inside empties the query only. */
export const ExpandableSearchField = memo(function ExpandableSearchField({
  value,
  onChangeText,
  placeholder = 'Search books, authors, topics…',
}: ExpandableSearchFieldProps) {
  const { isDark, colors } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const hasQuery = value.length > 0;

  useEffect(() => {
    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 30);
    return () => {
      clearTimeout(focusTimer);
      Keyboard.dismiss();
    };
  }, []);

  return (
    <Animated.View
      entering={FadeIn.duration(OPEN_MS).easing(EASE)}
      exiting={FadeOut.duration(CLOSE_MS).easing(EASE)}
      style={styles.fieldWrap}>
      <View
        style={[
          styles.fieldShell,
          {
            height: SEARCH_FIELD_HEIGHT,
            paddingRight: hasQuery ? 8 : 16,
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.10)'
              : 'rgba(255,255,255,0.72)',
            borderColor: isDark
              ? 'rgba(255,255,255,0.18)'
              : 'rgba(20,40,24,0.10)',
            shadowOpacity: isDark ? 0.4 : 0.14,
          },
        ]}>
        <Search color={colors.primary} size={19} strokeWidth={2} />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.faint}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never"
          style={[
            styles.input,
            {
              color: colors.ink,
              fontFamily: fonts.sans,
            },
          ]}
          accessibilityLabel="Search catalog"
        />
        {hasQuery ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search text"
            hitSlop={8}
            onPress={() => {
              onChangeText('');
              inputRef.current?.focus();
            }}
            style={({ pressed }) => [
              styles.clearBtn,
              {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(20,40,24,0.08)',
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <X color={colors.muted} size={14} strokeWidth={2.5} />
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
});

type SearchDismissOverlayProps = {
  visible: boolean;
  top: number;
  onDismiss: () => void;
};

/**
 * Dim scrim starting below the search row so the field stays tappable.
 * `top` is a window Y from measureInWindow.
 */
export const SearchDismissOverlay = memo(function SearchDismissOverlay({
  visible,
  top,
  onDismiss,
}: SearchDismissOverlayProps) {
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, { duration: OPEN_MS, easing: EASE });
      return;
    }

    progress.value = withTiming(0, { duration: CLOSE_MS, easing: EASE }, finished => {
      if (finished) {
        runOnJS(setMounted)(false);
      }
    });
  }, [visible, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  if (!mounted) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFillObject, styles.overlayRoot, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss search"
        onPress={() => {
          Keyboard.dismiss();
          onDismiss();
        }}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: Math.max(0, top),
          bottom: 0,
          backgroundColor: 'rgba(14, 20, 16, 0.14)',
        }}
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  glassButton: {
    width: SEARCH_GLASS_BUTTON_SIZE,
    height: SEARCH_GLASS_BUTTON_SIZE,
    borderRadius: SEARCH_GLASS_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    shadowColor: '#0E1410',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 6,
  },
  fieldWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  fieldShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 16,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth * 2,
    shadowColor: '#0E1410',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    letterSpacing: typography.snug,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    margin: 0,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayRoot: {
    zIndex: 20,
  },
});
