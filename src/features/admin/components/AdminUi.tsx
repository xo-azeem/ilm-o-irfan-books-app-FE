import { Children, Fragment, isValidElement, memo, type PropsWithChildren, type ReactNode } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react-native';

import {
  Badge as UiBadge,
  Button,
  Card,
  Chip as UiChip,
  Display,
  Divider,
  Icon,
  Label,
  ProgressBar,
  Text,
  TextButton,
  TextField,
  Toggle,
} from '@/components/ui';
import { radius } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/**
 * The admin design system.
 *
 * Admin is a tool, not a showpiece: denser type, monospace labels, amber for
 * problems, and no gold anywhere — gold belongs to membership. Everything here
 * delegates to the shared primitives, so admin can never drift from the app.
 */

/** Amber is the admin panel's "needs attention" colour, replacing red for warnings. */
export const WARNING = '#D99A2B';
export const DANGER = '#E86A6A';

// ------------------------------------------------------------------ chrome

export const AdminBackLink = memo(function AdminBackLink({
  label = 'Back',
}: {
  label?: string;
}) {
  const navigation = useNavigation();
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => navigation.goBack()}
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}>
      <Icon icon={ChevronLeft} size={15} color={colors.primarySoft} strokeWidth={2.2} />
      <Text size={12.5} leading={1} weight="500" tone="primary">
        {label}
      </Text>
    </Pressable>
  );
});

/** A grouped card with an optional mono heading and a trailing action. */
export const AdminCard = memo(function AdminCard({
  title,
  action,
  children,
  padded = true,
}: PropsWithChildren<{ title?: string; action?: ReactNode; padded?: boolean }>) {
  return (
    <View style={styles.cardGroup}>
      {title || action ? (
        <View style={styles.cardHeader}>
          {title ? <Label size={fontSize.labelSmall} tracking={1.6}>{title}</Label> : <View />}
          {action}
        </View>
      ) : null}
      <Card tone="surface" rounded={radius.button} padded={padded ? 15 : 0} gap={padded ? 12 : 0}>
        {children}
      </Card>
    </View>
  );
});

/** A list card that draws its own hairlines between rows. */
export const AdminRowGroup = memo(function AdminRowGroup({
  title,
  action,
  children,
}: PropsWithChildren<{ title?: string; action?: ReactNode }>) {
  const { colors } = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <View style={styles.cardGroup}>
      {title || action ? (
        <View style={styles.cardHeader}>
          {title ? <Label size={fontSize.labelSmall} tracking={1.6}>{title}</Label> : <View />}
          {action}
        </View>
      ) : null}
      <View
        style={[
          styles.rowGroup,
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

export const AdminTextAction = memo(function AdminTextAction({
  label,
  onPress,
  destructive,
  disabled,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <TextButton
      label={label}
      onPress={onPress}
      disabled={disabled}
      tone={destructive ? 'danger' : disabled ? 'muted' : 'primary'}
      size={fontSize.captionSmall}
    />
  );
});

// ------------------------------------------------------------------- inputs

export const AdminField = memo(function AdminField({
  label,
  value,
  onChangeText,
  placeholder,
  helper,
  error,
  keyboardType,
  multiline,
  autoCapitalize = 'sentences',
  suffix,
  editable = true,
  maxLength,
  mono,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  helper?: string;
  error?: string | null;
  keyboardType?: React.ComponentProps<typeof TextField>['keyboardType'];
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  suffix?: string;
  editable?: boolean;
  maxLength?: number;
  /** Slugs and identifiers read better in the mono face. */
  mono?: boolean;
}) {
  return (
    <TextField
      label={label}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder ?? label}
      hint={
        helper ?? (maxLength ? `${value.length} / ${maxLength}` : undefined)
      }
      error={error ?? undefined}
      keyboardType={keyboardType}
      multiline={multiline}
      height={multiline ? 88 : 46}
      autoCapitalize={autoCapitalize}
      editable={editable}
      maxLength={maxLength}
      mono={mono}
      trailing={
        suffix ? (
          <Text size={fontSize.caption} leading={1} tone="faint">
            {suffix}
          </Text>
        ) : undefined
      }
    />
  );
});

export const AdminLabel = memo(function AdminLabel({ children }: PropsWithChildren) {
  return <Label size={fontSize.labelSmall} tracking={1.6}>{children as string}</Label>;
});

export const AdminHelper = memo(function AdminHelper({ children }: PropsWithChildren) {
  return (
    <Text size={11.5} leading={1.45} tone="faint">
      {children}
    </Text>
  );
});

// ------------------------------------------------------------------ buttons

export const AdminButton = memo(function AdminButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  Icon: Glyph,
  compact,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'destructive';
  Icon?: LucideIcon;
  compact?: boolean;
}) {
  return (
    <Button
      label={label}
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      icon={Glyph}
      size={compact ? 'sm' : 'md'}
      variant={
        variant === 'destructive' ? 'dangerSolid' : variant === 'secondary' ? 'secondary' : 'primary'
      }
    />
  );
});

export const AdminChip = memo(function AdminChip({
  label,
  selected,
  onPress,
  compact,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Kept for call-site compatibility; the accent now comes from the palette. */
  accent?: string | null;
  compact?: boolean;
}) {
  return <UiChip label={label} selected={selected} onPress={onPress} size={compact ? 'sm' : 'md'} />;
});

// ------------------------------------------------------------------- status

export type BadgeTone = 'success' | 'neutral' | 'warning' | 'danger' | 'accent';

const BADGE_TONE = {
  success: 'primary',
  neutral: 'neutral',
  warning: 'warning',
  danger: 'danger',
  accent: 'lime',
} as const;

export const AdminBadge = memo(function AdminBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: BadgeTone;
}) {
  return <UiBadge label={label.toUpperCase()} tone={BADGE_TONE[tone]} />;
});

export const AdminToggleRow = memo(function AdminToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleBody}>
        <Text size={fontSize.bodySmall} leading={1.2}>
          {label}
        </Text>
        {description ? (
          <Text size={12} leading={1.4} tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
      <Toggle
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        size="sm"
        accessibilityLabel={label}
      />
    </View>
  );
});

/** A tappable row that opens a picker or a sub-screen. */
export const AdminNavRow = memo(function AdminNavRow({
  label,
  value,
  onPress,
  Icon: Glyph,
  tone,
  leading,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  Icon?: LucideIcon;
  tone?: 'default' | 'danger';
  /** Custom leading element, e.g. a drag handle or a cover thumbnail. */
  leading?: ReactNode;
  /** No longer needed — AdminRowGroup draws the dividers. */
  isLast?: boolean;
}) {
  const { colors } = useTheme();
  const danger = tone === 'danger';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.navRow,
        pressed && { backgroundColor: colors.primaryFillSoft },
      ]}>
      {leading ??
        (Glyph ? (
          <Icon icon={Glyph} size={15} tone={danger ? 'danger' : 'primary'} strokeWidth={1.9} />
        ) : null)}
      <Text
        size={14.5}
        leading={1.2}
        tone={danger ? 'danger' : 'ink'}
        numberOfLines={1}
        style={styles.grow}>
        {label}
      </Text>
      {value ? (
        <Text size={fontSize.caption} leading={1} tone="muted" numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      <Icon icon={ChevronRight} size={14} color={colors.dim} />
    </Pressable>
  );
});

export const AdminEmpty = memo(function AdminEmpty({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card tone="surface" rounded={radius.button} padded={24} gap={10} style={styles.empty}>
      <Display size={19} align="center">
        {title}
      </Display>
      <Text size={fontSize.bodySmall} leading={1.5} align="center" tone="muted">
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} size="sm" fullWidth={false} style={styles.emptyAction} />
      ) : null}
    </Card>
  );
});

export const AdminErrorState = memo(function AdminErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Pressable
      onPress={onRetry}
      accessibilityRole="button"
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
      <Card tone="surface" rounded={radius.button} padded={18} gap={5}>
        <Text size={fontSize.body} leading={1.2} weight="600">
          Could not load
        </Text>
        <Text size={fontSize.caption} leading={1.45} tone="muted">
          {message} Tap to retry.
        </Text>
      </Card>
    </Pressable>
  );
});

/**
 * A metric tile. Admin numerals are bold sans rather than the reader app's
 * serif — this is a dashboard, and the numbers are meant to be scanned.
 */
export const AdminStat = memo(function AdminStat({
  label,
  value,
  hint,
  tone,
  onPress,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: BadgeTone;
  onPress?: () => void;
}) {
  const { colors } = useTheme();

  const valueColor =
    tone === 'success'
      ? colors.primarySoft
      : tone === 'accent'
      ? colors.lime
      : tone === 'warning'
      ? colors.warning
      : tone === 'danger'
      ? colors.danger
      : colors.ink;

  const body = (
    <>
      <Text size={21} leading={1} weight="700" tone="inherit" style={{ color: valueColor }}>
        {String(value)}
      </Text>
      <Text size={10.5} leading={1.2} tone="muted" numberOfLines={2}>
        {label}
      </Text>
      {hint ? (
        <Text size={10} leading={1.2} tone="faint" numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.stat, pressed && styles.pressed]}>
        <Card tone="surface" rounded={14} padded={13} gap={5}>
          {body}
        </Card>
      </Pressable>
    );
  }

  return (
    <Card tone="surface" rounded={14} padded={13} gap={5} style={styles.stat}>
      {body}
    </Card>
  );
});

/** A row of stat tiles that share the available width evenly. */
export const AdminStatRow = memo(function AdminStatRow({ children }: PropsWithChildren) {
  return <View style={styles.statRow}>{children}</View>;
});

/** Sticky action bar pinned above the tab capsule on editor screens. */
export const AdminActionBar = memo(function AdminActionBar({ children }: PropsWithChildren) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.actionBar,
        { borderTopColor: colors.chromeBorder, backgroundColor: colors.chrome },
      ]}>
      {children}
    </View>
  );
});

/** An upload's progress, shown inline on the card that owns the file. */
export const AdminUploadProgress = memo(function AdminUploadProgress({
  fileName,
  percent,
  detail,
}: {
  fileName: string;
  percent: number;
  detail?: string;
}) {
  return (
    <View style={styles.upload}>
      <View style={styles.uploadHeader}>
        <Label uppercase={false} tone="muted" tracking={0}>
          {fileName}
        </Label>
        <Label tone="warning" tracking={0.6}>{`${Math.round(percent)}%`}</Label>
      </View>
      <ProgressBar value={percent / 100} height={6} tone="warning" />
      {detail ? (
        <Text size={11.5} leading={1.2} tone="faint">
          {detail}
        </Text>
      ) : null}
    </View>
  );
});

export const AdminDivider = Divider;

/** Pull-to-refresh props for `Screen`, which forwards them to its ScrollView. */
export function useAdminRefresh(refreshing: boolean, onRefresh: () => void) {
  const { colors } = useTheme();
  return {
    refreshControl: (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={colors.primary}
        colors={[colors.primary]}
        progressBackgroundColor={colors.surface}
      />
    ),
  };
}

const styles = StyleSheet.create({
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
  },
  cardGroup: {
    gap: 9,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowGroup: {
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    minHeight: 50,
  },
  grow: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  toggleBody: {
    flex: 1,
    gap: 4,
  },
  empty: {
    alignItems: 'center',
  },
  emptyAction: {
    marginTop: 6,
  },
  stat: {
    flex: 1,
  },
  statRow: {
    flexDirection: 'row',
    gap: 9,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  upload: {
    gap: 9,
  },
  uploadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pressed: {
    opacity: 0.75,
  },
});
