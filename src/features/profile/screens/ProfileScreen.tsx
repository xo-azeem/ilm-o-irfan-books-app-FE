import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { GuestAuthPanel } from '@/components/auth/GuestAuthPanel';
import { Screen } from '@/components/layout';
import { Avatar, Badge, Display } from '@/components/ui';
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
} from '@/hooks/useAccount';
import { useAuthStore } from '@/stores/authStore';

/** This month's target. A real goal-setting screen would replace the constant. */
const MONTHLY_GOAL = 4;

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
  const streak = profile?.streak.current || library?.streak || 0;
  const longestStreak = profile?.streak.longest || 0;

  // A seven-day sparkline. Without per-day history the streak is shown as a
  // ramp toward today, which is honest about the shape rather than the detail.
  const week = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const daysAgo = 6 - index;
      return streak > daysAgo ? 0.45 + (index / 6) * 0.55 : 0.25;
    });
    return days;
  }, [streak]);

  const achievements = useMemo<Achievement[]>(
    () => [
      {
        id: 'streak-7',
        mark: '7',
        label: 'Week streak',
        earned: streak >= 7,
        tone: 'gold',
      },
      {
        id: 'books-25',
        mark: '25',
        label: '25 books',
        earned: finishedCount >= 25,
        tone: 'primary',
      },
      { id: 'night', mark: '☾', label: 'Night reader', earned: false },
      { id: 'locked', mark: '?', label: 'Locked', earned: false },
    ],
    [finishedCount, streak],
  );

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
        completed={Math.min(finishedCount, MONTHLY_GOAL)}
        target={MONTHLY_GOAL}
        note={
          finishedCount >= MONTHLY_GOAL
            ? 'Goal reached. Anything else this month is a bonus.'
            : `${MONTHLY_GOAL - finishedCount} more to reach this month’s goal.`
        }
      />

      <AchievementRail
        achievements={achievements}
        earnedCount={earned}
        totalCount={achievements.length}
      />

      <SettingsSection />
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
