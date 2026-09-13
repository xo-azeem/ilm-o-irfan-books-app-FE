import { useCallback, useMemo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { GuestAuthPanel } from '@/components/auth/GuestAuthPanel';
import { Screen } from '@/components/layout';
import { Avatar, Badge, Display, useSheet } from '@/components/ui';
import { GoalSheet } from '@/features/profile/components/GoalSheet';
import {
  AchievementRail,
  GoalCard,
  RecordHeader,
  StatRow,
  StreakCard,
  type Achievement,
} from '@/features/profile/components/ReadingRecord';
import { SettingsSection } from '@/features/profile/components/SettingsSection';
import {
  useAvatarUrl,
  useLibrary,
  useProfile,
  useSubscription,
  useUpdateReadingGoal,
} from '@/hooks/useAccount';
import { daysBetween, localDateKey } from '@/lib/timeZone';
import { DEFAULT_MONTHLY_GOAL } from '@/services/account';
import type { AchievementId, AchievementRow } from '@/services/api/types';
import { useAuthStore } from '@/stores/authStore';

/**
 * How each of the backend's four achievements is drawn. The server owns the
 * rule and the award; this owns only the mark and the name, in the order the
 * rail shows them.
 */
const ACHIEVEMENT_FACES: Record<
  AchievementId,
  Pick<Achievement, 'mark' | 'label' | 'tone'>
> = {
  'first-book': { mark: '1', label: 'First book', tone: 'primary' },
  'streak-7': { mark: '7', label: 'Week streak', tone: 'gold' },
  'books-25': { mark: '25', label: '25 books', tone: 'primary' },
  'night-reader': { mark: '☾', label: 'Night reader', tone: 'primary' },
};

const ACHIEVEMENT_ORDER: AchievementId[] = [
  'first-book',
  'streak-7',
  'books-25',
  'night-reader',
];

/** Bar heights for a day with no reading and for the lightest day that had some. */
const IDLE_BAR = 0.25;
const READ_BAR_FLOOR = 0.45;

/**
 * The reading record.
 *
 * Statistics come first and settings follow beneath them, because what a
 * reader wants from this tab most often is a sense of how their reading is
 * going — the list of preferences is one scroll away rather than a tap.
 */
export function ProfileScreen() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const { data: profile } = useProfile();
  const { data: avatarUrl } = useAvatarUrl(profile?.avatarPath);
  const { data: library } = useLibrary();
  const { data: subscription } = useSubscription();
  const goalSheet = useSheet();
  const updateGoal = useUpdateReadingGoal();

  // Every counter is the server's own total rather than the length of a capped
  // shelf, so a reader with more finished books than one page still sees the
  // real number.
  const finishedCount = library?.finishedCount ?? 0;

  const stats = useMemo(
    () => [
      { value: String(finishedCount), label: 'BOOKS\nFINISHED' },
      {
        value: String(library?.highlightsCount ?? 0),
        label: 'PAGES\nBOOKMARKED',
      },
      { value: String(library?.downloadsCount ?? 0), label: 'BOOKS\nOFFLINE' },
    ],
    [finishedCount, library?.downloadsCount, library?.highlightsCount],
  );

  // `profile-read` carries the streak, so it comes from the profile the screen
  // already loaded rather than from a read of its own. `||` rather than `??`:
  // a path that cannot report the streak sends zero, not null, and zero and
  // "unknown" mean the same thing to this card.
  //
  // The server only touches `current_streak` on a read, so after a missed day
  // it still holds the old run until the next read resets it. The card shows
  // the run as broken as soon as the day has passed — a "5 days" that ended
  // last week is not a streak.
  const storedStreak = profile?.streak.current || library?.streak || 0;
  const lastReadDate = profile?.streak.lastReadDate ?? null;
  const streak = useMemo(() => {
    if (!storedStreak || !lastReadDate) {
      return storedStreak;
    }
    const gap = daysBetween(lastReadDate, localDateKey());
    return Number.isNaN(gap) || gap <= 1 ? storedStreak : 0;
  }, [lastReadDate, storedStreak]);
  const longestStreak = profile?.streak.longest || 0;

  // The seven-day sparkline. `recent_days` is the real record — a bar per day,
  // scaled by pages against the week's busiest day so a big session reads
  // taller than a page or two. A backend without it gets the old ramp toward
  // today, which is honest about the shape rather than the detail.
  const recentDays = profile?.streak.recentDays;
  const week = useMemo(() => {
    if (recentDays && recentDays.length === 7) {
      const busiest = Math.max(...recentDays.map(day => day.pages_read), 1);
      return recentDays.map(day =>
        day.read
          ? READ_BAR_FLOOR +
            (1 - READ_BAR_FLOOR) * Math.min(1, day.pages_read / busiest)
          : IDLE_BAR,
      );
    }
    return Array.from({ length: 7 }, (_, index) => {
      const daysAgo = 6 - index;
      return streak > daysAgo ? READ_BAR_FLOOR + (index / 6) * 0.55 : IDLE_BAR;
    });
  }, [recentDays, streak]);

  // The month's goal. `goal` is the server's count of books whose
  // `finished_at` fell in this month; a backend that cannot count the month
  // falls back to the all-time total capped at the target, which is what the
  // card showed before the count existed.
  const goalTarget =
    profile?.goal?.target ?? profile?.monthlyGoal ?? DEFAULT_MONTHLY_GOAL;
  const goalCompleted =
    profile?.goal?.completed ?? Math.min(finishedCount, goalTarget);
  const goalRemaining = Math.max(0, goalTarget - goalCompleted);

  const saveGoal = useCallback(
    (target: number) => {
      updateGoal.mutate(target, {
        onSuccess: goalSheet.close,
        onError: error =>
          Alert.alert(
            'Could not save the goal',
            error instanceof Error ? error.message : 'Please try again.',
          ),
      });
    },
    [goalSheet.close, updateGoal],
  );

  // The server's four achievements, drawn with the marks above. Until a
  // backend awards them the two the client can judge are judged here, so an
  // older project still shows a reader their week streak.
  const serverAchievements = profile?.achievements;
  const achievements = useMemo<Achievement[]>(() => {
    const rows = new Map<AchievementId, AchievementRow>(
      (serverAchievements ?? []).map(row => [row.id, row]),
    );
    const local: Record<AchievementId, AchievementRow['progress']> = {
      'first-book': { current: finishedCount, target: 1 },
      'streak-7': { current: longestStreak, target: 7 },
      'books-25': { current: finishedCount, target: 25 },
      'night-reader': { current: 0, target: 5 },
    };
    return ACHIEVEMENT_ORDER.map(id => {
      const row = rows.get(id);
      const progress = row?.progress ?? local[id];
      return {
        id,
        ...ACHIEVEMENT_FACES[id],
        earned: row ? row.earned : progress.current >= progress.target,
        progress,
      };
    });
  }, [finishedCount, longestStreak, serverAchievements]);

  const earned = achievements.filter(achievement => achievement.earned).length;

  const planName = subscription?.active
    ? (subscription.plan?.name ?? 'Premium')
    : 'Free';

  if (!isAuthenticated) {
    return (
      <Screen gap={22}>
        <View style={styles.identity}>
          <Avatar
            imageUrl={avatarUrl}
            name={profile?.fullName}
            size={62}
            shape="squircle"
          />
          <View style={styles.identityBody}>
            <Display size={24}>Your reading record</Display>
          </View>
        </View>
        <GuestAuthPanel
          title="Your record starts here."
          message="Sign in to keep your streak, your finished books and your reading time across devices."
        />
        <SettingsSection />
      </Screen>
    );
  }

  return (
    <Screen gap={20}>
      <View style={styles.identity}>
        <Avatar
          imageUrl={avatarUrl}
          name={profile?.fullName}
          size={62}
          shape="squircle"
        />
        <View style={styles.identityBody}>
          <Display size={24} numberOfLines={1}>
            {profile?.fullName || 'Reader'}
          </Display>
          <RecordHeader
            email={profile?.email}
            memberSince={profile?.memberSince}
          />
        </View>
        {/* Centred against the whole name / email / date block, not just the
            name line — the row's `alignItems` does the work. */}
        <Badge
          label={planName.toUpperCase()}
          tone={subscription?.active ? 'gold' : 'neutral'}
          bordered
        />
      </View>

      {/* The longest streak is a real column on `reading_streaks`; it used to
          echo the current one back, which made the record read as if the
          reader had never done better than today. */}
      <StreakCard
        current={streak}
        longest={longestStreak || undefined}
        week={week}
      />

      <StatRow stats={stats} />

      <GoalCard
        completed={goalCompleted}
        target={goalTarget}
        note={
          goalRemaining === 0
            ? 'Goal reached. Anything else this month is a bonus.'
            : `${goalRemaining} more to reach this month’s goal.`
        }
        onEdit={goalSheet.open}
      />

      <AchievementRail
        achievements={achievements}
        earnedCount={earned}
        totalCount={achievements.length}
      />

      <SettingsSection />

      <GoalSheet
        visible={goalSheet.visible}
        onClose={goalSheet.close}
        target={goalTarget}
        completed={goalCompleted}
        saving={updateGoal.isPending}
        onSave={saveGoal}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  identityBody: {
    flex: 1,
    gap: 6,
  },
});
