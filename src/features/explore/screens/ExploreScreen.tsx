import { View } from 'react-native';
import { ChevronRight, Search } from 'lucide-react-native';

import {
  ListRow,
  MediaCard,
  Screen,
  ScreenHeader,
  Section,
} from '@/components/layout';
import { Text } from '@/components/ui';

const categories = [
  { title: 'Quranic Studies', count: '128 topics' },
  { title: 'Spirituality', count: '84 topics' },
  { title: 'History', count: '56 topics' },
  { title: 'Ethics', count: '42 topics' },
];

const featured = [
  {
    title: 'Foundations of Tafsir',
    subtitle: 'A concise introduction to Quranic interpretation.',
    meta: '12 lessons · Beginner',
    accentClassName: 'bg-emerald-100 dark:bg-emerald-950',
  },
  {
    title: 'Path of Ihsan',
    subtitle: 'Reflections on sincerity and spiritual excellence.',
    meta: '8 lessons · Intermediate',
    accentClassName: 'bg-sky-100 dark:bg-sky-950',
  },
];

export function ExploreScreen() {
  return (
    <Screen>
      <ScreenHeader
        title="Explore"
        subtitle="Discover knowledge curated for you."
        action={
          <View className="h-10 w-10 items-center justify-center rounded-full bg-ios-surface dark:bg-ios-surface-dark">
            <Search color="#8E8E93" size={20} strokeWidth={2} />
          </View>
        }
      />

      <View className="mb-6 flex-row flex-wrap gap-2">
        {['All', 'Recent', 'Popular', 'Short reads'].map((chip, index) => (
          <View
            key={chip}
            className={`rounded-full px-4 py-2 ${
              index === 0
                ? 'bg-ios-label dark:bg-ios-label-dark'
                : 'bg-ios-surface dark:bg-ios-surface-dark'
            }`}>
            <Text
              className={`text-[15px] font-medium ${
                index === 0
                  ? 'text-white dark:text-black'
                  : 'text-ios-label dark:text-ios-label-dark'
              }`}>
              {chip}
            </Text>
          </View>
        ))}
      </View>

      <View className="mb-6 gap-4">
        {featured.map(item => (
          <MediaCard key={item.title} {...item} />
        ))}
      </View>

      <Section title="Browse">
        {categories.map((item, index) => (
          <ListRow
            key={item.title}
            title={item.title}
            subtitle={item.count}
            isLast={index === categories.length - 1}
            trailing={
              <ChevronRight color="#C7C7CC" size={18} strokeWidth={2} />
            }
          />
        ))}
      </Section>
    </Screen>
  );
}
