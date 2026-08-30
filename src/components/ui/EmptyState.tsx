import { memo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Button, TextButton } from '@/components/ui/Button';
import { Display, Text } from '@/components/ui/Text';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/**
 * Three dashed spines that hint at the shelf about to fill. Deliberately not an
 * illustration — empty states keep their own screen header and tab bar, so the
 * page still reads as the page you navigated to.
 */
export const DashedShelf = memo(function DashedShelf() {
  const { colors } = useTheme();
  const spine = { borderColor: colors.borderStrong, borderWidth: 1, borderStyle: 'dashed' as const };

  return (
    <View style={styles.shelf}>
      <View style={[styles.spine, styles.spineShort, spine, { transform: [{ rotate: '-6deg' }] }]} />
      <View style={[styles.spine, styles.spineTall, spine]} />
      <View style={[styles.spine, styles.spineShort, spine, { transform: [{ rotate: '6deg' }] }]} />
    </View>
  );
});

export type EmptyStateProps = {
  title: string;
  message: string;
  /** The one useful escape. Error states always offer exactly one. */
  action?: { label: string; onPress: () => void };
  secondaryAction?: { label: string; onPress: () => void };
  /** A quiet text link under the buttons. */
  link?: { label: string; onPress: () => void };
  /** Defaults to the dashed shelf; pass a cover or icon for other contexts. */
  art?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Empty and error states share one shape: art, a sentence about what happened,
 * a sentence confirming nothing was lost, then the way out. Never a stack trace.
 */
export const EmptyState = memo(function EmptyState({
  title,
  message,
  action,
  secondaryAction,
  link,
  art,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.root, style]}>
      {art === undefined ? <DashedShelf /> : art}

      <Display size={27} align="center">
        {title}
      </Display>
      <Text size={fontSize.bodySmall} leading={1.65} align="center" tone="muted">
        {message}
      </Text>

      {action || secondaryAction ? (
        <View style={styles.actions}>
          {action ? <Button label={action.label} onPress={action.onPress} size="md" /> : null}
          {secondaryAction ? (
            <Button
              label={secondaryAction.label}
              onPress={secondaryAction.onPress}
              variant="secondary"
              size="md"
            />
          ) : null}
        </View>
      ) : null}

      {link ? <TextButton label={link.label} onPress={link.onPress} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 22,
  },
  actions: {
    alignSelf: 'stretch',
    gap: 11,
  },
  shelf: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 9,
    opacity: 0.75,
    marginBottom: 2,
  },
  spine: {
    borderRadius: 6,
  },
  spineShort: {
    width: 44,
    height: 66,
  },
  spineTall: {
    width: 52,
    height: 82,
  },
});
