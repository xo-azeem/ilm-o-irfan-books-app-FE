import { memo, useCallback, useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LayoutGrid, List } from 'lucide-react-native';

import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/theme/ThemeContext';

export type ViewMode = 'grid' | 'list';

const SIZE = 36;
const ICON = 15;
const SWAP_MS = 180;

/**
 * The grid / list switch in the Library header. One quiet button rather than
 * a pair, because the choice is a view preference, not a filter: it shows the
 * view a tap will switch to, and the icons cross-fade as it flips.
 */
export const ViewToggle = memo(function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (next: ViewMode) => void;
}) {
  const { colors } = useTheme();
  const next: ViewMode = value === 'grid' ? 'list' : 'grid';

  // 0 shows the list icon (we are in grid), 1 shows the grid icon (in list).
  const progress = useSharedValue(value === 'grid' ? 0 : 1);

  useEffect(() => {
    progress.value = withTiming(value === 'grid' ? 0 : 1, {
      duration: SWAP_MS,
    });
  }, [progress, value]);

  const listStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: 0.7 + 0.3 * (1 - progress.value) }],
  }));
  const gridStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.7 + 0.3 * progress.value }],
  }));

  const handlePress = useCallback(() => onChange(next), [next, onChange]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        next === 'list' ? 'Switch to list view' : 'Switch to grid view'
      }
      onPress={handlePress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.primaryFillSoft,
          borderColor: colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <Animated.View style={[styles.icon, listStyle]}>
        <Icon icon={List} size={ICON} tone="muted" />
      </Animated.View>
      <Animated.View style={[styles.icon, gridStyle]}>
        <Icon icon={LayoutGrid} size={ICON} tone="muted" />
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  icon: {
    position: 'absolute',
  },
  pressed: {
    opacity: 0.7,
  },
});
