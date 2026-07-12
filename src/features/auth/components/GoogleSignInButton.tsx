import { Pressable } from 'react-native';

import { Text } from '@/components/ui';

import { GoogleLogoIcon } from './GoogleLogoIcon';

type GoogleSignInButtonProps = {
  onPress?: () => void;
  label?: string;
};

const GOOGLE_ICON_SIZE = 22;

export function GoogleSignInButton({
  onPress,
  label = 'Continue with Google',
}: GoogleSignInButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-row items-center justify-center gap-3 rounded-[14px] border border-app-border bg-app-surface py-3.5 active:opacity-85 dark:border-app-border-dark dark:bg-app-surface-dark">
      <GoogleLogoIcon size={GOOGLE_ICON_SIZE} />
      <Text className="text-[16px] font-semibold text-app-ink dark:text-app-ink-dark">
        {label}
      </Text>
    </Pressable>
  );
}
