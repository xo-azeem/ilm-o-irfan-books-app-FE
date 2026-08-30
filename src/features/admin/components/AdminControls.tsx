import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Check, Plus, Search, X } from 'lucide-react-native';

import { DisplayText, Text } from '@/components/ui';
import { coverColors } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeContext';

import { AdminButton, AdminChip, AdminLabel, DANGER } from './AdminUi';

// ---------------------------------------------------------------- search bar

export function AdminSearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      className="mb-3 flex-row items-center gap-2 rounded-[12px] border bg-app-surface px-3 dark:bg-app-surface-dark"
      style={{ borderColor: colors.border, height: 46 }}>
      <Search size={18} color={colors.faint} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        autoCapitalize="none"
        autoCorrect={false}
        className="flex-1 text-[16px] text-app-ink dark:text-app-ink-dark"
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} className="active:opacity-60">
          <X size={17} color={colors.faint} strokeWidth={2.2} />
        </Pressable>
      ) : null}
    </View>
  );
}

// --------------------------------------------------------- segmented control

export type SegmentOption<T extends string> = { value: T; label: string };

export function AdminSegmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      className="flex-row rounded-[11px] p-[3px]"
      style={{ backgroundColor: colors.fill }}>
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className="flex-1 items-center justify-center rounded-[9px] py-[7px]"
            style={{ backgroundColor: selected ? colors.surface : 'transparent' }}>
            <Text
              className="text-[13px] font-medium"
              numberOfLines={1}
              style={{ color: selected ? colors.ink : colors.muted }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Horizontally scrolling filter chips, for filters that exceed a segment row. */
export function AdminChipRow<T extends string | null>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string; accent?: string | null }>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 pr-5">
      {options.map(option => (
        <AdminChip
          key={String(option.value)}
          label={option.label}
          accent={option.accent}
          selected={option.value === value}
          onPress={() => onChange(option.value)}
          compact
        />
      ))}
    </ScrollView>
  );
}

// -------------------------------------------------------------- picker sheet

export type PickerItem = {
  id: string;
  label: string;
  sublabel?: string;
  accent?: string | null;
};

/**
 * Bottom sheet list picker. `multi` keeps the sheet open and returns the full
 * selection; single-select closes on tap.
 */
export function AdminPickerSheet({
  visible,
  title,
  items,
  selected,
  multi,
  searchable = true,
  emptyLabel = 'Nothing to choose yet.',
  onClose,
  onChange,
}: {
  visible: boolean;
  title: string;
  items: PickerItem[];
  selected: string[];
  multi?: boolean;
  searchable?: boolean;
  emptyLabel?: string;
  onClose: () => void;
  onChange: (next: string[]) => void;
}) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      item =>
        item.label.toLowerCase().includes(needle) ||
        item.sublabel?.toLowerCase().includes(needle),
    );
  }, [items, query]);

  const toggle = (id: string) => {
    if (multi) {
      onChange(selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id]);
      return;
    }
    onChange([id]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <View
        className="max-h-[76%] rounded-t-[22px] pb-8"
        style={{ backgroundColor: colors.background }}>
        <View className="items-center pt-2.5">
          <View className="h-1 w-10 rounded-full" style={{ backgroundColor: colors.border }} />
        </View>

        <View className="flex-row items-center justify-between px-5 py-3">
          <DisplayText className="text-[19px] font-semibold text-app-ink dark:text-app-ink-dark">
            {title}
          </DisplayText>
          <Pressable onPress={onClose} hitSlop={10} className="active:opacity-60">
            <Text className="text-[15px] font-semibold text-app-primary dark:text-app-primary-dark">
              Done
            </Text>
          </Pressable>
        </View>

        {searchable && items.length > 8 ? (
          <View className="px-5">
            <AdminSearchBar value={query} onChangeText={setQuery} placeholder="Filter" />
          </View>
        ) : null}

        <ScrollView className="px-5" keyboardShouldPersistTaps="handled">
          {filtered.length === 0 ? (
            <Text className="py-8 text-center text-[14px] text-app-muted dark:text-app-muted-dark">
              {emptyLabel}
            </Text>
          ) : (
            <View className="overflow-hidden rounded-[14px] bg-app-surface dark:bg-app-surface-dark">
              {filtered.map((item, index) => {
                const isSelected = selected.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggle(item.id)}
                    style={({ pressed }) => (pressed ? { backgroundColor: colors.fill } : undefined)}
                    className={`min-h-[50px] flex-row items-center gap-3 px-4 py-3 ${
                      index === filtered.length - 1
                        ? ''
                        : 'border-b border-app-border dark:border-app-border-dark'
                    }`}>
                    {item.accent ? (
                      <View
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.accent }}
                      />
                    ) : null}
                    <View className="min-w-0 flex-1">
                      <Text
                        className="text-[16px] text-app-ink dark:text-app-ink-dark"
                        numberOfLines={1}>
                        {item.label}
                      </Text>
                      {item.sublabel ? (
                        <Text
                          className="text-[12px] text-app-muted dark:text-app-muted-dark"
                          numberOfLines={1}>
                          {item.sublabel}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Check size={19} color={colors.primary} strokeWidth={2.4} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}
          <View className="h-6" />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ----------------------------------------------------------------- tag input

export function AdminTagInput({
  label,
  tags,
  onChange,
  helper,
}: {
  label: string;
  tags: string[];
  onChange: (next: string[]) => void;
  helper?: string;
}) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState('');

  const commit = () => {
    const value = draft.trim();
    if (!value) return;
    if (!tags.some(tag => tag.toLowerCase() === value.toLowerCase())) {
      onChange([...tags, value]);
    }
    setDraft('');
  };

  return (
    <View className="gap-1.5">
      <AdminLabel>{label}</AdminLabel>
      <View
        className="flex-row items-center rounded-[12px] border bg-app-surface px-4 dark:bg-app-surface-dark"
        style={{ borderColor: colors.border, minHeight: 50 }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={commit}
          blurOnSubmit={false}
          returnKeyType="done"
          placeholder="Add a tag and press return"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          autoCorrect={false}
          className="flex-1 text-[16px] text-app-ink dark:text-app-ink-dark"
        />
        <Pressable onPress={commit} hitSlop={10} disabled={!draft.trim()} className="active:opacity-60">
          <Plus size={19} color={draft.trim() ? colors.primary : colors.faint} strokeWidth={2.2} />
        </Pressable>
      </View>

      {tags.length ? (
        <View className="flex-row flex-wrap gap-2 px-1 pt-1">
          {tags.map(tag => (
            <Pressable
              key={tag}
              onPress={() => onChange(tags.filter(item => item !== tag))}
              className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5 active:opacity-70"
              style={{ backgroundColor: colors.fill }}>
              <Text className="text-[13px] text-app-ink dark:text-app-ink-dark">{tag}</Text>
              <X size={13} color={colors.muted} strokeWidth={2.4} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {helper ? (
        <Text className="px-1 text-[12px] text-app-faint dark:text-app-faint-dark">{helper}</Text>
      ) : null}
    </View>
  );
}

// -------------------------------------------------------------- colour field

const SWATCHES = [
  ...Object.values(coverColors).map(entry => entry.light),
  '#8E44AD',
  '#2C6E9B',
  '#B7791F',
  '#A63D40',
  '#3D405B',
  '#1F1F1F',
];

export function AdminColorField({
  label,
  value,
  onChange,
  helper,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  helper?: string;
}) {
  const { colors } = useTheme();
  const valid = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());

  return (
    <View className="gap-1.5">
      <AdminLabel>{label}</AdminLabel>
      <View
        className="flex-row items-center gap-3 rounded-[12px] border bg-app-surface px-4 dark:bg-app-surface-dark"
        style={{ borderColor: valid || !value ? colors.border : DANGER, height: 50 }}>
        <View
          className="h-6 w-6 rounded-md"
          style={{
            backgroundColor: valid ? value : colors.fill,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="#2D8A47"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={7}
          className="flex-1 text-[16px] text-app-ink dark:text-app-ink-dark"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-1 pt-1">
        {SWATCHES.map(swatch => (
          <Pressable
            key={swatch}
            onPress={() => onChange(swatch)}
            className="h-7 w-7 rounded-full active:opacity-70"
            style={{
              backgroundColor: swatch,
              borderWidth: value.toLowerCase() === swatch.toLowerCase() ? 2.5 : 1,
              borderColor:
                value.toLowerCase() === swatch.toLowerCase() ? colors.ink : colors.border,
            }}
          />
        ))}
      </ScrollView>

      {helper ? (
        <Text className="px-1 text-[12px] text-app-faint dark:text-app-faint-dark">{helper}</Text>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------ confirm dialog

export function AdminConfirmSheet({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive,
  loading,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/45 px-8">
        <View
          className="w-full gap-3 rounded-[20px] p-5"
          style={{ backgroundColor: colors.surface }}>
          <DisplayText className="text-[18px] font-semibold text-app-ink dark:text-app-ink-dark">
            {title}
          </DisplayText>
          <Text className="mb-2 text-[14px] leading-[20px] text-app-muted dark:text-app-muted-dark">
            {message}
          </Text>
          <AdminButton
            label={confirmLabel}
            variant={destructive ? 'destructive' : 'primary'}
            loading={loading}
            onPress={onConfirm}
          />
          <AdminButton label="Cancel" variant="secondary" onPress={onCancel} disabled={loading} />
        </View>
      </View>
    </Modal>
  );
}
