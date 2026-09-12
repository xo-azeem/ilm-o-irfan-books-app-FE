import {
  Children,
  Fragment,
  isValidElement,
  memo,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  type LucideIcon,
} from 'lucide-react-native';

import {
  Display,
  Divider,
  Icon,
  Label,
  Text,
  TextField,
  Toggle,
} from '@/components/ui';
import { radius } from '@/theme/palette';
import { useTheme, type AppColors } from '@/theme/ThemeContext';

/**
 * The admin design system.
 *
 * Admin is a tool, not a showpiece: Newsreader for the one heading a screen
 * gets, DM Sans for everything you read, monospace for eyebrows and figures,
 * amber for problems, and no gold anywhere — gold belongs to membership.
 *
 * Every measurement here is taken from the portal board, so a screen composes
 * these pieces and never restates a radius, a height or a colour of its own.
 */

/** Amber is the admin panel's "needs attention" colour, replacing red. */
export const WARNING = '#D99A2B';
export const DANGER = '#E86A6A';

/** The gutter every admin screen runs at, header and list alike. */
export const ADMIN_GUTTER = 18;

// ------------------------------------------------------------------ chrome

/**
 * The back affordance on every pushed screen. It names where it returns to
 * rather than saying "Back", so a deep screen always states its own lineage.
 */
export const AdminBackLink = memo(function AdminBackLink({
  label = 'Back',
  action,
}: {
  label?: string;
  /** Right-aligned companion — a state badge, a count. */
  action?: ReactNode;
}) {
  const navigation = useNavigation();
  const { colors } = useTheme();

  return (
    <View style={styles.backBar}>
      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel={`Back to ${label}`}
        hitSlop={10}
        style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}
      >
        <Icon
          icon={ChevronLeft}
          size={15}
          color={colors.actionIcon}
          strokeWidth={2.2}
        />
        <Text size={12.5} leading={1} weight="500" tone="action">
          {label}
        </Text>
      </Pressable>
      {action}
    </View>
  );
});

/**
 * A tab root's title: the serif name, a sentence of context, and at most one
 * action. The subtitle is always a plain sentence — "64 books · 3 need
 * attention" rather than a bare count.
 */
export const AdminPageTitle = memo(function AdminPageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.pageTitle}>
      <View style={styles.pageTitleBody}>
        <Display size="screenDense" weight="500" numberOfLines={1}>
          {title}
        </Display>
        {subtitle ? (
          <Text size={12.5} leading={1.3} tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
});

/** A pushed screen's title — one step down from a tab root's. */
export const AdminScreenTitle = memo(function AdminScreenTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.screenTitle}>
      <Display
        size={24}
        weight="500"
        leading={1.15}
        tracking={-0.4}
        numberOfLines={2}
      >
        {title}
      </Display>
      {subtitle ? (
        <Text size={12.5} leading={1.3} tone="muted">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
});

/** The green pill that creates whatever the current screen lists. */
export const AdminNewButton = memo(function AdminNewButton({
  label = 'New',
  onPress,
}: {
  label?: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.newButton,
        { backgroundColor: colors.primary },
        pressed && styles.pressed,
      ]}
    >
      <Icon icon={Plus} size={14} color={colors.onPrimary} strokeWidth={2.4} />
      <Text size={13} leading={1} weight="500" tone="onPrimary">
        {label}
      </Text>
    </Pressable>
  );
});

export type AdminSegment<T extends string> = { value: T; label: string };

/**
 * The tab-level segmented control. Unlike the shared `SegmentedControl` this
 * one sits directly under a screen title and carries whole destinations, so it
 * runs taller and its selected pill is a raised panel rather than a tint.
 */
function AdminSegmentsInner<T extends string>({
  options,
  value,
  onChange,
  compact = false,
}: {
  options: ReadonlyArray<AdminSegment<T>>;
  value: T;
  onChange: (next: T) => void;
  /** The 30px variant used inside a pushed screen, e.g. an analytics range. */
  compact?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.segments,
        { backgroundColor: colors.control, borderRadius: compact ? 13 : 14 },
      ]}
    >
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              compact ? styles.segmentCompact : null,
              selected && { backgroundColor: colors.controlActive },
              pressed && !selected && styles.pressed,
            ]}
          >
            <Text
              size={compact ? 12 : 12.5}
              leading={1}
              weight={selected ? '500' : '400'}
              tone={selected ? 'ink' : 'muted'}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const AdminSegments = memo(
  AdminSegmentsInner,
) as typeof AdminSegmentsInner;

export type AdminEyebrowTone = 'faint' | 'muted' | 'warning' | 'dim' | 'action';

/** The wide-tracked monospace line that heads a block. */
export const AdminEyebrow = memo(function AdminEyebrow({
  children,
  tone = 'faint',
}: PropsWithChildren<{ tone?: AdminEyebrowTone }>) {
  return (
    <Label size={10} leading={1} weight="700" tracking={1.6} tone={tone}>
      {children as string}
    </Label>
  );
});

/** An eyebrow with a text action opposite it. */
export const AdminSectionHeader = memo(function AdminSectionHeader({
  title,
  tone,
  action,
}: {
  title: string;
  tone?: AdminEyebrowTone;
  action?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <AdminEyebrow tone={tone}>{title}</AdminEyebrow>
      {action}
    </View>
  );
});

/** A word that acts. Never a button — buttons are for the primary path. */
export const AdminTextAction = memo(function AdminTextAction({
  label,
  onPress,
  destructive,
  disabled,
  tone,
  size = 12,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Overrides the default green — amber inside an attention panel. */
  tone?: 'action' | 'warning' | 'danger' | 'muted';
  size?: number;
}) {
  const resolved = disabled
    ? 'dim'
    : destructive
      ? 'danger'
      : (tone ?? 'action');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      <Text size={size} leading={1} weight="500" tone={resolved}>
        {label}
      </Text>
    </Pressable>
  );
});

// ------------------------------------------------------------------- status

export type AdminTagTone =
  'neutral' | 'success' | 'warning' | 'danger' | 'premium';

/** Kept as the historic name for the same five tones. */
export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

function tagPalette(tone: AdminTagTone, colors: AppColors) {
  switch (tone) {
    case 'success':
      return { fill: colors.primaryFill, ink: colors.actionInk };
    case 'warning':
      return { fill: colors.warningTint, ink: colors.warning };
    case 'danger':
      return { fill: colors.dangerFill, ink: colors.danger };
    case 'premium':
      return { fill: colors.limeFill, ink: colors.lime };
    case 'neutral':
      return { fill: colors.border, ink: colors.muted };
  }
}

/**
 * The monospace pill that states a fact — LIVE, DRAFT, NO PDF, PREMIUM. Always
 * a statement; a tag is never tappable.
 */
export const AdminTag = memo(function AdminTag({
  label,
  tone = 'neutral',
  small = false,
}: {
  label: string;
  tone?: AdminTagTone;
  /** The 8.5px variant that sits inline with a name on a list row. */
  small?: boolean;
}) {
  const { colors } = useTheme();
  const tag = tagPalette(tone, colors);

  return (
    <View
      style={[
        small ? styles.tagSmall : styles.tag,
        { backgroundColor: tag.fill },
      ]}
    >
      <Label
        size={small ? 8.5 : 9}
        leading={1}
        weight="700"
        tracking={0.8}
        tone="inherit"
        style={{ color: tag.ink }}
      >
        {label}
      </Label>
    </View>
  );
});

const LEGACY_TAG_TONE: Record<BadgeTone, AdminTagTone> = {
  neutral: 'neutral',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  accent: 'premium',
};

/** The historic name, mapped onto `AdminTag`. */
export const AdminBadge = memo(function AdminBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: BadgeTone;
}) {
  return <AdminTag label={label.toUpperCase()} tone={LEGACY_TAG_TONE[tone]} />;
});

/** A round initials chip. Amber marks a person or record that needs a look. */
export const AdminAvatar = memo(function AdminAvatar({
  name,
  imageUrl,
  size = 38,
  tone = 'primary',
}: {
  name?: string | null;
  imageUrl?: string | null;
  size?: number;
  tone?: 'primary' | 'warning' | 'neutral';
}) {
  const { colors } = useTheme();

  const fill =
    tone === 'warning'
      ? colors.warningTint
      : tone === 'neutral'
        ? colors.borderSoft
        : colors.primaryFill;
  const ink =
    tone === 'warning'
      ? colors.warning
      : tone === 'neutral'
        ? colors.muted
        : colors.actionInk;

  const initials = (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: fill,
        },
      ]}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.avatarImage} />
      ) : (
        <Display
          size={Math.round(size * 0.34)}
          weight="500"
          tone="inherit"
          style={{ color: ink }}
        >
          {initials || '·'}
        </Display>
      )}
    </View>
  );
});

// -------------------------------------------------------------- containers

/** A grouped card with an optional eyebrow and a trailing action. */
export const AdminCard = memo(function AdminCard({
  title,
  action,
  children,
  padded = true,
  tone = 'surface',
}: PropsWithChildren<{
  title?: string;
  action?: ReactNode;
  padded?: boolean;
  /** `alt` recesses the card — a preview of what a reader will see. */
  tone?: 'surface' | 'alt';
}>) {
  const { colors } = useTheme();

  return (
    <View style={styles.block}>
      {title || action ? (
        <AdminSectionHeader title={title ?? ''} action={action} />
      ) : null}
      <View
        style={[
          styles.card,
          {
            backgroundColor:
              tone === 'alt' ? colors.surfaceAlt : colors.surface,
            borderColor: colors.border,
            padding: padded ? 15 : 0,
            gap: padded ? 12 : 0,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
});

/**
 * A list card that draws its own hairlines. Rows come in as children so a
 * screen never has to know where the dividers go.
 */
export const AdminRowGroup = memo(function AdminRowGroup({
  title,
  action,
  tone,
  children,
}: PropsWithChildren<{
  title?: string;
  action?: ReactNode;
  tone?: AdminEyebrowTone;
}>) {
  const { colors } = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <View style={styles.block}>
      {title || action ? (
        <AdminSectionHeader title={title ?? ''} tone={tone} action={action} />
      ) : null}
      <View
        style={[
          styles.rowGroup,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
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

/**
 * The amber panel that says what needs a person. Its rows are the only place
 * in admin where amber is tappable, so "something is wrong" and "here is the
 * fix" are never two separate glances.
 */
export const AdminAttentionGroup = memo(function AdminAttentionGroup({
  title,
  children,
}: PropsWithChildren<{ title?: string }>) {
  const { colors } = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);

  if (rows.length === 0) {
    return null;
  }

  return (
    <View style={styles.block}>
      {title ? <AdminEyebrow tone="warning">{title}</AdminEyebrow> : null}
      <View
        style={[
          styles.rowGroup,
          {
            backgroundColor: colors.warningFill,
            borderColor: colors.warningBorder,
          },
        ]}
      >
        {rows.map((row, index) => (
          <Fragment key={row.key ?? index}>
            {index > 0 ? (
              <View
                style={[
                  styles.hairline,
                  { backgroundColor: colors.warningDivider },
                ]}
              />
            ) : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
});

/** One line of the attention panel: what is wrong, the detail, the way out. */
export const AdminAttentionRow = memo(function AdminAttentionRow({
  icon,
  title,
  detail,
  actionLabel,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  actionLabel: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${actionLabel}`}
      onPress={onPress}
      style={({ pressed }) => [styles.attentionRow, pressed && styles.pressed]}
    >
      <View
        style={[styles.attentionTile, { backgroundColor: colors.warningTint }]}
      >
        <Icon icon={icon} size={15} tone="warning" strokeWidth={2} />
      </View>
      <View style={styles.grow}>
        <Text size={13.5} leading={1.3} weight="500" numberOfLines={2}>
          {title}
        </Text>
        <Text
          size={11.5}
          leading={1.3}
          tone="inherit"
          style={{ color: colors.warningInk }}
        >
          {detail}
        </Text>
      </View>
      <Text size={12} leading={1} weight="500" tone="warning">
        {actionLabel}
      </Text>
    </Pressable>
  );
});

// -------------------------------------------------------------------- rows

/** A tappable row that opens a picker or a sub-screen. */
export const AdminNavRow = memo(function AdminNavRow({
  label,
  sublabel,
  value,
  onPress,
  Icon: Glyph,
  tone,
  leading,
  trailing,
  warn = false,
}: {
  label: string;
  /** A second line under the label, stating this destination's own state. */
  sublabel?: string;
  value?: string;
  onPress: () => void;
  Icon?: LucideIcon;
  tone?: 'default' | 'danger';
  /** Custom leading element, e.g. a drag handle or a cover thumbnail. */
  leading?: ReactNode;
  /** Replaces the chevron — a switch, a tag, a word. */
  trailing?: ReactNode;
  /** Draws the sublabel in amber, so a menu states its own problems. */
  warn?: boolean;
  /** No longer needed — AdminRowGroup draws the dividers. */
  isLast?: boolean;
}) {
  const { colors } = useTheme();
  const danger = tone === 'danger';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.navRow,
        pressed && { backgroundColor: colors.primaryFillSoft },
      ]}
    >
      {leading ??
        (Glyph ? (
          <Icon
            icon={Glyph}
            size={17}
            tone={danger ? 'danger' : 'action'}
            strokeWidth={1.9}
          />
        ) : null)}

      <View style={styles.grow}>
        <Text
          size={14.5}
          leading={1.2}
          tone={danger ? 'danger' : 'ink'}
          numberOfLines={1}
        >
          {label}
        </Text>
        {sublabel ? (
          <Text
            size={11}
            leading={1.2}
            tone={warn ? 'warning' : 'faint'}
            numberOfLines={1}
            style={styles.sublabel}
          >
            {sublabel}
          </Text>
        ) : null}
      </View>

      {value ? (
        <Text size={12.5} leading={1} tone="muted" numberOfLines={1}>
          {value}
        </Text>
      ) : null}

      {trailing ?? (
        <Icon
          icon={ChevronRight}
          size={15}
          color={colors.dim}
          strokeWidth={2}
        />
      )}
    </Pressable>
  );
});

/** A label / value pair inside a card. */
export const AdminDetailRow = memo(function AdminDetailRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'ink' | 'premium' | 'warning';
}) {
  return (
    <View style={styles.detailRow}>
      <Text size={13} leading={1} tone="muted">
        {label}
      </Text>
      <Text
        size={13}
        leading={1}
        weight="500"
        tone={
          tone === 'premium' ? 'lime' : tone === 'warning' ? 'warning' : 'ink'
        }
        numberOfLines={1}
        style={styles.detailValue}
      >
        {value}
      </Text>
    </View>
  );
});

/** A boolean, with the sentence that says what it does to readers. */
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
  const { colors } = useTheme();

  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleBody}>
        <Text size={14} leading={1.2}>
          {label}
        </Text>
        {description ? (
          <Text size={11.5} leading={1.4} tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
      <Toggle
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        size="admin"
        trackOff={colors.controlActive}
        accessibilityLabel={label}
      />
    </View>
  );
});

// ------------------------------------------------------------------ inputs

/** The monospace label that heads a field. */
export const AdminLabel = memo(function AdminLabel({
  children,
  tone = 'muted',
}: PropsWithChildren<{ tone?: AdminEyebrowTone }>) {
  return <AdminEyebrow tone={tone}>{children as string}</AdminEyebrow>;
});

export const AdminHelper = memo(function AdminHelper({
  children,
  tone = 'faint',
}: PropsWithChildren<{ tone?: 'faint' | 'action' | 'warning' | 'danger' }>) {
  return (
    <Text size={11.5} leading={1.4} tone={tone}>
      {children}
    </Text>
  );
});

/**
 * A form field. The label sits outside the box as its own mono eyebrow, and a
 * counter — when the field is capped — sits opposite it, so a long description
 * never has to guess how much room is left.
 */
export const AdminField = memo(function AdminField({
  label,
  value,
  onChangeText,
  placeholder,
  helper,
  helperTone,
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
  helperTone?: 'faint' | 'action' | 'warning';
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
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <AdminLabel>{label}</AdminLabel>
        {maxLength ? (
          <Label
            size={10.5}
            leading={1}
            weight="400"
            tracking={0}
            tone="dim"
            uppercase={false}
          >
            {`${value.length} / ${maxLength}`}
          </Label>
        ) : null}
      </View>

      <TextField
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        keyboardType={keyboardType}
        multiline={multiline}
        height={multiline ? 78 : 46}
        autoCapitalize={autoCapitalize}
        editable={editable}
        maxLength={maxLength}
        mono={mono}
        trailing={
          suffix ? (
            <Text size={12} leading={1} tone="faint">
              {suffix}
            </Text>
          ) : undefined
        }
      />

      {error ? (
        <AdminHelper tone="danger">{error}</AdminHelper>
      ) : helper ? (
        <AdminHelper tone={helperTone}>{helper}</AdminHelper>
      ) : null}
    </View>
  );
});

/**
 * A field-shaped row that opens a picker. It looks exactly like `AdminField`
 * and says what tapping it does, so a choice never hides behind a chevron.
 */
export const AdminPickerField = memo(function AdminPickerField({
  label,
  value,
  placeholder = 'Choose',
  actionLabel = 'Change',
  onPress,
  helper,
  helperTone,
  error,
  mono = false,
  verified = false,
}: {
  label: string;
  value?: string | null;
  placeholder?: string;
  actionLabel?: string;
  onPress: () => void;
  helper?: string;
  helperTone?: 'faint' | 'action' | 'warning';
  error?: string | null;
  mono?: boolean;
  /** Swaps the action word for a tick — a slug that is free, an id that maps. */
  verified?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.field}>
      <AdminLabel>{label}</AdminLabel>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ?? placeholder}`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.pickerField,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: error
              ? colors.dangerBorder
              : verified
                ? colors.selectedBorder
                : colors.border,
          },
          pressed && styles.pressed,
        ]}
      >
        {mono ? (
          <Label
            size={13}
            leading={1}
            weight="400"
            tracking={0}
            uppercase={false}
            tone={value ? 'soft' : 'faint'}
            numberOfLines={1}
            style={styles.grow}
          >
            {value || placeholder}
          </Label>
        ) : (
          <Text
            size={14.5}
            leading={1}
            tone={value ? 'ink' : 'faint'}
            numberOfLines={1}
            style={styles.grow}
          >
            {value || placeholder}
          </Text>
        )}

        {verified ? (
          <Icon icon={Check} size={14} tone="action" strokeWidth={2.4} />
        ) : (
          <Text size={12.5} leading={1} weight="500" tone="action">
            {actionLabel}
          </Text>
        )}
      </Pressable>

      {error ? (
        <AdminHelper tone="danger">{error}</AdminHelper>
      ) : helper ? (
        <AdminHelper tone={helperTone}>{helper}</AdminHelper>
      ) : null}
    </View>
  );
});

// ----------------------------------------------------------------- buttons

/**
 * The primary action. A blocked action keeps its place in the bar and states
 * the reason instead of vanishing, so the path to publishing is always visible.
 */
export const AdminButton = memo(function AdminButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  Icon: Glyph,
  compact,
  blockedReason,
  fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'ghostDanger';
  Icon?: LucideIcon;
  compact?: boolean;
  /** Renders the button dashed and inert, with this line under the label. */
  blockedReason?: string | null;
  fullWidth?: boolean;
}) {
  const { colors } = useTheme();
  const blocked = Boolean(blockedReason);
  const inert = disabled || loading || blocked;
  const outlined = variant === 'ghost' || variant === 'ghostDanger';

  const fill =
    blocked || (disabled && variant === 'primary')
      ? colors.control
      : variant === 'primary'
        ? colors.primary
        : variant === 'destructive'
          ? colors.danger
          : outlined
            ? 'transparent'
            : colors.controlActive;

  const ink =
    blocked || (disabled && variant === 'primary')
      ? 'dim'
      : variant === 'primary' || variant === 'destructive'
        ? 'onPrimary'
        : variant === 'ghostDanger'
          ? 'danger'
          : variant === 'ghost'
            ? 'action'
            : 'soft';

  const rim = blocked
    ? colors.borderStrong
    : variant === 'ghostDanger'
      ? colors.dangerBorder
      : colors.selectedBorder;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={blockedReason ? `${label} — ${blockedReason}` : label}
      accessibilityState={{ disabled: inert }}
      disabled={inert}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact ? styles.buttonCompact : null,
        {
          backgroundColor: fill,
          borderWidth: blocked || outlined ? StyleSheet.hairlineWidth * 2 : 0,
          borderColor: rim,
          borderStyle: blocked ? 'dashed' : 'solid',
          opacity: disabled && !blocked ? 0.55 : 1,
        },
        fullWidth ? null : styles.buttonAuto,
        pressed && !inert && styles.pressed,
      ]}
    >
      {Glyph ? (
        <Icon
          icon={Glyph}
          size={15}
          color={
            ink === 'onPrimary'
              ? colors.onPrimary
              : ink === 'danger'
                ? colors.danger
                : ink === 'action'
                  ? colors.actionIcon
                  : colors.inkSoft
          }
          strokeWidth={2}
        />
      ) : null}
      <View style={styles.buttonLabel}>
        <Text size={compact ? 13 : 14.5} leading={1} weight="500" tone={ink}>
          {loading ? 'Saving…' : label}
        </Text>
        {blockedReason ? (
          <Text size={9.5} leading={1.2} tone="dim">
            {blockedReason}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

/** A selectable word — a currency, an icon key, a filter value. */
export const AdminChip = memo(function AdminChip({
  label,
  selected,
  onPress,
  count,
  compact = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Appended in the same pill: "Live 51". */
  count?: number;
  /** Kept for call-site compatibility; the accent comes from the palette. */
  accent?: string | null;
  compact?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        compact ? styles.chipCompact : styles.chip,
        {
          backgroundColor: selected ? colors.primaryFill : colors.control,
          borderWidth: selected ? StyleSheet.hairlineWidth * 2 : 0,
          borderColor: colors.selectedBorder,
        },
        pressed && styles.pressed,
      ]}
    >
      <Text
        size={compact ? 12 : 12.5}
        leading={1}
        weight={selected ? '500' : '400'}
        tone={selected ? 'action' : 'soft'}
      >
        {count === undefined ? label : `${label} ${count}`}
      </Text>
    </Pressable>
  );
});

// ------------------------------------------------------------------ metrics

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
      ? colors.actionInk
      : tone === 'accent'
        ? colors.lime
        : tone === 'warning'
          ? colors.warning
          : tone === 'danger'
            ? colors.danger
            : colors.ink;

  const body = (
    <>
      <Text
        size={21}
        leading={1}
        weight="700"
        tone="inherit"
        style={{ color: valueColor }}
      >
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

  const surface = [
    styles.stat,
    { backgroundColor: colors.surface, borderColor: colors.borderSoft },
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        onPress={onPress}
        style={({ pressed }) => [...surface, pressed && styles.pressed]}
      >
        {body}
      </Pressable>
    );
  }

  return <View style={surface}>{body}</View>;
});

/** A row of stat tiles that share the available width evenly. */
export const AdminStatRow = memo(function AdminStatRow({
  children,
}: PropsWithChildren) {
  return <View style={styles.statRow}>{children}</View>;
});

/** A hairline progress line — a checklist's completion, a reader's place. */
export const AdminMeter = memo(function AdminMeter({
  value,
  tone = 'primary',
  height = 5,
}: {
  /** 0–1. */
  value: number;
  tone?: 'primary' | 'warning';
  height?: number;
}) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

  return (
    <View
      style={[
        styles.meter,
        { height, borderRadius: height / 2, backgroundColor: colors.border },
      ]}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          backgroundColor:
            tone === 'warning' ? colors.warning : colors.primaryBright,
        }}
      />
    </View>
  );
});

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  /** An unmet-but-optional item reads grey rather than amber. */
  optional?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * The publish checklist.
 *
 * The book editor's blockers used to live behind three sub-tabs, so a missing
 * PDF only surfaced when saving failed. Here every requirement is on screen
 * from the first keystroke, each with the tap that satisfies it.
 */
export const AdminChecklist = memo(function AdminChecklist({
  title,
  items,
}: {
  title: string;
  items: ChecklistItem[];
}) {
  const { colors } = useTheme();
  const required = items.filter(item => !item.optional);
  const done = required.filter(item => item.done).length;
  const complete = done === required.length;

  return (
    <View
      style={[
        styles.checklist,
        {
          backgroundColor: colors.surface,
          borderColor: complete ? colors.selectedBorder : colors.warningBorder,
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <AdminEyebrow tone={complete ? 'action' : 'warning'}>
          {title}
        </AdminEyebrow>
        <Label size={10} leading={1} weight="700" tracking={0} tone="muted">
          {`${done} / ${required.length}`}
        </Label>
      </View>

      <AdminMeter
        value={required.length === 0 ? 1 : done / required.length}
        tone={complete ? 'primary' : 'warning'}
      />

      <View style={styles.checklistItems}>
        {items.map(item => (
          <View key={item.id} style={styles.checklistRow}>
            {item.done ? (
              <Icon icon={Check} size={14} tone="action" strokeWidth={2.6} />
            ) : (
              <View
                style={[
                  styles.checklistDot,
                  {
                    borderColor: item.optional ? colors.faint : colors.warning,
                  },
                ]}
              />
            )}

            <Text
              size={12.5}
              leading={1.2}
              weight={item.done || item.optional ? '400' : '500'}
              tone={item.done ? 'muted' : item.optional ? 'soft' : 'ink'}
              numberOfLines={1}
              style={styles.grow}
            >
              {item.label}
              {item.optional ? (
                <Text size={12.5} leading={1.2} tone="faint">
                  {' — optional'}
                </Text>
              ) : null}
            </Text>

            {!item.done && item.actionLabel && item.onAction ? (
              <AdminTextAction
                label={item.actionLabel}
                onPress={item.onAction}
                tone={item.optional ? 'action' : 'warning'}
                size={11.5}
              />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
});

// -------------------------------------------------------------- empty states

/**
 * Nothing here yet, and the next step. An empty admin list is a task, not an
 * apology, so the create action sits inside the state itself.
 */
export const AdminEmpty = memo(function AdminEmpty({
  title,
  message,
  actionLabel,
  onAction,
  footnote,
  art,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** A quieter second path, e.g. "or import a spreadsheet". */
  footnote?: string;
  art?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      {art}
      <View style={styles.emptyCopy}>
        <Display size={21} weight="500" leading={1.25} align="center">
          {title}
        </Display>
        <Text
          size={13.5}
          leading={1.6}
          align="center"
          tone="muted"
          style={styles.emptyMessage}
        >
          {message}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <AdminButton
          label={actionLabel}
          Icon={Plus}
          onPress={onAction}
          fullWidth={false}
        />
      ) : null}
      {footnote ? (
        <Text size={12.5} leading={1} tone="faint">
          {footnote}
        </Text>
      ) : null}
    </View>
  );
});

/**
 * A failed load. It names what failed and offers a way forward rather than a
 * bare "something went wrong".
 */
export const AdminErrorState = memo(function AdminErrorState({
  title = 'Could not load',
  message,
  detail,
  onRetry,
  secondaryLabel,
  onSecondary,
}: {
  title?: string;
  message: string;
  /** The machine-readable line: code, endpoint, time. */
  detail?: string;
  onRetry: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.empty}>
      <View
        style={[
          styles.errorTile,
          {
            backgroundColor: colors.dangerFill,
            borderColor: colors.dangerBorder,
          },
        ]}
      >
        <Text size={24} leading={1} weight="700" tone="danger">
          !
        </Text>
      </View>

      <View style={styles.emptyCopy}>
        <Display size={21} weight="500" leading={1.25} align="center">
          {title}
        </Display>
        <Text
          size={13.5}
          leading={1.6}
          align="center"
          tone="muted"
          style={styles.emptyMessage}
        >
          {message}
        </Text>
        {detail ? (
          <Label
            size={11}
            leading={1.4}
            weight="400"
            tracking={0}
            tone="dim"
            uppercase={false}
          >
            {detail}
          </Label>
        ) : null}
      </View>

      <View style={styles.errorActions}>
        <AdminButton label="Try again" onPress={onRetry} />
        {secondaryLabel && onSecondary ? (
          <AdminButton
            label={secondaryLabel}
            variant="secondary"
            onPress={onSecondary}
          />
        ) : null}
      </View>
    </View>
  );
});

// -------------------------------------------------------------------- chrome

/** Sticky action bar pinned to the foot of an editor. */
export const AdminActionBar = memo(function AdminActionBar({
  children,
  column = false,
}: PropsWithChildren<{ column?: boolean }>) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.actionBar,
        column ? styles.actionBarColumn : null,
        { borderTopColor: colors.chromeBorder, backgroundColor: colors.chrome },
      ]}
    >
      {children}
    </View>
  );
});

/** An upload's progress, shown inline on the card that owns the file. */
export const AdminUploadProgress = memo(function AdminUploadProgress({
  fileName,
  percent,
  detail,
  onCancel,
}: {
  fileName: string;
  percent: number;
  detail?: string;
  onCancel?: () => void;
}) {
  return (
    <View style={styles.upload}>
      <View style={styles.between}>
        <Label
          size={11.5}
          leading={1}
          weight="400"
          tracking={0}
          uppercase={false}
          tone="muted"
        >
          {fileName}
        </Label>
        <Label size={11} leading={1} weight="700" tracking={0} tone="warning">
          {`${Math.round(percent)}%`}
        </Label>
      </View>

      <AdminMeter value={percent / 100} tone="warning" height={6} />

      {detail || onCancel ? (
        <View style={styles.between}>
          <Text
            size={11.5}
            leading={1.2}
            tone="faint"
            numberOfLines={1}
            style={styles.grow}
          >
            {detail ?? ''}
          </Text>
          {onCancel ? (
            <AdminTextAction
              label="Cancel"
              onPress={onCancel}
              destructive
              size={11.5}
            />
          ) : null}
        </View>
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
  backBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
  },
  pageTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pageTitleBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  screenTitle: {
    gap: 5,
  },
  newButton: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  segments: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
  },
  segment: {
    flex: 1,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  segmentCompact: {
    height: 30,
    borderRadius: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  block: {
    gap: 9,
  },
  card: {
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  rowGroup: {
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  hairline: {
    height: StyleSheet.hairlineWidth * 2,
  },
  attentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  attentionTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 50,
  },
  sublabel: {
    marginTop: 3,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailValue: {
    maxWidth: '62%',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleBody: {
    flex: 1,
    gap: 4,
  },
  field: {
    gap: 7,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  pickerField: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    borderRadius: radius.field,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  button: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.button,
    paddingHorizontal: 22,
  },
  buttonCompact: {
    height: 40,
    borderRadius: radius.control,
    paddingHorizontal: 16,
  },
  buttonAuto: {
    alignSelf: 'center',
  },
  buttonLabel: {
    alignItems: 'center',
    gap: 2,
  },
  chip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCompact: {
    height: 30,
    paddingHorizontal: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 5,
  },
  tagSmall: {
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 4,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  stat: {
    flex: 1,
    gap: 5,
    padding: 13,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  statRow: {
    flexDirection: 'row',
    gap: 9,
  },
  meter: {
    overflow: 'hidden',
  },
  checklist: {
    gap: 11,
    padding: 15,
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  checklistItems: {
    gap: 9,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  checklistDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  empty: {
    alignItems: 'center',
    gap: 18,
    paddingVertical: 34,
  },
  emptyCopy: {
    alignItems: 'center',
    gap: 9,
  },
  emptyMessage: {
    maxWidth: 260,
  },
  errorTile: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  errorActions: {
    gap: 10,
    width: '100%',
    maxWidth: 250,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: ADMIN_GUTTER,
    paddingTop: 13,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  actionBarColumn: {
    flexDirection: 'column',
  },
  upload: {
    gap: 8,
  },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.72,
  },
});
