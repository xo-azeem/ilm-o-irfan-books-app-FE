import { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/ui';
import { radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

import { GoogleLogoIcon } from './GoogleLogoIcon';

/**
 * Google and guest sign-in share one outlined shape so neither reads as the
 * primary path — the green button above them is the primary path.
 */
export const GoogleSignInButton = memo(function GoogleSignInButton({
  onPress,
  label = 'Continue with Google',
  /** Guest access is preserved from the current build; it uses the same shell. */
  showLogo = true,
}: {
  onPress?: () => void;
  label?: string;
  showLogo?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        { borderColor: colors.borderStrong },
        pressed && styles.pressed,
      ]}>
      {showLogo ? <GoogleLogoIcon size={18} /> : null}
      <Text size={fontSize.bodySmall} leading={1} weight="500" tone="soft">
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  button: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: radius.field,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  pressed: {
    opacity: 0.75,
  },
});
