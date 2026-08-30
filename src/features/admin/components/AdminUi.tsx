import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Switch,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react-native';

import { DisplayText, Text } from '@/components/ui';
import { palette } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

export const DANGER = '#D14343';
export const WARNING = '#C98A16';

// ------------------------------------------------------------------ chrome

export function AdminBackLink({ label = 'Back' }: { label?: string }) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => navigation.goBack()}
      accessibilityRole="button"
      hitSlop={8}
      className="-ml-1 mb-3 flex-row items-center gap-0.5 self-start py-1 active:opacity-60">
      <ChevronLeft size={22} color={colors.primary} strokeWidth={2.25} />
      <Text className="text-[15px] font-medium text-app-primary dark:text-app-primary-dark">
        {label}
      </Text>
    </Pressable>
  );
}

/** Grouped card with an optional heading and trailing action. */
export function AdminCard({
  title,
  action,
  children,
  padded = true,
}: PropsWithChildren<{ title?: string; action?: ReactNode; padded?: boolean }>) {
  return (
    <View className="gap-2">
      {title || action ? (
        <View className="flex-row items-center justify-between gap-3 px-1">
          {title ? (
            <Text className="text-[12px] font-semibold uppercase tracking-widest text-app-muted dark:text-app-muted-dark">
              {title}
            </Text>
          ) : (
            <View />
          )}
          {action}
        </View>
      ) : null}
      <View
        className={`overflow-hidden rounded-[16px] bg-app-surface dark:bg-app-surface-dark ${
          padded ? 'p-4' : ''
        }`}>
        {children}
      </View>
    </View>
  );
}

export function AdminTextAction({
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
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8} className="active:opacity-60">
      <Text
        className={`text-[14px] font-semibold ${
          destructive ? '' : 'text-app-primary dark:text-app-primary-dark'
        }`}
        style={{ color: destructive ? DANGER : undefined, opacity: disabled ? 0.4 : 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}

// ------------------------------------------------------------------- inputs

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  helper?: string;
  error?: string | null;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  prefix?: string;
  suffix?: string;
  editable?: boolean;
  maxLength?: number;
};

export function AdminField({
  label,
  value,
  onChangeText,
  placeholder,
  helper,
  error,
  keyboardType,
  multiline,
  autoCapitalize = 'sentences',
  prefix,
  suffix,
  editable = true,
  maxLength,
}: FieldProps) {
  const { colors } = useTheme();
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between px-1">
        <Text className="text-[13px] font-medium text-app-muted dark:text-app-muted-dark">
          {label}
        </Text>
        {maxLength ? (
          <Text className="text-[11px] text-app-faint dark:text-app-faint-dark">
            {value.length}/{maxLength}
          </Text>
        ) : null}
      </View>
      <View
        className="flex-row items-center rounded-[12px] border bg-app-surface px-4 dark:bg-app-surface-dark"
        style={{
          minHeight: multiline ? 112 : 50,
          borderColor: error ? DANGER : colors.border,
          opacity: editable ? 1 : 0.6,
        }}>
        {prefix ? (
          <Text className="mr-1 text-[16px] text-app-faint dark:text-app-faint-dark">{prefix}</Text>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? label}
          placeholderTextColor={colors.faint}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          multiline={multiline}
          editable={editable}
          maxLength={maxLength}
          textAlignVertical={multiline ? 'top' : 'center'}
          className="flex-1 text-[16px] leading-[21px] text-app-ink dark:text-app-ink-dark"
          style={{ minHeight: multiline ? 88 : 24, paddingVertical: multiline ? 12 : 0 }}
        />
        {suffix ? (
          <Text className="ml-1 text-[14px] text-app-faint dark:text-app-faint-dark">{suffix}</Text>
        ) : null}
      </View>
      {error ? (
        <Text className="px-1 text-[12px]" style={{ color: DANGER }}>
          {error}
        </Text>
      ) : helper ? (
        <Text className="px-1 text-[12px] leading-[16px] text-app-faint dark:text-app-faint-dark">
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

export function AdminLabel({ children }: PropsWithChildren) {
  return (
    <Text className="px-1 text-[13px] font-medium text-app-muted dark:text-app-muted-dark">
      {children}
    </Text>
  );
}

export function AdminHelper({ children }: PropsWithChildren) {
  return (
    <Text className="px-1 text-[12px] leading-[16px] text-app-faint dark:text-app-faint-dark">
      {children}
    </Text>
  );
}

// ------------------------------------------------------------------ buttons

export function AdminButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  Icon,
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
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';
  const isDestructive = variant === 'destructive';

  const background = isDestructive ? DANGER : isPrimary ? colors.primary : colors.surface;
  const foreground = isDestructive
    ? '#FFFFFF'
    : isPrimary
    ? colors.onPrimary
    : colors.ink;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      className="flex-row items-center justify-center gap-2 rounded-[14px] active:opacity-80"
      style={{
        height: compact ? 42 : 50,
        paddingHorizontal: 18,
        backgroundColor: background,
        borderWidth: variant === 'secondary' ? 1 : 0,
        borderColor: colors.border,
        opacity: disabled || loading ? 0.55 : 1,
      }}>
      {loading ? <ActivityIndicator size="small" color={foreground} /> : null}
      {!loading && Icon ? <Icon size={17} color={foreground} strokeWidth={2.1} /> : null}
      <Text
        className="font-semibold"
        style={{ color: foreground, fontSize: compact ? 14 : 16 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AdminChip({
  label,
  selected,
  onPress,
  accent,
  compact,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accent?: string | null;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const background = selected ? accent || colors.primary : colors.fill;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center gap-1.5 rounded-full active:opacity-70"
      style={{
        backgroundColor: background,
        paddingHorizontal: compact ? 10 : 13,
        paddingVertical: compact ? 5 : 7,
      }}>
      <Text
        className="font-medium"
        numberOfLines={1}
        style={{
          fontSize: compact ? 12 : 13,
          color: selected ? colors.onPrimary : colors.ink,
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

// ------------------------------------------------------------------- status

export type BadgeTone = 'success' | 'neutral' | 'warning' | 'danger' | 'accent';

const BADGE_COLORS: Record<BadgeTone, string> = {
  success: palette.green,
  neutral: '#7A917F',
  warning: WARNING,
  danger: DANGER,
  accent: palette.yellowGreen,
};

export function AdminBadge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const color = BADGE_COLORS[tone];
  return (
    <View
      className="rounded-full px-2 py-[3px]"
      style={{ backgroundColor: `${color}22`, borderWidth: 1, borderColor: `${color}55` }}>
      <Text className="text-[11px] font-semibold" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

export function AdminToggleRow({
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
    <View className="flex-row items-center gap-3 py-1">
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-[16px] text-app-ink dark:text-app-ink-dark">{label}</Text>
        {description ? (
          <Text className="text-[12px] leading-[17px] text-app-muted dark:text-app-muted-dark">
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

/** Tappable row that opens a picker or a sub-screen. */
export function AdminNavRow({
  label,
  value,
  onPress,
  Icon,
  tone,
  isLast,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  Icon?: LucideIcon;
  tone?: 'default' | 'danger';
  isLast?: boolean;
}) {
  const { colors } = useTheme();
  const color = tone === 'danger' ? DANGER : colors.ink;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => (pressed ? { backgroundColor: colors.fill } : undefined)}
      className={`min-h-[52px] flex-row items-center gap-3 px-4 py-3 ${
        isLast ? '' : 'border-b border-app-border dark:border-app-border-dark'
      }`}>
      {Icon ? <Icon size={19} color={color} strokeWidth={2} /> : null}
      <Text className="flex-1 text-[16px]" style={{ color }} numberOfLines={1}>
        {label}
      </Text>
      {value ? (
        <Text
          className="max-w-[45%] text-[14px] text-app-muted dark:text-app-muted-dark"
          numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      <ChevronRight size={17} color={colors.faint} strokeWidth={2.2} />
    </Pressable>
  );
}

export function AdminEmpty({
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
    <View className="items-center justify-center rounded-[16px] bg-app-surface px-6 py-12 dark:bg-app-surface-dark">
      <DisplayText className="mb-2 text-center text-[17px] font-semibold text-app-ink dark:text-app-ink-dark">
        {title}
      </DisplayText>
      <Text className="mb-4 max-w-[280px] text-center text-[14px] leading-5 text-app-muted dark:text-app-muted-dark">
        {message}
      </Text>
      {actionLabel && onAction ? (
        <AdminButton label={actionLabel} onPress={onAction} compact />
      ) : null}
    </View>
  );
}

export function AdminErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Pressable
      onPress={onRetry}
      className="rounded-[16px] bg-app-surface p-5 dark:bg-app-surface-dark active:opacity-70">
      <Text className="mb-1 text-[15px] font-semibold text-app-ink dark:text-app-ink-dark">
        Could not load
      </Text>
      <Text className="text-[13px] leading-[18px] text-app-muted dark:text-app-muted-dark">
        {message} Tap to retry.
      </Text>
    </Pressable>
  );
}

export function AdminStat({
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
  const color = tone ? BADGE_COLORS[tone] : undefined;
  const body = (
    <>
      <Text className="text-[11px] font-semibold uppercase tracking-widest text-app-faint dark:text-app-faint-dark">
        {label}
      </Text>
      <DisplayText
        className="mt-1.5 text-[26px] font-bold text-app-ink dark:text-app-ink-dark"
        style={color ? { color } : undefined}>
        {value}
      </DisplayText>
      {hint ? (
        <Text className="mt-0.5 text-[11px] text-app-muted dark:text-app-muted-dark">{hint}</Text>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className="min-w-[46%] flex-1 rounded-[16px] bg-app-surface p-4 dark:bg-app-surface-dark active:opacity-70">
        {body}
      </Pressable>
    );
  }

  return (
    <View className="min-w-[46%] flex-1 rounded-[16px] bg-app-surface p-4 dark:bg-app-surface-dark">
      {body}
    </View>
  );
}

/** Sticky action bar pinned above the tab capsule on editor screens. */
export function AdminActionBar({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return (
    <View
      className="flex-row gap-3 border-t px-5 pb-3 pt-3"
      style={{ borderColor: colors.border, backgroundColor: colors.chrome }}>
      {children}
    </View>
  );
}

export function AdminDivider() {
  return <View className="h-px bg-app-border dark:bg-app-border-dark" />;
}

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
      />
    ),
  };
}
