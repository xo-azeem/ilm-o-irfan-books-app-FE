import { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/ui';
import { useStrings } from '@/i18n';
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
  label,
  /** Guest access is preserved from the current build; it uses the same shell. */
  showLogo = true,
  disabled = false,
}: {
  onPress?: () => void;
  label?: string;
  showLogo?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const s = useStrings();
  const text = label ?? s.auth.continueWithGoogle;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        { borderColor: colors.borderStrong },
        (pressed || disabled) && styles.pressed,
      ]}
    >
      {showLogo ? <GoogleLogoIcon size={18} /> : null}
      <Text size={fontSize.bodySmall} leading={1} weight="500" tone="soft">
        {text}
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
