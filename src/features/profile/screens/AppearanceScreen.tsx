import { memo } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { AppearanceThemeOption } from '@/features/profile/components/AppearanceThemeOption';
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
      <View className="gap-2">
        <Text className="px-1 text-[13px] font-medium uppercase tracking-widest text-app-muted dark:text-app-muted-dark">
          Theme
        </Text>

        <View className="gap-3">
          {appearanceOptions.map(option => (
            <AppearanceThemeOption
              key={option.id}
              option={option}
              selected={themePreference === option.id}
              onPress={() => setThemePreference(option.id)}
            />
          ))}
        </View>
      </View>

      <Text className="mt-5 px-1 text-[13px] leading-[18px] text-app-muted dark:text-app-muted-dark">
        Your choice is saved on this device. System follows your phone&apos;s light
        or dark mode setting.
      </Text>
    </ProfileSubScreenLayout>
  );
});
