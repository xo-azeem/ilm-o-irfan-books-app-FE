import { memo } from 'react';

import { Section } from '@/components/layout';
import { Text } from '@/components/ui';
import { ProfileOptionRow } from '@/features/profile/components/ProfileOptionRow';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { appearanceOptions } from '@/features/profile/data/profileContent';
import { useThemeStore } from '@/stores/themeStore';

export const AppearanceScreen = memo(function AppearanceScreen() {
  const themePreference = useThemeStore(state => state.themePreference);
  const setThemePreference = useThemeStore(state => state.setThemePreference);

  return (
    <ProfileSubScreenLayout
      title="Appearance"
      subtitle="Choose how Ilm o Irfan looks on your device.">
      <Section title="Theme">
        {appearanceOptions.map((option, index) => (
          <ProfileOptionRow
            key={option.id}
            label={option.label}
            description={option.description}
            selected={themePreference === option.id}
            onPress={() => setThemePreference(option.id)}
            isLast={index === appearanceOptions.length - 1}
          />
        ))}
      </Section>

      <Text className="mt-5 px-1 text-[13px] leading-[18px] text-app-muted dark:text-app-muted-dark">
        Your choice is saved on this device. System follows your phone&apos;s light or dark mode
        setting.
      </Text>
    </ProfileSubScreenLayout>
  );
});
