import { memo, useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { CategoryTile } from '@/components/books';
import { Label, TextButton } from '@/components/ui';
import type { CatalogCategory } from '@/services/catalog';
import { layout } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

const TIMING = {
  duration: 260,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

/** The gap between the two tile columns, and between the rows. */
const GRID_GAP = 11;

export type SubjectPanelProps = {
  open: boolean;
  categories: CatalogCategory[];
  /** The subject currently filtering the list, from `useSearchFilters`. */
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /**
   * The `gap` of the column the panel sits in. A closed panel is zero-height
   * but still a child of that column, so it would otherwise leave one blank
   * gap behind; this pulls the panel up by that much until it opens.
   */
  columnGap?: number;
};

/**
 * Browse by subject, as a panel rather than a permanent section.
 *
 * It expands from nothing to the height its own grid measures, so the list
 * below slides down with it instead of jumping. Picking a subject is the same
 * filter the sheet and the chip row work on — the panel writes `categoryId`
 * and reads its selection back from it, and owns no state of its own.
 */
export const SubjectPanel = memo(function SubjectPanel({
  open,
  categories,
  selectedId,
  onSelect,
  columnGap = 0,
}: SubjectPanelProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const progress = useSharedValue(0);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, TIMING);
  }, [open, progress]);

  // Two tiles per row, inside the screen's gutters.
  const tileWidth = Math.floor(
    (screenWidth - layout.screenPadding * 2 - GRID_GAP) / 2,
  );

  const containerStyle = useAnimatedStyle(() => ({
    height: progress.value * contentHeight,
    opacity: progress.value,
    marginTop: (progress.value - 1) * columnGap,
  }));

  const clear = useCallback(() => onSelect(null), [onSelect]);

  // `CategoryTile` hands back its own id, which is optional on its signature.
  const select = useCallback((id?: string) => onSelect(id ?? null), [onSelect]);

  if (categories.length === 0) {
    return null;
  }

  return (
    <Animated.View
      // Collapsed, the panel is not just invisible but unreachable — a tile
      // behind a zero height would still take a tap on some Android builds.
      pointerEvents={open ? 'auto' : 'none'}
      style={[styles.root, containerStyle]}
    >
      <View
        style={styles.measured}
        onLayout={event => setContentHeight(event.nativeEvent.layout.height)}
      >
        <View style={styles.header}>
          <Label>Browse by subject</Label>
          {selectedId ? (
            <TextButton label="All subjects" onPress={clear} />
          ) : null}
        </View>

        <View style={styles.grid}>
          {categories.map(category => (
            <CategoryTile
              key={category.id}
              id={category.id}
              label={category.label}
              count={`${category.count} ${category.count === '1' ? 'book' : 'books'}`}
              accent={category.accent}
              width={tileWidth}
              onPress={select}
              style={
                selectedId === category.id
                  ? [styles.selected, { borderColor: colors.primary }]
                  : undefined
              }
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  // Absolute so the grid can be measured at its natural height while the
  // animated container is still collapsed.
  measured: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingBottom: 4,
  },
  selected: {
    borderWidth: 2,
  },
});
