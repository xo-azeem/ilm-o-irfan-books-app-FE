import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Label, Text } from '@/components/ui';
import { palette } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

import { AdminEyebrow, AdminMeter } from './AdminUi';

import type { TimeSeriesPoint } from '@/services/admin';

/**
 * Admin charts.
 *
 * One chart at a time, each headed by the figure it is about and the sentence
 * that says whether it is up or down. Bars deepen with their own height, so
 * the shape of a week reads before any number is parsed.
 */

/** The most bars that stay legible at a phone's width. */
const MAX_BARS = 30;
const BAR_HEIGHT = 96;

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function barColor(value: number, max: number): string {
  if (max <= 0) return palette.greenDeep;
  const share = value / max;
  if (share > 0.8) return palette.greenBright;
  if (share > 0.55) return palette.green;
  return palette.greenDeep;
}

export const AdminBarChart = memo(function AdminBarChart({
  title,
  total,
  delta,
  points,
}: {
  title: string;
  total: number;
  /** "+4% vs the previous week", already phrased. Omitted when unknowable. */
  delta?: { label: string; up: boolean } | null;
  points: TimeSeriesPoint[];
}) {
  const { colors } = useTheme();

  const bars = useMemo(() => points.slice(-MAX_BARS), [points]);
  const max = useMemo(() => bars.reduce((peak, point) => Math.max(peak, point.value), 0), [bars]);
  const showWeekdays = bars.length <= 7;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.headerBody}>
          <AdminEyebrow>{title}</AdminEyebrow>
          <Text size={27} leading={1} weight="700">
            {total.toLocaleString()}
          </Text>
        </View>
        {delta ? (
          <Text size={12} leading={1} weight="500" tone={delta.up ? 'action' : 'muted'}>
            {delta.label}
          </Text>
        ) : null}
      </View>

      {bars.length === 0 ? (
        <Text size={12.5} leading={1.45} tone="muted">
          Nothing recorded in this window yet.
        </Text>
      ) : (
        <>
          <View style={styles.bars}>
            {bars.map(point => (
              <View
                key={point.date}
                style={[
                  styles.bar,
                  {
                    // A zero day still draws a sliver, so a gap in the data is
                    // visibly a zero rather than a missing bar.
                    height: Math.max(2, (point.value / (max || 1)) * BAR_HEIGHT),
                    backgroundColor: barColor(point.value, max),
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.axis}>
            {showWeekdays ? (
              bars.map(point => (
                <Label key={point.date} size={10} leading={1} weight="400" tracking={0} tone="dim">
                  {WEEKDAYS[new Date(point.date).getDay()] ?? ''}
                </Label>
              ))
            ) : (
              <>
                <Label size={10} leading={1} weight="400" tracking={0} tone="dim">
                  {shortDate(bars[0]?.date)}
                </Label>
                <Label size={10} leading={1} weight="400" tracking={0} tone="dim">
                  {shortDate(bars[bars.length - 1]?.date)}
                </Label>
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
});

function shortDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }).toUpperCase();
}

export type ShareRow = { id: string; label: string; value: number };

/**
 * Where something happens, as a share of the whole. Percentages rather than
 * counts, because the question this answers is "which of these is big".
 */
export const AdminShareBars = memo(function AdminShareBars({
  rows,
  emptyLabel = 'Nothing recorded yet.',
}: {
  rows: ShareRow[];
  emptyLabel?: string;
}) {
  const { colors } = useTheme();
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {rows.length === 0 || total === 0 ? (
        <Text size={12.5} leading={1.45} tone="muted">
          {emptyLabel}
        </Text>
      ) : (
        rows.map(row => {
          const share = row.value / total;
          return (
            <View key={row.id} style={styles.shareRow}>
              <View style={styles.shareHeader}>
                <Text size={12} leading={1} numberOfLines={1} style={styles.grow}>
                  {row.label}
                </Text>
                <Text size={12} leading={1} tone="muted">
                  {`${Math.round(share * 100)}%`}
                </Text>
              </View>
              <AdminMeter value={share} />
            </View>
          );
        })
      )}
    </View>
  );
});

/** A ranked row — position, cover block, title and the figure it ranks on. */
export const AdminRankRow = memo(function AdminRankRow({
  rank,
  label,
  sublabel,
  accent,
}: {
  rank: number;
  label: string;
  sublabel: string;
  accent?: string | null;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.rankRow}>
      <Label size={12} leading={1} weight="700" tracking={0} tone="dim" style={styles.rank}>
        {String(rank)}
      </Label>
      <View style={[styles.rankCover, { backgroundColor: accent ?? colors.coverBase }]} />
      <View style={styles.grow}>
        <Text size={13} leading={1.2} numberOfLines={1}>
          {label}
        </Text>
        <Text size={10.5} leading={1.2} tone="faint" numberOfLines={1}>
          {sublabel}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: 14,
    padding: 15,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerBody: {
    gap: 5,
  },
  bars: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
  },
  bar: {
    flex: 1,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  panel: {
    gap: 11,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  shareRow: {
    gap: 6,
  },
  shareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rank: {
    width: 14,
  },
  rankCover: {
    width: 28,
    height: 38,
    borderRadius: 5,
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },
});
