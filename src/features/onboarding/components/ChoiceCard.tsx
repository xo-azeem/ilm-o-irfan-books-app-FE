import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RadioDot, Text } from '@/components/ui';
import { radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/**
 * A single-choice card. The chosen one lifts a couple of points and holds a
 * faint green rim, so the selection reads without the list turning into a grid
 * of filled blocks.
 */
function ChoiceCardInner<T extends string>({
  value,
  label,
  detail,
  selected,
  onSelect,
}: {
  value: T;
  label: string;
  detail?: string;
  selected: boolean;
  onSelect: (value: T) => void;
}) {
  const { colors } = useTheme();
  const handlePress = useCallback(() => onSelect(value), [onSelect, value]);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: selected ? colors.selected : colors.control,
          borderColor: selected ? colors.selectedBorder : colors.border,
        },
        selected && {
          transform: [{ translateY: -2 }],
          shadowColor: colors.primary,
          shadowOpacity: 0.16,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 4,
        },
        pressed && styles.pressed,
      ]}>
      <View style={styles.body}>
        <Text size={16} leading={1} weight="500">
          {label}
        </Text>
        {detail ? (
          <Text size={fontSize.caption} leading={1.2} tone={selected ? 'primary' : 'muted'}>
            {detail}
          </Text>
        ) : null}
      </View>
      <RadioDot selected={selected} />
    </Pressable>
  );
}

/** `memo` erases the generic signature, so the typed alias is restored here. */
export const ChoiceCard = memo(ChoiceCardInner) as typeof ChoiceCardInner;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  body: {
    flex: 1,
    gap: 5,
  },
  pressed: {
    opacity: 0.85,
  },
});
