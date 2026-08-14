import { Pressable } from 'react-native';

import { Text } from '@/components/ui';

import { GoogleLogoIcon } from './GoogleLogoIcon';

type GoogleSignInButtonProps = {
  onPress?: () => void;
  label?: string;
};

const GOOGLE_ICON_SIZE = 18;

export function GoogleSignInButton({
  onPress,
  label = 'Continue with Google',
}: GoogleSignInButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-[52px] flex-row items-center justify-center gap-2.5 rounded-[14px] border border-app-border bg-app-surface active:opacity-80 dark:border-app-border-dark dark:bg-app-surface-dark">
      <GoogleLogoIcon size={GOOGLE_ICON_SIZE} />
      <Text className="text-[16px] font-semibold text-app-ink dark:text-app-ink-dark">
        {label}
      </Text>
    </Pressable>
  );
}
