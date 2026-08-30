import { memo, useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Check, Plus } from 'lucide-react-native';

import {
  Button,
  Card,
  Chip,
  ChipRow,
  Display,
  Divider,
  Icon,
  Label,
  SearchField,
  SegmentedControl,
  Sheet,
  Tag,
  Text,
  TextButton,
  TextField,
} from '@/components/ui';
import { coverColors, radius } from '@/theme/palette';
import { fonts, fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/**
 * Admin form controls.
 *
 * Each of these is a thin arrangement of the shared primitives — the admin
 * panel gets the same inputs, chips and sheets as the reader app, at a denser
 * rhythm.
 */

// ---------------------------------------------------------------- search bar

export const AdminSearchBar = memo(function AdminSearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  const handleClear = useCallback(() => onChangeText(''), [onChangeText]);

  return (
    <SearchField
      value={value}
      onChangeText={onChangeText}
      onClear={handleClear}
      placeholder={placeholder}
      dense
    />
  );
});

// --------------------------------------------------------- segmented control

export type SegmentOption<T extends string> = { value: T; label: string };

/** Kept as a named alias so existing admin screens keep compiling. */
export const AdminSegmented = SegmentedControl;

/** Horizontally scrolling filter chips, for filters that exceed a segment row. */
function AdminChipRowInner<T extends string | null>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string; accent?: string | null }>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <ChipRow bleed={0} gap={8}>
      {options.map(option => (
        <FilterChip
          key={String(option.value)}
          option={option}
          selected={option.value === value}
          onChange={onChange}
        />
      ))}
    </ChipRow>
  );
}

/** Split out so each chip keeps a stable handler across parent re-renders. */
function FilterChipInner<T extends string | null>({
  option,
  selected,
  onChange,
}: {
  option: { value: T; label: string };
  selected: boolean;
  onChange: (next: T) => void;
}) {
  const handlePress = useCallback(() => onChange(option.value), [onChange, option.value]);
  return <Chip label={option.label} selected={selected} size="sm" onPress={handlePress} />;
}

const FilterChip = memo(FilterChipInner) as typeof FilterChipInner;
export const AdminChipRow = memo(AdminChipRowInner) as typeof AdminChipRowInner;

// -------------------------------------------------------------- picker sheet

export type PickerItem = {
  id: string;
  label: string;
  sublabel?: string;
  accent?: string | null;
};

/**
 * A bottom-sheet list picker. `multi` keeps the sheet open and returns the full
 * selection; single-select closes on tap, because the choice is complete.
 */
export const AdminPickerSheet = memo(function AdminPickerSheet({
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
    if (!needle) {
      return items;
    }
    return items.filter(
      item =>
        item.label.toLowerCase().includes(needle) ||
        item.sublabel?.toLowerCase().includes(needle),
    );
  }, [items, query]);

  const toggle = useCallback(
    (id: string) => {
      if (multi) {
        onChange(selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id]);
        return;
      }
      onChange([id]);
      onClose();
    },
    [multi, onChange, onClose, selected],
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      headerAction={<TextButton label="Done" onPress={onClose} />}>
      {searchable && items.length > 8 ? (
        <AdminSearchBar value={query} onChangeText={setQuery} placeholder="Filter" />
      ) : null}

      {filtered.length === 0 ? (
        <Text size={fontSize.bodySmall} leading={1.5} align="center" tone="muted" style={styles.empty}>
          {emptyLabel}
        </Text>
      ) : (
        <View style={[styles.pickerList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {filtered.map((item, index) => (
            <View key={item.id}>
              {index > 0 ? <Divider /> : null}
              <PickerRow
                item={item}
                selected={selected.includes(item.id)}
                onPress={toggle}
              />
            </View>
          ))}
        </View>
      )}
    </Sheet>
  );
});

const PickerRow = memo(function PickerRow({
  item,
  selected,
  onPress,
}: {
  item: PickerItem;
  selected: boolean;
  onPress: (id: string) => void;
}) {
  const { colors } = useTheme();
  const handlePress = useCallback(() => onPress(item.id), [item.id, onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.pickerRow,
        pressed && { backgroundColor: colors.primaryFillSoft },
      ]}>
      {item.accent ? (
        <View style={[styles.accentDot, { backgroundColor: item.accent }]} />
      ) : null}
      <View style={styles.pickerBody}>
        <Text size={fontSize.body} leading={1.2} numberOfLines={1}>
          {item.label}
        </Text>
        {item.sublabel ? (
          <Text size={fontSize.captionSmall} leading={1.2} tone="muted" numberOfLines={1}>
            {item.sublabel}
          </Text>
        ) : null}
      </View>
      {selected ? <Icon icon={Check} size={18} tone="primary" strokeWidth={2.4} /> : null}
    </Pressable>
  );
});

// ----------------------------------------------------------------- tag input

export const AdminTagInput = memo(function AdminTagInput({
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

  const commit = useCallback(() => {
    const value = draft.trim();
    if (!value) {
      return;
    }
    if (!tags.some(tag => tag.toLowerCase() === value.toLowerCase())) {
      onChange([...tags, value]);
    }
    setDraft('');
  }, [draft, onChange, tags]);

  return (
    <View style={styles.field}>
      <Label size={fontSize.labelSmall} tracking={1.4}>
        {label}
      </Label>

      <TextField
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={commit}
        blurOnSubmit={false}
        returnKeyType="done"
        placeholder="Add a tag and press return"
        height={46}
        trailing={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add tag"
            onPress={commit}
            hitSlop={10}
            disabled={!draft.trim()}>
            <Icon
              icon={Plus}
              size={18}
              color={draft.trim() ? colors.primarySoft : colors.faint}
              strokeWidth={2.2}
            />
          </Pressable>
        }
      />

      {tags.length ? (
        <View style={styles.tags}>
          {tags.map(tag => (
            <Tag
              key={tag}
              label={tag}
              onRemove={() => onChange(tags.filter(item => item !== tag))}
            />
          ))}
          <Tag label="+ add tag" dashed onPress={commit} />
        </View>
      ) : null}

      {helper ? (
        <Text size={fontSize.captionSmall} leading={1.4} tone="faint">
          {helper}
        </Text>
      ) : null}
    </View>
  );
});

// -------------------------------------------------------------- colour field

/** The brand cover ramp first, then a wider set for one-off titles. */
const SWATCHES = [
  ...Object.values(coverColors).map(entry => entry.light),
  '#8E44AD',
  '#2C6E9B',
  '#B7791F',
  '#A63D40',
  '#3D405B',
  '#1F1F1F',
];

export const AdminColorField = memo(function AdminColorField({
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
    <View style={styles.field}>
      <Label size={fontSize.labelSmall} tracking={1.4}>
        {label}
      </Label>

      <View style={styles.swatchRow}>
        {SWATCHES.slice(0, 5).map(swatch => (
          <Pressable
            key={swatch}
            accessibilityRole="button"
            accessibilityLabel={`Cover colour ${swatch}`}
            onPress={() => onChange(swatch)}
            style={({ pressed }) => [
              styles.swatch,
              {
                backgroundColor: swatch,
                borderColor:
                  value.toLowerCase() === swatch.toLowerCase() ? colors.inkSoft : 'transparent',
                borderWidth: value.toLowerCase() === swatch.toLowerCase() ? 2 : 0,
              },
              pressed && styles.pressed,
            ]}
          />
        ))}

        {/* The hex escape, for a colour outside the ramp. */}
        <View style={[styles.hexField, { borderColor: valid || !value ? colors.borderStrong : colors.dangerBorder }]}>
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="#"
            placeholderTextColor={colors.faint}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={7}
            style={[styles.hexInput, { color: colors.ink, fontFamily: fonts.mono }]}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.extraSwatches}>
        {SWATCHES.slice(5).map(swatch => (
          <Pressable
            key={swatch}
            accessibilityRole="button"
            accessibilityLabel={`Cover colour ${swatch}`}
            onPress={() => onChange(swatch)}
            style={({ pressed }) => [
              styles.smallSwatch,
              {
                backgroundColor: swatch,
                borderColor:
                  value.toLowerCase() === swatch.toLowerCase() ? colors.inkSoft : colors.border,
                borderWidth: value.toLowerCase() === swatch.toLowerCase() ? 2.5 : 1,
              },
              pressed && styles.pressed,
            ]}
          />
        ))}
      </ScrollView>

      {helper ? (
        <Text size={fontSize.captionSmall} leading={1.4} tone="faint">
          {helper}
        </Text>
      ) : null}
    </View>
  );
});

// ------------------------------------------------------------ confirm dialog

export const AdminConfirmSheet = memo(function AdminConfirmSheet({
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
      <View style={[styles.dialogScrim, { backgroundColor: colors.scrim }]}>
        <Card tone="surface" rounded={radius.cardLarge} padded={20} gap={12} style={styles.dialog}>
          <Display size={18}>{title}</Display>
          <Text size={fontSize.bodySmall} leading={1.45} tone="muted" style={styles.dialogMessage}>
            {message}
          </Text>
          <Button
            label={confirmLabel}
            variant={destructive ? 'dangerSolid' : 'primary'}
            loading={loading}
            onPress={onConfirm}
            size="md"
          />
          <Button label="Cancel" variant="secondary" onPress={onCancel} disabled={loading} size="md" />
        </Card>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  field: {
    gap: 8,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    paddingTop: 2,
  },
  pickerList: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  pickerRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  pickerBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  accentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  empty: {
    paddingVertical: 30,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 11,
  },
  hexField: {
    width: 46,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  hexInput: {
    fontSize: 11,
    padding: 0,
    textAlign: 'center',
    includeFontPadding: false,
  },
  extraSwatches: {
    gap: 8,
    paddingTop: 2,
  },
  smallSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  dialogScrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  dialog: {
    width: '100%',
  },
  dialogMessage: {
    marginBottom: 4,
  },
  pressed: {
    opacity: 0.75,
  },
});
