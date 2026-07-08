import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';

import { Screen } from '@/components/layout';
import { DisplayText, Text } from '@/components/ui';
import { palette } from '@/theme/palette';

type ProfileSubScreenLayoutProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  footer?: ReactNode;
}>;

export function ProfileSubScreenLayout({
  title,
  subtitle,
  footer,
  children,
}: ProfileSubScreenLayoutProps) {
  const navigation = useNavigation();

  return (
    <Screen contentContainerClassName="px-5 pt-0">
      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Go back to profile"
        className="-ml-1 mb-5 flex-row items-center gap-0.5 self-start py-1 active:opacity-60">
        <ChevronLeft size={22} color={palette.green} strokeWidth={2.25} />
        <Text className="text-[17px] font-medium text-app-primary dark:text-app-primary-dark">
          Profile
        </Text>
      </Pressable>

      <View className="mb-6 gap-1">
        <DisplayText className="text-[28px] font-bold leading-[32px] tracking-tight text-app-ink dark:text-app-ink-dark">
          {title}
        </DisplayText>
        {subtitle ? (
          <Text className="text-[15px] leading-5 text-app-muted dark:text-app-muted-dark">
            {subtitle}
          </Text>
        ) : null}
      </View>

      {children}

      {footer}
    </Screen>
  );
}
