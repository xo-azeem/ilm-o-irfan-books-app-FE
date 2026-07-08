import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { Section } from '@/components/layout';
import { DisplayText, Text } from '@/components/ui';
import { palette } from '@/theme/palette';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { subscriptionPlan } from '@/features/profile/data/profileContent';

export const SubscriptionScreen = memo(function SubscriptionScreen() {
  return (
    <ProfileSubScreenLayout
      title="Subscription"
      subtitle="Your current plan and benefits.">
      <View className="mb-7 overflow-hidden rounded-[20px] bg-app-surface p-5 dark:bg-app-surface-dark">
        <View className="mb-1 flex-row items-center justify-between">
          <DisplayText className="text-[22px] font-bold text-app-ink dark:text-app-ink-dark">
            {subscriptionPlan.name}
          </DisplayText>
          <View className="rounded-full bg-app-fill px-3 py-1 dark:bg-app-fill-dark">
            <Text className="text-[11px] font-semibold uppercase tracking-wide text-app-primary dark:text-app-primary-dark">
              Active
            </Text>
          </View>
        </View>
        <Text className="text-[15px] font-medium text-app-primary dark:text-app-primary-dark">
          {subscriptionPlan.price}
        </Text>
        <Text className="mt-1 text-[13px] text-app-muted dark:text-app-muted-dark">
          {subscriptionPlan.renewsOn}
        </Text>
      </View>

      <Section title="Included">
        {subscriptionPlan.features.map((feature, index) => (
          <View
            key={feature}
            className={`flex-row items-center gap-3 px-4 py-3.5 ${
              index < subscriptionPlan.features.length - 1
                ? 'border-b border-app-border dark:border-app-border-dark'
                : ''
            }`}>
            <Check size={16} color={palette.green} strokeWidth={2.5} />
            <Text className="flex-1 text-[15px] text-app-ink dark:text-app-ink-dark">
              {feature}
            </Text>
          </View>
        ))}
      </Section>

      <View className="mt-7 gap-3">
        <Pressable className="items-center rounded-[14px] bg-app-primary py-3.5 active:opacity-90 dark:bg-app-primary-dark">
          <Text className="text-[16px] font-semibold text-app-on-primary dark:text-app-on-primary-dark">
            Manage billing
          </Text>
        </Pressable>
        <Pressable className="items-center rounded-[14px] border border-app-border py-3.5 active:opacity-80 dark:border-app-border-dark">
          <Text className="text-[16px] font-semibold text-app-ink dark:text-app-ink-dark">
            View plans
          </Text>
        </Pressable>
      </View>
    </ProfileSubScreenLayout>
  );
});
