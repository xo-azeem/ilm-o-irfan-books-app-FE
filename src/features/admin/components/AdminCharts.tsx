import { useMemo } from 'react';
import { View } from 'react-native';

import { DisplayText, Text } from '@/components/ui';
import type { TimeSeriesPoint } from '@/services/admin';
import { useTheme } from '@/theme/ThemeContext';

const BAR_HEIGHT = 78;

/** Compact bar chart for a day-bucketed series. */
export function AdminTrendChart({
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
  const color = accent ?? colors.primary;

  const { max, total, bars } = useMemo(() => {
    const highest = points.reduce((peak, point) => Math.max(peak, point.value), 0);
    return {
      max: highest,
      total: points.reduce((sum, point) => sum + point.value, 0),
      // Long ranges do not fit on a phone; keep the most recent 30 buckets.
      bars: points.slice(-30),
    };
  }, [points]);

  return (
    <View className="gap-3 rounded-[16px] bg-app-surface p-4 dark:bg-app-surface-dark">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-[12px] font-semibold uppercase tracking-widest text-app-faint dark:text-app-faint-dark">
          {title}
        </Text>
        <DisplayText className="text-[20px] font-bold text-app-ink dark:text-app-ink-dark">
          {total}
          {unit ? (
            <Text className="text-[12px] text-app-muted dark:text-app-muted-dark"> {unit}</Text>
          ) : null}
        </DisplayText>
      </View>

      {max === 0 ? (
        <View className="items-center justify-center" style={{ height: BAR_HEIGHT }}>
          <Text className="text-[13px] text-app-faint dark:text-app-faint-dark">
            No activity in this period
          </Text>
        </View>
      ) : (
        <View className="flex-row items-end gap-[3px]" style={{ height: BAR_HEIGHT }}>
          {bars.map(point => {
            const ratio = point.value / max;
            return (
              <View
                key={point.date}
                className="flex-1 rounded-t-[3px]"
                style={{
                  height: Math.max(ratio * BAR_HEIGHT, point.value > 0 ? 4 : 2),
                  backgroundColor: point.value > 0 ? color : colors.border,
                  opacity: point.value > 0 ? 0.45 + ratio * 0.55 : 1,
                }}
              />
            );
          })}
        </View>
      )}

      {bars.length > 1 ? (
        <View className="flex-row justify-between">
          <Text className="text-[11px] text-app-faint dark:text-app-faint-dark">
            {shortDate(bars[0].date)}
          </Text>
          <Text className="text-[11px] text-app-faint dark:text-app-faint-dark">
            {shortDate(bars[bars.length - 1].date)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function shortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Horizontal proportion bar used for top books and categories. */
export function AdminRankBar({
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
  const { colors } = useTheme();
  const ratio = max > 0 ? value / max : 0;

  return (
    <View className="gap-1.5 py-2">
      <View className="flex-row items-center justify-between gap-3">
        <Text
          className="min-w-0 flex-1 text-[14px] text-app-ink dark:text-app-ink-dark"
          numberOfLines={1}>
          {label}
        </Text>
        <Text className="text-[13px] font-semibold text-app-ink dark:text-app-ink-dark">
          {value}
        </Text>
      </View>
      <View className="h-[6px] overflow-hidden rounded-full" style={{ backgroundColor: colors.fill }}>
        <View
          className="h-full rounded-full"
          style={{
            width: `${Math.max(ratio * 100, value > 0 ? 4 : 0)}%`,
            backgroundColor: accent || colors.primary,
          }}
        />
      </View>
      {sublabel ? (
        <Text className="text-[11px] text-app-muted dark:text-app-muted-dark" numberOfLines={1}>
          {sublabel}
        </Text>
      ) : null}
    </View>
  );
}
