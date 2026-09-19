import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useStrings } from '@/i18n';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/** The "or" rule between the primary action and the alternative sign-in routes. */
export const AuthDivider = memo(function AuthDivider({
  label,
}: {
  label?: string;
}) {
  const { colors } = useTheme();
  const s = useStrings();

  return (
    <View style={styles.root}>
      <View style={[styles.rule, { backgroundColor: colors.border }]} />
      <Text size={fontSize.captionSmall} leading={1} tone="faint">
        {label ?? s.auth.orDivider}
      </Text>
      <View style={[styles.rule, { backgroundColor: colors.border }]} />
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth * 2,
  },
});
