import { Pressable, View } from 'react-native';
import { Search, X } from 'lucide-react-native';

import { Screen, ScreenHeader, Section } from '@/components/layout';
import { Text } from '@/components/ui';
import { CategoryBrowseSection } from '@/features/explore/components/CategoryBrowseSection';
import { palette } from '@/theme/palette';

const recentSearches = [
  'Tafsir',
  'Seerah',
  'Purification of the heart',
];

const popularTopics = [
  'Quranic Studies',
  'Spirituality',
  'Fiqh',
  'Hadith',
  'Arabic',
  'History',
];

export function SearchScreen() {
  return (
    <Screen>
      <ScreenHeader title="Search" subtitle="Find books, authors, and topics." />

      <View className="mb-6 flex-row items-center gap-3 rounded-2xl border border-app-border bg-app-surface px-4 py-3.5 dark:border-app-border-dark dark:bg-app-surface-dark">
        <Search size={18} color={palette.yellowGreen} strokeWidth={2} />
        <Text className="flex-1 text-[16px] text-app-faint dark:text-app-faint-dark">
          Search books, authors, topics…
        </Text>
      </View>

      {recentSearches.length > 0 ? (
        <View className="mb-6">
          <Text className="mb-3 px-1 text-[13px] font-medium uppercase tracking-widest text-app-muted dark:text-app-muted-dark">
            Recent
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {recentSearches.map(term => (
              <Pressable
                key={term}
                className="flex-row items-center gap-1.5 rounded-full border border-app-border bg-app-surface px-3.5 py-2 active:opacity-80 dark:border-app-border-dark dark:bg-app-surface-dark">
                <Text className="text-[14px] text-app-ink dark:text-app-ink-dark">
                  {term}
                </Text>
                <X size={14} color={palette.yellowGreen} strokeWidth={2} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <CategoryBrowseSection />

      <Section title="Popular topics">
        {popularTopics.map((topic, index) => (
          <Pressable
            key={topic}
            className={`flex-row items-center px-4 py-3.5 active:opacity-80 ${
              index < popularTopics.length - 1
                ? 'border-b border-app-border dark:border-app-border-dark'
                : ''
            }`}>
            <Text className="flex-1 text-[16px] text-app-ink dark:text-app-ink-dark">
              {topic}
            </Text>
            <Search size={16} color={palette.yellowGreen} strokeWidth={2} />
          </Pressable>
        ))}
      </Section>
    </Screen>
  );
}
