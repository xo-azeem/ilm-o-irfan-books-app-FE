import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { Section } from '@/components/layout';
import { Text } from '@/components/ui';
import { ProfileInfoField } from '@/features/profile/components/ProfileInfoField';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { personalDetailsFields } from '@/features/profile/data/profileContent';

export const PersonalDetailsScreen = memo(function PersonalDetailsScreen() {
  return (
    <ProfileSubScreenLayout
      title="Personal details"
      subtitle="Manage your account information.">
      <Section title="Your information">
        {personalDetailsFields.map((field, index) => (
          <ProfileInfoField
            key={field.id}
            label={field.label}
            value={field.value}
            isLast={index === personalDetailsFields.length - 1}
          />
        ))}
      </Section>

      <View className="mt-7">
        <Pressable className="items-center rounded-[14px] bg-app-primary py-3.5 active:opacity-90 dark:bg-app-primary-dark">
          <Text className="text-[16px] font-semibold text-app-on-primary dark:text-app-on-primary-dark">
            Edit details
          </Text>
        </Pressable>
      </View>
    </ProfileSubScreenLayout>
  );
});
