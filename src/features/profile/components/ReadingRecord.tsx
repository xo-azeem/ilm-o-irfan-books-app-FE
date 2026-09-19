import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Pencil } from 'lucide-react-native';

import {
  Card,
  Display,
  Icon,
  Label,
  LinearGradient,
  MedalIcon,
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

/**
 * This month's goal — the one place green progress appears on this screen.
 * The count is a button when the target can be changed, so the number a
 * reader wants to adjust is the thing they tap.
 */
export const GoalCard = memo(function GoalCard({
  completed,
  target,
  note,
  onEdit,
}: {
  completed: number;
  target: number;
  note?: string;
  onEdit?: () => void;
}) {
  const count = `${completed} / ${target} books`;
  return (
    <Card tone="surface" rounded={radius.cardLarge} padded={18} gap={14}>
      <View style={styles.goalHeader}>
        <Display size={17}>This month’s goal</Display>
        {onEdit ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${count}. Change goal`}
            hitSlop={8}
            onPress={onEdit}
            style={({ pressed }) => [
              styles.goalEdit,
              pressed && styles.pressed,
            ]}
          >
            <Label tone="primary" tracking={0.8}>
              {count}
            </Label>
            <Icon icon={Pencil} size={12} tone="primary" />
          </Pressable>
        ) : (
          <Label tone="primary" tracking={0.8}>
            {count}
          </Label>
        )}
      </View>
      <ProgressBar
        value={target > 0 ? Math.min(1, completed / target) : 0}
        height={8}
      />
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
  /** How far along a locked badge is; the caption shows it in place of "Locked". */
  progress?: { current: number; target: number };
};

/**
 * The achievement rail. An earned badge is a medal — gold for a streak, the
 * app's green for volume — with its numeral on the disc. Locked badges are
 * dashed and unnamed by design: the one thing they give away is how close
 * the reader is.
 */
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

/** The medal's disc centre and inner face, as fractions of its box. */
const MEDAL_SIZE = 64;
const MEDAL_DISC_CENTER_Y = 392 / 512;
const MEDAL_FACE = 142 / 512;

/** Ink dark enough to read on the bright disc, in either metal. */
const MEDAL_INK: Record<'gold' | 'primary', string> = {
  gold: '#4A3508',
  primary: '#0F3A1B',
};

const AchievementBadge = memo(function AchievementBadge({
  achievement,
}: {
  achievement: Achievement;
}) {
  const { colors } = useTheme();
  const { earned, tone = 'primary', progress } = achievement;

  const caption = earned
    ? achievement.label
    : progress
      ? `${Math.min(progress.current, progress.target)} of ${progress.target}`
      : 'Locked';

  return (
    <View style={styles.badge}>
      {earned ? (
        <View
          style={styles.medal}
          accessibilityLabel={`${achievement.label} medal`}
        >
          <MedalIcon size={MEDAL_SIZE} tone={tone} />
          {/* The numeral sits on the disc, not on the ribbon. */}
          <View
            style={[
              styles.medalFace,
              {
                top:
                  MEDAL_SIZE * MEDAL_DISC_CENTER_Y -
                  (MEDAL_SIZE * MEDAL_FACE) / 2,
                width: MEDAL_SIZE * MEDAL_FACE,
                height: MEDAL_SIZE * MEDAL_FACE,
              },
            ]}
          >
            <Display
              size={achievement.mark.length > 1 ? 10 : 12}
              weight="700"
              tone="inherit"
              style={{ color: MEDAL_INK[tone] }}
            >
              {achievement.mark}
            </Display>
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.badgeMark,
            {
              backgroundColor: colors.primaryFillSoft,
              borderColor: colors.borderStrong,
              borderStyle: 'dashed',
            },
          ]}
        >
          <Display size={15} tone="dim">
            ?
          </Display>
        </View>
      )}
      <Text
        size={10}
        leading={1.2}
        align="center"
        tone={earned ? 'muted' : 'dim'}
        numberOfLines={2}
      >
        {caption}
      </Text>
    </View>
  );
});

/**
 * The lines beneath the reader's name: email, then the member-since date. The
 * plan pill sits on the name row itself, so no membership badge repeats here.
 */
export const RecordHeader = memo(function RecordHeader({
  email,
  memberSince,
}: {
  email?: string;
  memberSince?: string;
}) {
  return (
    <View style={styles.recordMeta}>
      {email ? (
        <Text
          size={fontSize.captionSmall}
          leading={1.35}
          tone="muted"
          numberOfLines={1}
        >
          {email}
        </Text>
      ) : null}
      {memberSince ? (
        <Text size={fontSize.captionSmall} leading={1.35} tone="faint">
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
  goalEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pressed: {
    opacity: 0.6,
  },
  achievements: {
    gap: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
  },
  badge: {
    width: 64,
    alignItems: 'center',
    gap: 7,
  },
  medal: {
    width: MEDAL_SIZE,
    height: MEDAL_SIZE,
  },
  medalFace: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: 2,
  },
  statRow: {
    flexDirection: 'row',
    gap: 11,
  },
});
