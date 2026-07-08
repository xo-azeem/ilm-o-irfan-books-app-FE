import { memo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

import { Section } from '@/components/layout';
import { Text } from '@/components/ui';
import { palette } from '@/theme/palette';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { helpTopics } from '@/features/profile/data/profileContent';

export const HelpCenterScreen = memo(function HelpCenterScreen() {
  const [expandedId, setExpandedId] = useState<string | null>(helpTopics[0]?.id ?? null);

  return (
    <ProfileSubScreenLayout
      title="Help center"
      subtitle="Quick answers to common questions.">
      <Section title="FAQ">
        {helpTopics.map((topic, index) => {
          const isExpanded = expandedId === topic.id;

          return (
            <View
              key={topic.id}
              className={
                index < helpTopics.length - 1
                  ? 'border-b border-app-border dark:border-app-border-dark'
                  : undefined
              }>
              <Pressable
                onPress={() => setExpandedId(isExpanded ? null : topic.id)}
                className="flex-row items-center gap-3 px-4 py-3.5 active:opacity-60">
                <Text className="min-w-0 flex-1 text-[16px] font-medium leading-[21px] text-app-ink dark:text-app-ink-dark">
                  {topic.question}
                </Text>
                {isExpanded ? (
                  <ChevronUp size={18} color={palette.green} strokeWidth={2} />
                ) : (
                  <ChevronDown size={18} color={palette.green} strokeWidth={2} />
                )}
              </Pressable>
              {isExpanded ? (
                <Text className="px-4 pb-3.5 text-[14px] leading-[20px] text-app-muted dark:text-app-muted-dark">
                  {topic.answer}
                </Text>
              ) : null}
            </View>
          );
        })}
      </Section>

      <View className="mt-7">
        <Pressable className="items-center rounded-[14px] bg-app-primary py-3.5 active:opacity-90 dark:bg-app-primary-dark">
          <Text className="text-[16px] font-semibold text-app-on-primary dark:text-app-on-primary-dark">
            Contact support
          </Text>
        </Pressable>
      </View>
    </ProfileSubScreenLayout>
  );
});
