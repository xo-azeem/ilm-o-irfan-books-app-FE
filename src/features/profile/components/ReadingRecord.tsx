import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Badge,
  Card,
  Display,
  Label,
  LinearGradient,
  ProgressBar,
  SectionHeader,
  StatTile,
  StreakBars,
  Text,
  TextButton,
} from '@/components/ui';
import { radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/**
 * The streak card.
 *
 * Streaks and badges are gold; goal progress is green. The two accents never
 * mix inside one component, which is what keeps gold meaningful.
 */
export const StreakCard = memo(function StreakCard({
  current,
  longest,
  /** Seven values, 0–1, oldest first. */
  week,
}: {
  current: number;
  longest?: number;
  week: number[];
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.streak, { borderColor: colors.goldBorder }]}>
      <LinearGradient
        angle={135}
        stops={[
          { offset: 0, color: colors.gold, opacity: 0.14 },
          { offset: 1, color: colors.background, opacity: 0.95 },
        ]}
      />
      <View style={styles.streakBody}>
        <Display size={30} tone="gold">
          {current === 1 ? '1 day' : `${current} days`}
        </Display>
        <Text size={12.5} leading={1.2} tone="muted">
          {longest ? `Reading streak · longest ${longest}` : 'Reading streak'}
        </Text>
      </View>
      <StreakBars days={week} />
    </View>
  );
});

/** This month's goal — the one place green progress appears on this screen. */
export const GoalCard = memo(function GoalCard({
  completed,
  target,
  note,
}: {
  completed: number;
  target: number;
  note?: string;
}) {
  return (
    <Card tone="surface" rounded={radius.cardLarge} padded={18} gap={14}>
      <View style={styles.goalHeader}>
        <Display size={17}>This month’s goal</Display>
        <Label tone="primary" tracking={0.8}>{`${completed} / ${target} books`}</Label>
      </View>
      <ProgressBar value={target > 0 ? completed / target : 0} height={8} />
      {note ? (
        <Text size={12.5} leading={1.3} tone="muted">
          {note}
        </Text>
      ) : null}
    </Card>
  );
});

export type Achievement = {
  id: string;
  /** A numeral or glyph — "7", "25", "☾". */
  mark: string;
  label: string;
  earned: boolean;
  /** Gold for streaks, green for volume. Locked badges are neither. */
  tone?: 'gold' | 'primary';
};

/** The achievement rail. Locked badges are dashed and unlabelled by design. */
export const AchievementRail = memo(function AchievementRail({
  achievements,
  earnedCount,
  totalCount,
  onSeeAll,
}: {
  achievements: Achievement[];
  earnedCount: number;
  totalCount: number;
  onSeeAll?: () => void;
}) {
  return (
    <View style={styles.achievements}>
      <SectionHeader
        title="Achievements"
        variant="display"
        action={
          <TextButton
            label={`${earnedCount} of ${totalCount}`}
            onPress={onSeeAll}
            size={fontSize.captionSmall}
          />
        }
      />
      <View style={styles.badgeRow}>
        {achievements.map(achievement => (
          <AchievementBadge key={achievement.id} achievement={achievement} />
        ))}
      </View>
    </View>
  );
});

const AchievementBadge = memo(function AchievementBadge({
  achievement,
}: {
  achievement: Achievement;
}) {
  const { colors } = useTheme();
  const { earned, tone = 'primary' } = achievement;

  const fill = !earned
    ? colors.primaryFillSoft
    : tone === 'gold'
    ? colors.goldFill
    : colors.primaryFill;

  const border = !earned
    ? colors.borderStrong
    : tone === 'gold'
    ? colors.goldBorder
    : colors.selectedBorder;

  return (
    <View style={styles.badge}>
      <View
        style={[
          styles.badgeMark,
          {
            backgroundColor: fill,
            borderColor: border,
            borderStyle: earned ? 'solid' : 'dashed',
          },
        ]}>
        <Display size={earned ? 19 : 15} tone={earned ? (tone === 'gold' ? 'gold' : 'primary') : 'dim'}>
          {earned ? achievement.mark : '?'}
        </Display>
      </View>
      <Text size={10} leading={1.2} align="center" tone={earned ? 'muted' : 'dim'} numberOfLines={2}>
        {earned ? achievement.label : 'Locked'}
      </Text>
    </View>
  );
});

/** The reader's identity block: avatar, name, membership badge, settings gear. */
export const RecordHeader = memo(function RecordHeader({
  memberSince,
  isMember,
}: {
  memberSince?: string;
  isMember: boolean;
}) {
  return (
    <View style={styles.recordMeta}>
      {isMember ? <Badge label="MEMBER" tone="gold" bordered /> : null}
      {memberSince ? (
        <Text size={fontSize.captionSmall} leading={1} tone="faint">
          {memberSince}
        </Text>
      ) : null}
    </View>
  );
});

/** Three metrics side by side — books, pages, hours. */
export const StatRow = memo(function StatRow({
  stats,
}: {
  stats: { value: string; label: string }[];
}) {
  return (
    <View style={styles.statRow}>
      {stats.map(stat => (
        <StatTile key={stat.label} value={stat.value} label={stat.label} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: radius.cardLarge,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  streakBody: {
    flex: 1,
    gap: 4,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  achievements: {
    gap: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 11,
  },
  badge: {
    width: 62,
    alignItems: 'center',
    gap: 7,
  },
  badgeMark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  recordMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    gap: 11,
  },
});
