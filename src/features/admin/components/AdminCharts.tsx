import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, Label, ProgressBar, Text } from '@/components/ui';
import type { TimeSeriesPoint } from '@/services/admin';
import { radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

const BAR_HEIGHT = 78;
/** Long ranges do not fit on a phone; keep the most recent buckets. */
const MAX_BARS = 30;

/** A compact bar chart for a day-bucketed series. */
export const AdminTrendChart = memo(function AdminTrendChart({
  title,
  points,
  accent,
  unit,
}: {
  title: string;
  points: TimeSeriesPoint[];
  accent?: string;
  unit?: string;
}) {
  const { colors } = useTheme();
  const color = accent ?? colors.primaryBright;

  const { max, total, bars } = useMemo(() => {
    const highest = points.reduce((peak, point) => Math.max(peak, point.value), 0);
    return {
      max: highest,
      total: points.reduce((sum, point) => sum + point.value, 0),
      bars: points.slice(-MAX_BARS),
    };
  }, [points]);

  return (
    <Card tone="surface" rounded={radius.button} padded={16} gap={12}>
      <View style={styles.header}>
        <Label size={fontSize.labelSmall} tracking={1.6}>
          {title}
        </Label>
        <View style={styles.total}>
          <Text size={20} leading={1} weight="700">
            {String(total)}
          </Text>
          {unit ? (
            <Text size={12} leading={1} tone="muted">
              {unit}
            </Text>
          ) : null}
        </View>
      </View>

      {max === 0 ? (
        <View style={styles.empty}>
          <Text size={13} leading={1.4} tone="faint">
            No activity in this period
          </Text>
        </View>
      ) : (
        <View style={styles.bars}>
          {bars.map(point => {
            const ratio = point.value / max;
            return (
              <View
                key={point.date}
                style={[
                  styles.bar,
                  {
                    height: Math.max(ratio * BAR_HEIGHT, point.value > 0 ? 4 : 2),
                    backgroundColor: point.value > 0 ? color : colors.border,
                    // Recent, taller bars read stronger without a second colour.
                    opacity: point.value > 0 ? 0.45 + ratio * 0.55 : 1,
                  },
                ]}
              />
            );
          })}
        </View>
      )}

      {bars.length > 1 ? (
        <View style={styles.axis}>
          <Text size={11} leading={1} tone="faint">
            {shortDate(bars[0].date)}
          </Text>
          <Text size={11} leading={1} tone="faint">
            {shortDate(bars[bars.length - 1].date)}
          </Text>
        </View>
      ) : null}
    </Card>
  );
});

function shortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** The horizontal proportion bar used for top books and categories. */
export const AdminRankBar = memo(function AdminRankBar({
  label,
  sublabel,
  value,
  max,
  accent,
}: {
  label: string;
  sublabel?: string;
  value: number;
  max: number;
  accent?: string | null;
}) {
  const ratio = max > 0 ? value / max : 0;

  return (
    <View style={styles.rank}>
      <View style={styles.rankHeader}>
        <Text size={14} leading={1.2} numberOfLines={1} style={styles.grow}>
          {label}
        </Text>
        <Text size={13} leading={1} weight="600">
          {String(value)}
        </Text>
      </View>

      <ProgressBar value={ratio} height={6} trackColor={accent ? `${accent}22` : undefined} />

      {sublabel ? (
        <Text size={11} leading={1.2} tone="muted" numberOfLines={1}>
          {sublabel}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  total: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  empty: {
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bars: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  bar: {
    flex: 1,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rank: {
    gap: 7,
    paddingVertical: 8,
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },
});
