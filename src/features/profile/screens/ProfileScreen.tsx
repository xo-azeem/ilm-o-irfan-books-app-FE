import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Settings2 } from 'lucide-react-native';

import { GuestAuthPanel } from '@/components/auth/GuestAuthPanel';
import { Screen } from '@/components/layout';
import { Avatar, Display, IconButton } from '@/components/ui';
import {
  AchievementRail,
  GoalCard,
  RecordHeader,
  StatRow,
  StreakCard,
  type Achievement,
} from '@/features/profile/components/ReadingRecord';
import type { ProfileStackParamList } from '@/features/profile/navigation/types';
import { useLibrary, useProfile, useSubscription } from '@/hooks/useAccount';
import { useAuthStore } from '@/stores/authStore';

type ProfileNavigation = NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

/** This month's target. A real goal-setting screen would replace the constant. */
const MONTHLY_GOAL = 4;

/**
 * The reading record.
 *
 * Statistics come first and settings live behind the gear, because what a
 * reader wants from this tab most often is a sense of how their reading is
 * going — not a list of preferences.
 */
export function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigation>();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const { data: profile } = useProfile();
  const { data: library } = useLibrary();
  const { data: subscription } = useSubscription();

  const openSettings = useCallback(() => navigation.navigate('Settings'), [navigation]);

  const finished = useMemo(
    () => (library?.progress ?? []).filter(book => book.progress >= 1),
    [library?.progress],
  );

  const stats = useMemo(
    () => [
      { value: String(finished.length), label: 'BOOKS\nFINISHED' },
      {
        value: String(library?.highlightsCount ?? 0),
        label: 'PAGES\nBOOKMARKED',
      },
      { value: String(library?.downloads.length ?? 0), label: 'BOOKS\nOFFLINE' },
    ],
    [finished.length, library?.downloads.length, library?.highlightsCount],
  );

  const streak = library?.streak ?? 0;

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
      { id: 'streak-7', mark: '7', label: 'Week streak', earned: streak >= 7, tone: 'gold' },
      {
        id: 'books-25',
        mark: '25',
        label: '25 books',
        earned: finished.length >= 25,
        tone: 'primary',
      },
      { id: 'night', mark: '☾', label: 'Night reader', earned: false },
      { id: 'locked', mark: '?', label: 'Locked', earned: false },
    ],
    [finished.length, streak],
  );

  const earned = achievements.filter(achievement => achievement.earned).length;

  if (!isAuthenticated) {
    return (
      <Screen gap={22}>
        <View style={styles.identity}>
          <Avatar name={profile?.fullName} size={62} shape="squircle" />
          <View style={styles.identityBody}>
            <Display size={24}>Your reading record</Display>
          </View>
          <IconButton
            icon={Settings2}
            onPress={openSettings}
            variant="plain"
            buttonSize={36}
            accessibilityLabel="Settings"
          />
        </View>
        <GuestAuthPanel
          title="Your record starts here."
          message="Sign in to keep your streak, your finished books and your reading time across devices."
        />
      </Screen>
    );
  }

  return (
    <Screen gap={20}>
      <View style={styles.identity}>
        <Avatar name={profile?.fullName} size={62} shape="squircle" />
        <View style={styles.identityBody}>
          <Display size={24} numberOfLines={1}>
            {profile?.fullName || 'Reader'}
          </Display>
          <RecordHeader
            memberSince={profile?.memberSince}
            isMember={subscription?.active ?? false}
          />
        </View>
        <IconButton
          icon={Settings2}
          onPress={openSettings}
          variant="plain"
          buttonSize={36}
          accessibilityLabel="Settings"
        />
      </View>

      <StreakCard current={streak} longest={Math.max(streak, 0) || undefined} week={week} />

      <StatRow stats={stats} />

      <GoalCard
        completed={Math.min(finished.length, MONTHLY_GOAL)}
        target={MONTHLY_GOAL}
        note={
          finished.length >= MONTHLY_GOAL
            ? 'Goal reached. Anything else this month is a bonus.'
            : `${MONTHLY_GOAL - finished.length} more to reach this month’s goal.`
        }
      />

      <AchievementRail
        achievements={achievements}
        earnedCount={earned}
        totalCount={achievements.length}
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
