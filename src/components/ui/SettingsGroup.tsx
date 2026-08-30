import { Children, Fragment, isValidElement, memo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { Icon, IconTile, type IconTileTone, type LucideIcon } from '@/components/ui/Icon';
import { Divider } from '@/components/ui/Surface';
import { Label, Text } from '@/components/ui/Text';
import { RadioDot, Toggle } from '@/components/ui/Toggle';
import { radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/**
 * The grouped list that carries every settings screen, and the catalog and
 * security sections in admin. A group draws one rounded card and hairlines
 * between its children, so rows never have to know their own position.
 */
export const SettingsGroup = memo(function SettingsGroup({
  title,
  children,
  style,
}: {
  /** Optional mono eyebrow above the card. */
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <View style={[styles.group, style]}>
      {title ? <Label size={fontSize.labelSmall + 0.5} tracking={1.5}>{title}</Label> : null}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}>
        {rows.map((row, index) => (
          <Fragment key={row.key ?? index}>
            {index > 0 ? <Divider /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
});

export type SettingsRowProps = {
  title: string;
  subtitle?: string;
  /** Right-aligned current value — "Premium", "English", "6". */
  value?: string;
  icon?: LucideIcon;
  iconTone?: IconTileTone;
  /** Replaces the chevron with a switch. */
  toggle?: { value: boolean; onValueChange: (next: boolean) => void };
  /** Replaces the chevron with a radio tick. */
  selected?: boolean;
  /** Suppresses the chevron on rows that only display a fact. */
  chevron?: boolean;
  danger?: boolean;
  trailing?: ReactNode;
  onPress?: () => void;
  dense?: boolean;
};

export const SettingsRow = memo(function SettingsRow({
  title,
  subtitle,
  value,
  icon,
  iconTone = 'primary',
  toggle,
  selected,
  chevron,
  danger = false,
  trailing,
  onPress,
  dense = false,
}: SettingsRowProps) {
  const { colors } = useTheme();

  // A row shows a chevron when it navigates and has nothing else on the right.
  const showChevron =
    chevron ?? (!!onPress && !toggle && selected === undefined && !trailing);

  const content = (
    <>
      {icon ? <IconTile icon={icon} tileTone={danger ? 'danger' : iconTone} /> : null}
      <View style={styles.rowBody}>
        <Text
          size={dense ? fontSize.bodySmall : fontSize.body}
          leading={subtitle ? 1.2 : 1}
          tone={danger ? 'danger' : 'ink'}
          weight={danger ? '500' : '400'}>
          {title}
        </Text>
        {subtitle ? (
          <Text size={fontSize.captionSmall + 0.5} leading={1.4} tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text size={fontSize.caption + 0.5} leading={1} tone="muted">
          {value}
        </Text>
      ) : null}
      {toggle ? (
        <Toggle
          value={toggle.value}
          onValueChange={toggle.onValueChange}
          accessibilityLabel={title}
        />
      ) : null}
      {selected !== undefined ? <RadioDot selected={selected} /> : null}
      {trailing}
      {showChevron ? <Icon icon={ChevronRight} size={15} color={colors.dim} /> : null}
    </>
  );

  const rowStyle = [styles.row, dense && styles.rowDense];

  // Toggling from anywhere on the row is the expected behaviour; a row that
  // only holds a switch still needs the whole strip to be tappable.
  const handlePress = onPress ?? (toggle ? () => toggle.onValueChange(!toggle.value) : undefined);

  if (!handlePress) {
    return <View style={rowStyle}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole={toggle ? 'switch' : selected !== undefined ? 'radio' : 'button'}
      accessibilityState={
        toggle ? { checked: toggle.value } : selected !== undefined ? { selected } : undefined
      }
      onPress={handlePress}
      style={({ pressed }) => [
        ...rowStyle,
        pressed && { backgroundColor: colors.primaryFillSoft },
      ]}>
      {content}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  group: {
    gap: 9,
  },
  card: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 15,
    paddingVertical: 14,
    minHeight: 52,
  },
  rowDense: {
    paddingVertical: 13,
    minHeight: 48,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
});
