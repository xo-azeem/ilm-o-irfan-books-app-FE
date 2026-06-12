import { View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { ListRow, Screen, ScreenHeader, Section } from '@/components/layout';
import { DisplayText, Text } from '@/components/ui';
import { palette } from '@/theme/palette';

const libraryItems = [
  {
    title: 'Introduction to Usul al-Fiqh',
    subtitle: 'Lesson 4 of 12 · 18 min left',
    progress: 0.35,
  },
  {
    title: 'Seerah: Early Makkah',
    subtitle: 'Completed · 6 lessons',
    progress: 1,
  },
  {
    title: 'Purification of the Heart',
    subtitle: 'Lesson 2 of 10 · 32 min left',
    progress: 0.2,
  },
];

function ProgressBar({ value }: { value: number }) {
  return (
    <View className="h-1.5 overflow-hidden rounded-full bg-app-fill dark:bg-app-fill-dark">
      <View
        className="h-full rounded-full bg-app-primary dark:bg-app-primary-dark"
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </View>
  );
}

export function LibraryScreen() {
  return (
    <Screen>
      <ScreenHeader title="My Library" subtitle="Continue where you left off." />

      <Section title="In progress">
        {libraryItems.map((item, index) => (
          <View
            key={item.title}
            className={`gap-3 px-4 py-3 ${
              index < libraryItems.length - 1
                ? 'border-b border-app-border dark:border-app-border-dark'
                : ''
            }`}>
            <View className="flex-row items-center gap-3">
              <View className="min-w-0 flex-1 gap-0.5">
                <DisplayText
                  className="text-[17px] leading-[22px] text-app-ink dark:text-app-ink-dark"
                  numberOfLines={1}>
                  {item.title}
                </DisplayText>
                <Text className="text-[13px] leading-[18px] text-app-muted dark:text-app-muted-dark">
                  {item.subtitle}
                </Text>
              </View>
              <ChevronRight color={palette.yellowGreen} size={18} strokeWidth={2} />
            </View>
            <ProgressBar value={item.progress} />
          </View>
        ))}
      </Section>

      <View className="mt-6">
        <Section title="Collections">
          <ListRow title="Saved lessons" subtitle="14 items" />
          <ListRow title="Downloaded" subtitle="6 items" isLast />
        </Section>
      </View>
    </Screen>
  );
}
