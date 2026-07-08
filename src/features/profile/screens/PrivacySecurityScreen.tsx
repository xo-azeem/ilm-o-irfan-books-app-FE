import { memo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { ListRow, Section } from '@/components/layout';
import { Text } from '@/components/ui';
import { palette } from '@/theme/palette';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { ProfileToggleRow } from '@/features/profile/components/ProfileToggleRow';
import { privacyOptions } from '@/features/profile/data/profileContent';

export const PrivacySecurityScreen = memo(function PrivacySecurityScreen() {
  const [toggles, setToggles] = useState(() =>
    Object.fromEntries(privacyOptions.map(option => [option.id, option.defaultValue])),
  );

  const updateToggle = (id: string, value: boolean) => {
    setToggles(current => ({ ...current, [id]: value }));
  };

  return (
    <ProfileSubScreenLayout
      title="Privacy & security"
      subtitle="Control your data and account security.">
      <Section title="Privacy">
        {privacyOptions.map((option, index) => (
          <ProfileToggleRow
            key={option.id}
            label={option.label}
            description={option.description}
            value={toggles[option.id] ?? false}
            onValueChange={value => updateToggle(option.id, value)}
            isLast={index === privacyOptions.length - 1}
          />
        ))}
      </Section>

      <Section title="Legal" className="mt-7">
        <ListRow
          title="Privacy policy"
          trailing={<ChevronRight color={palette.yellowGreen} size={18} strokeWidth={2} />}
        />
        <ListRow
          title="Terms of service"
          isLast
          trailing={<ChevronRight color={palette.yellowGreen} size={18} strokeWidth={2} />}
        />
      </Section>

      <View className="mt-7">
        <Pressable className="items-center rounded-[14px] border border-app-border py-3.5 active:opacity-80 dark:border-app-border-dark">
          <Text className="text-[16px] font-semibold text-app-ink dark:text-app-ink-dark">
            Change password
          </Text>
        </Pressable>
      </View>
    </ProfileSubScreenLayout>
  );
});
