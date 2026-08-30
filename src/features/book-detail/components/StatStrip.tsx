import { Fragment, memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Divider, Label, Text } from '@/components/ui';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

export type Stat = {
  value: string;
  label: string;
};

/**
 * The rule-bound facts strip under a book's title. Hairlines top and bottom,
 * thin dividers between — the numbers are the point, not the container.
 */
export const StatStrip = memo(function StatStrip({ stats }: { stats: Stat[] }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.root, { borderColor: colors.border }]}>
      {stats.map((stat, index) => (
        <Fragment key={stat.label}>
          {index > 0 ? <Divider vertical /> : null}
          <View style={styles.stat}>
            <Text size={16} leading={1} weight="600">
              {stat.value}
            </Text>
            <Label size={fontSize.labelSmall + 0.5} tracking={1}>
              {stat.label}
            </Label>
          </View>
        </Fragment>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
});
