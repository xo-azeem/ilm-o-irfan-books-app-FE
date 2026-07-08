import { memo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Star } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { palette } from '@/theme/palette';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';

export const RateAppScreen = memo(function RateAppScreen() {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  return (
    <ProfileSubScreenLayout
      title="Rate the app"
      subtitle="Your feedback helps us improve Ilm o Irfan.">
      <View className="items-center rounded-[20px] bg-app-surface px-6 py-8 dark:bg-app-surface-dark">
        <Text className="mb-5 text-center text-[16px] leading-[22px] text-app-muted dark:text-app-muted-dark">
          How would you rate your experience so far?
        </Text>

        <View className="mb-6 flex-row gap-2">
          {[1, 2, 3, 4, 5].map(value => (
            <Pressable
              key={value}
              onPress={() => setRating(value)}
              accessibilityLabel={`Rate ${value} stars`}
              className="p-1 active:opacity-70">
              <Star
                size={32}
                color={palette.sunflower}
                fill={value <= rating ? palette.sunflower : 'transparent'}
                strokeWidth={1.75}
              />
            </Pressable>
          ))}
        </View>

        <Pressable
          disabled={rating === 0 || submitted}
          onPress={() => setSubmitted(true)}
          className={`w-full items-center rounded-[14px] py-3.5 ${
            rating === 0 || submitted
              ? 'bg-app-fill dark:bg-app-fill-dark'
              : 'bg-app-primary active:opacity-90 dark:bg-app-primary-dark'
          }`}>
          <Text
            className={`text-[16px] font-semibold ${
              rating === 0 || submitted
                ? 'text-app-faint dark:text-app-faint-dark'
                : 'text-app-on-primary dark:text-app-on-primary-dark'
            }`}>
            {submitted ? 'Thank you for your feedback' : 'Submit rating'}
          </Text>
        </Pressable>
      </View>
    </ProfileSubScreenLayout>
  );
});
