import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LayoutGrid, List } from 'lucide-react-native';

import { Icon, type LucideIcon } from '@/components/ui/Icon';
import { useTheme } from '@/theme/ThemeContext';

export type ViewMode = 'grid' | 'list';

/**
 * The grid / list switch in the Library header. Two small squares rather than a
 * segmented control, because the choice is a view preference, not a filter.
 */
export const ViewToggle = memo(function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (next: ViewMode) => void;
}) {
  return (
    <View style={styles.root}>
      <ToggleButton mode="grid" icon={LayoutGrid} active={value === 'grid'} onChange={onChange} />
      <ToggleButton mode="list" icon={List} active={value === 'list'} onChange={onChange} />
    </View>
  );
});

const ToggleButton = memo(function ToggleButton({
  mode,
  icon,
  active,
  onChange,
}: {
  mode: ViewMode;
  icon: LucideIcon;
  active: boolean;
  onChange: (next: ViewMode) => void;
}) {
  const { colors } = useTheme();
  const handlePress = useCallback(() => onChange(mode), [mode, onChange]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={mode === 'grid' ? 'Grid view' : 'List view'}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: active ? colors.primaryFill : colors.primaryFillSoft,
          borderColor: active ? colors.selectedBorder : colors.border,
        },
        pressed && styles.pressed,
      ]}>
      <Icon icon={icon} size={15} tone={active ? 'primary' : 'muted'} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    gap: 9,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
