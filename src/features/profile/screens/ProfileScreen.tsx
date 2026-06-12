import { View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { ListRow, Screen, ScreenHeader, Section } from '@/components/layout';
import { DisplayText, Text } from '@/components/ui';
import { palette } from '@/theme/palette';

const settingsRows = [
  { title: 'Account', subtitle: 'Sign in to sync progress' },
  { title: 'Notifications', subtitle: 'Daily reminders' },
  { title: 'Appearance', subtitle: 'System default' },
  { title: 'Language', subtitle: 'English' },
];

export function ProfileScreen() {
  return (
    <Screen>
      <ScreenHeader title="Profile" subtitle="Your learning space." />

      <View className="mb-6 items-center rounded-[20px] bg-app-surface px-5 py-6 dark:bg-app-surface-dark">
        <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-app-fill dark:bg-app-fill-dark">
          <DisplayText className="text-[28px] font-bold text-app-primary dark:text-app-primary-dark">
            IO
          </DisplayText>
        </View>
        <DisplayText className="text-[22px] font-semibold text-app-ink dark:text-app-ink-dark">
          Guest learner
        </DisplayText>
        <Text className="mt-1 text-[15px] text-app-muted dark:text-app-muted-dark">
          Sign in to personalize your journey
        </Text>
        <View className="mt-5 w-full rounded-[14px] bg-app-primary px-4 py-3 dark:bg-app-primary-dark">
          <Text className="text-center text-[17px] font-semibold text-app-on-primary dark:text-app-on-primary-dark">
            Continue with Apple
          </Text>
        </View>
      </View>

      <View className="mb-6 flex-row gap-3">
        {[
          { label: 'Lessons', value: '12' },
          { label: 'Streak', value: '5d' },
          { label: 'Saved', value: '3' },
        ].map(stat => (
          <View
            key={stat.label}
            className="flex-1 items-center rounded-[16px] border border-app-border bg-app-surface px-3 py-4 dark:border-app-border-dark dark:bg-app-surface-dark">
            <DisplayText className="text-[22px] font-bold text-app-primary dark:text-app-primary-dark">
              {stat.value}
            </DisplayText>
            <Text className="mt-1 text-[13px] text-app-muted dark:text-app-muted-dark">
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      <Section title="Settings">
        {settingsRows.map((row, index) => (
          <ListRow
            key={row.title}
            title={row.title}
            subtitle={row.subtitle}
            isLast={index === settingsRows.length - 1}
            trailing={
              <ChevronRight color={palette.yellowGreen} size={18} strokeWidth={2} />
            }
          />
        ))}
      </Section>
    </Screen>
  );
}
