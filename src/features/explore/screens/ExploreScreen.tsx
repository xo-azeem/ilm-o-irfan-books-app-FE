import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, Text } from '@/components/ui';

const topics = [
  {
    title: 'Feature modules',
    description:
      'Keep screens, hooks, and feature logic together under src/features.',
  },
  {
    title: 'Shared components',
    description:
      'Reusable UI lives in src/components so features stay focused.',
  },
  {
    title: 'App shell',
    description:
      'Navigation, providers, and bootstrap code stay in src/app.',
  },
];

export function ExploreScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-6">
        <View className="gap-2">
          <Text className="text-3xl font-bold">Explore</Text>
          <Text className="text-base text-slate-600 dark:text-slate-300">
            A quick look at how this project is organized.
          </Text>
        </View>

        {topics.map(topic => (
          <Card key={topic.title} className="gap-2">
            <Text className="text-lg font-semibold">{topic.title}</Text>
            <Text className="text-slate-600 dark:text-slate-300">
              {topic.description}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
