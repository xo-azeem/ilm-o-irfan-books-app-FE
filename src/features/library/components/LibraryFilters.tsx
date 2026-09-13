import { memo, useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/** The shelf the reader is looking at. */
export type LibraryShelf = 'reading' | 'saved' | 'finished' | 'offline';

export const LIBRARY_SHELVES: { value: LibraryShelf; label: string }[] = [
  { value: 'reading', label: 'Reading' },
  { value: 'saved', label: 'Saved' },
  { value: 'finished', label: 'Finished' },
  { value: 'offline', label: 'Offline' },
];

const INDICATOR_HEIGHT = 2;
const SLIDE_MS = 220;

type TabLayout = { x: number; width: number };

/**
 * The shelf tabs — plain labels on a hairline, with a thin green indicator
 * that slides under the active one. Counts sit beside the label in a fainter
 * tone and only where there is something to count, so an empty shelf reads
 * as a plain word rather than a zero.
 */
export const LibraryFilters = memo(function LibraryFilters({
  value,
  counts,
  onChange,
}: {
  value: LibraryShelf;
  counts: Partial<Record<LibraryShelf, number>>;
  onChange: (shelf: LibraryShelf) => void;
}) {
  const { colors } = useTheme();
  const [layouts, setLayouts] = useState<
    Partial<Record<LibraryShelf, TabLayout>>
  >({});

  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  const handleLayout = useCallback((shelf: LibraryShelf, layout: TabLayout) => {
    setLayouts(prev => {
      const current = prev[shelf];
      if (current && current.x === layout.x && current.width === layout.width) {
        return prev;
      }
      return { ...prev, [shelf]: layout };
    });
  }, []);

  // The first measurement snaps into place; every change after that slides.
  useEffect(() => {
    const target = layouts[value];
    if (!target) return;
    if (indicatorWidth.value === 0) {
      indicatorX.value = target.x;
      indicatorWidth.value = target.width;
      return;
    }
    indicatorX.value = withTiming(target.x, { duration: SLIDE_MS });
    indicatorWidth.value = withTiming(target.width, { duration: SLIDE_MS });
  }, [indicatorWidth, indicatorX, layouts, value]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
    opacity: indicatorWidth.value > 0 ? 1 : 0,
  }));

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.root, { borderBottomColor: colors.divider }]}
    >
      {LIBRARY_SHELVES.map(shelf => (
        <ShelfTab
          key={shelf.value}
          shelf={shelf.value}
          label={shelf.label}
          count={counts[shelf.value]}
          selected={value === shelf.value}
          onChange={onChange}
          onLayout={handleLayout}
        />
      ))}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          { backgroundColor: colors.primary },
          indicatorStyle,
        ]}
      />
    </View>
  );
});

const ShelfTab = memo(function ShelfTab({
  shelf,
  label,
  count,
  selected,
  onChange,
  onLayout,
}: {
  shelf: LibraryShelf;
  label: string;
  count?: number;
  selected: boolean;
  onChange: (shelf: LibraryShelf) => void;
  onLayout: (shelf: LibraryShelf, layout: TabLayout) => void;
}) {
  const handlePress = useCallback(() => onChange(shelf), [onChange, shelf]);
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      onLayout(shelf, { x, width });
    },
    [onLayout, shelf],
  );

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={count ? `${label}, ${count}` : label}
      onPress={handlePress}
      onLayout={handleLayout}
      hitSlop={{ top: 8, bottom: 8 }}
      style={({ pressed }) => [
        styles.tab,
        pressed && !selected && styles.pressed,
      ]}
    >
      <Text
        size={fontSize.caption}
        leading={1}
        weight={selected ? '600' : '500'}
        tone={selected ? 'ink' : 'muted'}
      >
        {label}
      </Text>
      {count ? (
        <Text
          size={fontSize.captionSmall}
          leading={1}
          weight="500"
          tone={selected ? 'primary' : 'faint'}
        >
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    gap: 22,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    paddingBottom: 11,
    paddingTop: 2,
  },
  pressed: {
    opacity: 0.6,
  },
  indicator: {
    position: 'absolute',
    left: 0,
    bottom: -StyleSheet.hairlineWidth,
    height: INDICATOR_HEIGHT,
    borderRadius: INDICATOR_HEIGHT,
  },
});
