import { memo } from 'react';
import { View } from 'react-native';
import { BookOpen } from 'lucide-react-native';

import { Section } from '@/components/layout';
import { DisplayText, Text } from '@/components/ui';
import { palette } from '@/theme/palette';
import { ProfileInfoField } from '@/features/profile/components/ProfileInfoField';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { aboutDetails } from '@/features/profile/data/profileContent';

export const AboutScreen = memo(function AboutScreen() {
  return (
    <ProfileSubScreenLayout title="About" subtitle="App information and credits.">
      <View className="mb-7 items-center rounded-[20px] bg-app-surface px-6 py-8 dark:bg-app-surface-dark">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-[18px] bg-app-primary dark:bg-app-primary-dark">
          <BookOpen color={palette.limelight} size={28} strokeWidth={1.8} />
        </View>
        <DisplayText className="text-[22px] font-bold text-app-ink dark:text-app-ink-dark">
          Ilm o Irfan
        </DisplayText>
        <Text className="mt-1 text-center text-[14px] text-app-muted dark:text-app-muted-dark">
          A modern home for Islamic learning and reflection.
        </Text>
      </View>

      <Section title="Details">
        {aboutDetails.map((item, index) => (
          <ProfileInfoField
            key={item.id}
            label={item.label}
            value={item.value}
            isLast={index === aboutDetails.length - 1}
          />
        ))}
      </Section>

      <Text className="mt-6 px-1 text-center text-[13px] leading-[18px] text-app-faint dark:text-app-faint-dark">
        Made with care for readers seeking knowledge and spiritual growth.
      </Text>
    </ProfileSubScreenLayout>
  );
});
