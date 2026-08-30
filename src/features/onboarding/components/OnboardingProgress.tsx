import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeContext';

/**
 * The three short rules at the top of the first-run flow. Deliberately not
 * numbered — it reads as "nearly done", not "three forms to fill".
 */
export const OnboardingProgress = memo(function OnboardingProgress({
  step,
  total = 3,
}: {
  /** 1-based. */
  step: number;
  total?: number;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={styles.root}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: step }}>
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            {
              backgroundColor:
                index < step ? colors.primaryBright : colors.primaryFillSoft,
            },
          ]}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    height: 3,
    width: 40,
    borderRadius: 2,
  },
});
