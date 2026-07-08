import { memo, useState } from 'react';

import { Section } from '@/components/layout';
import { Text } from '@/components/ui';
import { ProfileOptionRow } from '@/features/profile/components/ProfileOptionRow';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { languageOptions } from '@/features/profile/data/profileContent';

export const LanguageScreen = memo(function LanguageScreen() {
  const [selected, setSelected] = useState('en');

  return (
    <ProfileSubScreenLayout
      title="Language"
      subtitle="Select your preferred reading language.">
      <Section title="Available languages">
        {languageOptions.map((option, index) => (
          <ProfileOptionRow
            key={option.id}
            label={option.label}
            description={option.description}
            selected={selected === option.id}
            onPress={() => setSelected(option.id)}
            isLast={index === languageOptions.length - 1}
          />
        ))}
      </Section>

      <Text className="mt-5 px-1 text-[13px] leading-[18px] text-app-muted dark:text-app-muted-dark">
        More languages will be added over time. Your selection applies across the app interface.
      </Text>
    </ProfileSubScreenLayout>
  );
});
