import { View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { ListRow, Screen, ScreenHeader, Section } from '@/components/layout';
import { Text } from '@/components/ui';

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

      <View className="mb-6 items-center rounded-[20px] bg-ios-surface px-5 py-6 dark:bg-ios-surface-dark">
        <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-ios-fill dark:bg-ios-fill-dark">
          <Text className="text-[28px] font-semibold text-ios-label dark:text-ios-label-dark">
            IO
          </Text>
        </View>
        <Text className="text-[22px] font-semibold text-ios-label dark:text-ios-label-dark">
          Guest learner
        </Text>
        <Text className="mt-1 text-[15px] text-ios-secondary dark:text-ios-secondary-dark">
          Sign in to personalize your journey
        </Text>
        <View className="mt-5 w-full rounded-[14px] bg-ios-label px-4 py-3 dark:bg-ios-label-dark">
          <Text className="text-center text-[17px] font-semibold text-white dark:text-black">
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
            className="flex-1 items-center rounded-[16px] bg-ios-surface px-3 py-4 dark:bg-ios-surface-dark">
            <Text className="text-[22px] font-bold text-ios-label dark:text-ios-label-dark">
              {stat.value}
            </Text>
            <Text className="mt-1 text-[13px] text-ios-secondary dark:text-ios-secondary-dark">
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
              <ChevronRight color="#C7C7CC" size={18} strokeWidth={2} />
            }
          />
        ))}
      </Section>
    </Screen>
  );
}
