import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

import { useAuthLayoutMetrics } from '../hooks/useAuthLayoutMetrics';
import { GoogleLogoIcon } from './GoogleLogoIcon';

type GoogleSignInButtonProps = {
  onPress?: () => void;
  label?: string;
};

const GOOGLE_ICON_SIZE = 20;

export function GoogleSignInButton({
  onPress,
  label = 'Continue with Google',
}: GoogleSignInButtonProps) {
  const { isDark, colors } = useTheme();
  const layout = useAuthLayoutMetrics(false);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        {
          height: layout.buttonHeight,
          borderRadius: layout.radius,
          opacity: pressed ? 0.88 : 1,
          backgroundColor: isDark
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,255,255,0.92)',
          borderColor: isDark
            ? 'rgba(240,246,236,0.12)'
            : 'rgba(20,40,24,0.10)',
        },
      ]}>
      <GoogleLogoIcon size={GOOGLE_ICON_SIZE} />
      <Text
        className="font-semibold text-app-ink dark:text-app-ink-dark"
        style={{ fontSize: 16, color: colors.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
