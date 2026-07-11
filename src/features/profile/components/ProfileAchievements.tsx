import { memo, type ReactNode } from 'react';
import { View } from 'react-native';
import { BookOpen } from 'lucide-react-native';

import { DisplayText, Text } from '@/components/ui';
import type { ProfileAchievement } from '@/features/profile/data/profileContent';
import { useTheme } from '@/theme/ThemeContext';

type StatCellProps = {
  value: string;
  label: string;
  icon: ReactNode;
  showDivider?: boolean;
};

const StatCell = memo(function StatCell({
  value,
  label,
  icon,
  showDivider = true,
}: StatCellProps) {
  return (
    <View className="min-w-0 flex-1 flex-row items-center">
      {showDivider ? (
        <View className="h-10 w-px bg-app-border dark:bg-app-border-dark" />
      ) : null}
      <View className="min-w-0 flex-1 items-center px-3 py-3.5">
        <View className="flex-row items-center gap-1.5">
          {icon}
          <DisplayText className="text-[22px] font-bold leading-7 tabular-nums tracking-tight text-app-ink dark:text-app-ink-dark">
            {value}
          </DisplayText>
        </View>
        <Text className="mt-1 text-center text-[12px] text-app-muted dark:text-app-muted-dark">
          {label}
        </Text>
      </View>
    </View>
  );
});

type ProfileAchievementsProps = {
  achievements: ProfileAchievement[];
  lessonsLabel: string;
  lessonsValue: string;
};

export const ProfileAchievements = memo(function ProfileAchievements({
  achievements,
  lessonsLabel,
  lessonsValue,
}: ProfileAchievementsProps) {
  const { isDark, colors } = useTheme();

  return (
    <View className="gap-2">
      <Text className="px-1 text-[13px] font-medium uppercase tracking-widest text-app-muted dark:text-app-muted-dark">
        Achievements
      </Text>

      <View className="flex-row overflow-hidden rounded-[14px] bg-app-surface dark:bg-app-surface-dark">
        {achievements.map((achievement, index) => {
          const accent = isDark ? achievement.accentDark : achievement.accent;
          const Icon = achievement.icon;

          return (
            <StatCell
              key={achievement.id}
              value={achievement.value}
              label={achievement.label}
              showDivider={index > 0}
              icon={<Icon size={15} color={accent} strokeWidth={1.75} />}
            />
          );
        })}

        <StatCell
          value={lessonsValue}
          label={lessonsLabel}
          showDivider
          icon={<BookOpen size={15} color={colors.primary} strokeWidth={1.75} />}
        />
      </View>
    </View>
  );
});
