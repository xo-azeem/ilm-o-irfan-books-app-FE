import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Check, ListFilter, Plus, X } from 'lucide-react-native';

import {
  BookCover,
  Display,
  Divider,
  Icon,
  Label,
  LOCAL_SEARCH_DEBOUNCE_MS,
  SearchField,
  Sheet,
  Tag,
  Text,
} from '@/components/ui';
import { coverColors, radius } from '@/theme/palette';
import { fonts, sansFamily } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

import {
  AdminButton,
  AdminChip,
  AdminEyebrow,
  AdminLabel,
  AdminSegments,
  AdminTag,
  AdminTextAction,
  type AdminTagTone,
} from './AdminUi';

/**
 * Admin form controls.
 *
 * Filters, pickers and the one confirmation that matters. The rule running
 * through all of them: a control states what it will do to readers before it
 * is used, and a destructive one lists exactly what it takes with it.
 */

// ------------------------------------------------------------ filter button

/**
 * The square filter button that sits beside a search bar. It carries the count
 * of active filters as a badge, so a list that is quietly filtered can never
 * look like the whole catalog.
 */
export const AdminFilterButton = memo(function AdminFilterButton({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const active = count > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={active ? `Filters, ${count} active` : 'Filters'}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterButton,
        {
          backgroundColor: colors.surfaceAlt,
          borderColor: active ? colors.selectedBorder : colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <Icon
        icon={ListFilter}
        size={15}
        tone={active ? 'action' : 'muted'}
        strokeWidth={2}
      />
      {active ? (
        <View style={[styles.filterCount, { backgroundColor: colors.primary }]}>
          <Label
            size={9}
            leading={1}
            weight="700"
            tracking={0}
            tone="onPrimary"
          >
            {String(count)}
          </Label>
        </View>
      ) : null}
    </Pressable>
  );
});

/**
 * The removable pill that names a filter currently narrowing a list, next to
 * the count it hides: "Needs attention ×  ·  3 of 64 shown".
 */
export const AdminActiveFilter = memo(function AdminActiveFilter({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Clear filter ${label}`}
      onPress={onClear}
      style={({ pressed }) => [
        styles.activeFilter,
        {
          backgroundColor: colors.primaryFill,
          borderColor: colors.selectedBorder,
        },
        pressed && styles.pressed,
      ]}
    >
      <Text size={11.5} leading={1} weight="500" tone="action">
        {label}
      </Text>
      <Icon icon={X} size={11} tone="action" strokeWidth={2.6} />
    </Pressable>
  );
});

// --------------------------------------------------------- segmented control

export type SegmentOption<T extends string> = { value: T; label: string };

/** Kept as a named alias so existing admin screens keep compiling. */
export const AdminSegmented = AdminSegments;

/** A wrapping row of filter chips. */
function AdminChipRowInner<T extends string | null>({
  options,
  value,
  onChange,
}: {
  options: Array<{
    value: T;
    label: string;
    count?: number;
    accent?: string | null;
  }>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map(option => (
        <FilterChip
          key={String(option.value)}
          option={option}
          selected={option.value === value}
          onChange={onChange}
        />
      ))}
    </View>
  );
}

/** Split out so each chip keeps a stable handler across parent re-renders. */
function FilterChipInner<T extends string | null>({
  option,
  selected,
  onChange,
}: {
  option: { value: T; label: string; count?: number };
  selected: boolean;
  onChange: (next: T) => void;
}) {
  const handlePress = useCallback(
    () => onChange(option.value),
    [onChange, option.value],
  );
  return (
    <AdminChip
      label={option.label}
      count={option.count}
      selected={selected}
      compact
      onPress={handlePress}
    />
  );
}

const FilterChip = memo(FilterChipInner) as typeof FilterChipInner;
export const AdminChipRow = memo(AdminChipRowInner) as typeof AdminChipRowInner;

// -------------------------------------------------------------- filter sheet

export type FilterGroup<T extends string | null> = {
  id: string;
  title: string;
  value: T;
  onChange: (next: T) => void;
  options: Array<{ value: T; label: string; count?: number }>;
};

/**
 * The filter sheet.
 *
 * Every group is visible at once and the footer states the result before you
 * commit to it — "Show 3 books" rather than "Apply".
 */
export const AdminFilterSheet = memo(function AdminFilterSheet({
  visible,
  title = 'Filter',
  groups,
  resultLabel,
  onClear,
  onClose,
}: {
  visible: boolean;
  title?: string;
  // groups are heterogeneous by design
  groups: Array<FilterGroup<any>>;
  resultLabel: string;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      headerAction={<AdminTextAction label="Clear all" onPress={onClear} />}
      footer={<AdminButton label={resultLabel} onPress={onClose} />}
    >
      {groups.map(group => (
        <View key={group.id} style={styles.filterGroup}>
          <AdminEyebrow>{group.title}</AdminEyebrow>
          <AdminChipRow
            options={group.options}
            value={group.value}
            onChange={group.onChange}
          />
        </View>
      ))}
    </Sheet>
  );
});

// -------------------------------------------------------------- picker sheet

/** A small status tag on a picker or orderable row — DRAFT, PREMIUM, etc. */
export type RowBadge = { label: string; tone?: AdminTagTone };

export type PickerItem = {
  id: string;
  label: string;
  sublabel?: string;
  accent?: string | null;
  /**
   * A book: drawn as a small cover in place of the accent dot. `coverColor`
   * alone is the same placeholder a coverless book gets everywhere else.
   */
  coverUrl?: string;
  coverColor?: string | null;
  badges?: RowBadge[];
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
  onSearch,
  searching = false,
  footnote,
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
  /**
   * Hands the term to the caller instead of filtering `items` here — for a
   * list the server cuts, where the match has to happen on the server too.
   * The field is always shown when this is set.
   */
  onSearch?: (term: string) => void;
  /** A server search is in flight; the old list stands in meanwhile. */
  searching?: boolean;
  /** A line under the list — "showing the first 200; search to narrow". */
  footnote?: string;
  onClose: () => void;
  onChange: (next: string[]) => void;
}) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle || onSearch) {
      return items;
    }
    return items.filter(
      item =>
        item.label.toLowerCase().includes(needle) ||
        item.sublabel?.toLowerCase().includes(needle),
    );
  }, [items, onSearch, query]);

  const handleSearch = useCallback(
    (term: string) => {
      setQuery(term);
      onSearch?.(term);
    },
    [onSearch],
  );

  const toggle = useCallback(
    (id: string) => {
      if (multi) {
        onChange(
          selected.includes(id)
            ? selected.filter(item => item !== id)
            : [...selected, id],
        );
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
      headerAction={
        <AdminTextAction label="Done" onPress={onClose} size={12.5} />
      }
    >
      {onSearch || (searchable && items.length > 8) ? (
        <View style={styles.sheetSearch}>
          <SearchField
            dense
            defaultValue={query}
            onSearch={handleSearch}
            debounceMs={onSearch ? undefined : LOCAL_SEARCH_DEBOUNCE_MS}
            placeholder={onSearch ? 'Search titles and authors' : 'Filter'}
            style={styles.grow}
          />
          {searching ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : null}
        </View>
      ) : null}

      {filtered.length === 0 ? (
        <Text
          size={14}
          leading={1.5}
          align="center"
          tone="muted"
          style={styles.sheetEmpty}
        >
          {query.trim() ? 'Nothing matches that search.' : emptyLabel}
        </Text>
      ) : (
        <View
          style={[
            styles.pickerList,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
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

      {footnote && filtered.length > 0 ? (
        <Text
          size={11.5}
          leading={1.4}
          align="center"
          tone="faint"
          style={styles.sheetFootnote}
        >
          {footnote}
        </Text>
      ) : null}
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
      ]}
    >
      {item.coverUrl || item.coverColor ? (
        <BookCover
          width={30}
          coverUrl={item.coverUrl}
          coverColor={item.coverColor ?? undefined}
        />
      ) : item.accent ? (
        <View style={[styles.accentDot, { backgroundColor: item.accent }]} />
      ) : null}
      <View style={styles.pickerBody}>
        <Text size={14} leading={1.2} numberOfLines={1}>
          {item.label}
        </Text>
        {item.sublabel ? (
          <Text size={11.5} leading={1.2} tone="muted" numberOfLines={1}>
            {item.sublabel}
          </Text>
        ) : null}
        <RowBadges badges={item.badges} />
      </View>
      {selected ? (
        <Icon icon={Check} size={18} tone="action" strokeWidth={2.4} />
      ) : null}
    </Pressable>
  );
});

/** The tags under a row's label; nothing at all when there are none. */
export const RowBadges = memo(function RowBadges({
  badges,
}: {
  badges?: RowBadge[];
}) {
  if (!badges?.length) {
    return null;
  }
  return (
    <View style={styles.badgeRow}>
      {badges.map(badge => (
        <AdminTag
          key={badge.label}
          label={badge.label}
          tone={badge.tone}
          small
        />
      ))}
    </View>
  );
});

// ----------------------------------------------------------------- tag input

export const AdminTagInput = memo(function AdminTagInput({
  label,
  tags,
  onChange,
  helper,
  placeholder = 'Add a line and press return',
}: {
  label: string;
  tags: string[];
  onChange: (next: string[]) => void;
  helper?: string;
  placeholder?: string;
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
      <View style={styles.fieldHeader}>
        <AdminLabel>{label}</AdminLabel>
        <AdminTextAction label="Add line" onPress={commit} size={11.5} />
      </View>

      <View
        style={[
          styles.tagField,
          { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
        ]}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={commit}
          blurOnSubmit={false}
          returnKeyType="done"
          placeholder={placeholder}
          placeholderTextColor={colors.faint}
          style={[
            styles.tagInput,
            { color: colors.ink, fontFamily: sansFamily('400') },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add"
          onPress={commit}
          hitSlop={10}
          disabled={!draft.trim()}
        >
          <Icon
            icon={Plus}
            size={18}
            color={draft.trim() ? colors.actionIcon : colors.faint}
            strokeWidth={2.2}
          />
        </Pressable>
      </View>

      {tags.length ? (
        <View style={styles.tags}>
          {tags.map(tag => (
            <Tag
              key={tag}
              label={tag}
              onRemove={() => onChange(tags.filter(item => item !== tag))}
            />
          ))}
        </View>
      ) : null}

      {helper ? (
        <Text size={11.5} leading={1.4} tone="faint">
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
      <AdminEyebrow tone="faint">{label}</AdminEyebrow>

      <View style={styles.swatchRow}>
        {SWATCHES.slice(0, 5).map(swatch => {
          const picked = value.toLowerCase() === swatch.toLowerCase();
          return (
            <Pressable
              key={swatch}
              accessibilityRole="button"
              accessibilityState={{ selected: picked }}
              accessibilityLabel={`Colour ${swatch}`}
              onPress={() => onChange(swatch)}
              // The board rings the chosen swatch with the page colour and then
              // the accent, so the ring reads at any swatch brightness.
              style={({ pressed }) => [
                styles.swatchRing,
                picked && { borderColor: colors.actionInk },
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.swatch, { backgroundColor: swatch }]} />
            </Pressable>
          );
        })}

        {/* The hex escape, for a colour outside the ramp. */}
        <View
          style={[
            styles.hexField,
            {
              borderColor:
                valid || !value ? colors.borderStrong : colors.dangerBorder,
            },
          ]}
        >
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="#"
            placeholderTextColor={colors.faint}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={7}
            style={[
              styles.hexInput,
              { color: colors.ink, fontFamily: fonts.mono },
            ]}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.extraSwatches}
      >
        {SWATCHES.slice(5).map(swatch => (
          <Pressable
            key={swatch}
            accessibilityRole="button"
            accessibilityLabel={`Colour ${swatch}`}
            onPress={() => onChange(swatch)}
            style={({ pressed }) => [
              styles.smallSwatch,
              {
                backgroundColor: swatch,
                borderColor:
                  value.toLowerCase() === swatch.toLowerCase()
                    ? colors.actionInk
                    : colors.border,
                borderWidth:
                  value.toLowerCase() === swatch.toLowerCase() ? 2.5 : 1,
              },
              pressed && styles.pressed,
            ]}
          />
        ))}
      </ScrollView>

      {helper ? (
        <Text size={11.5} leading={1.4} tone="faint">
          {helper}
        </Text>
      ) : null}
    </View>
  );
});

// ------------------------------------------------------------ confirm sheet

/**
 * The one confirmation that matters.
 *
 * A deletion says what else goes with it — a reader's place in the book, the
 * downloads already on their phone, the shelves it sits in — and, when the
 * damage is wide enough, asks for the name to be typed back. The escape hatch
 * that keeps everything is written under the buttons, not hidden behind them.
 */
export const AdminConfirmSheet = memo(function AdminConfirmSheet({
  visible,
  title,
  message,
  consequences,
  confirmLabel = 'Confirm',
  cancelLabel = 'Keep it',
  confirmPhrase,
  footnote,
  destructive,
  loading,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  /** The list of things this action also removes. */
  consequences?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  /** When set, the action stays inert until this exact string is typed. */
  confirmPhrase?: string | null;
  /** The reversible alternative, stated under the buttons. */
  footnote?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  const [typed, setTyped] = useState('');

  // A reopened sheet must never arrive pre-armed from the last time.
  useEffect(() => {
    if (!visible) {
      setTyped('');
    }
  }, [visible]);

  const armed =
    !confirmPhrase ||
    typed.trim().toLowerCase() === confirmPhrase.trim().toLowerCase();

  return (
    <Sheet
      visible={visible}
      onClose={onCancel}
      contentStyle={
        destructive ? { borderTopColor: colors.dangerBorder } : undefined
      }
    >
      <View style={styles.confirmHead}>
        <Display size={20} leading={1.25} weight="500">
          {title}
        </Display>
        <Text size={13} leading={1.55} tone="muted">
          {message}
        </Text>
      </View>

      {consequences && consequences.length > 0 ? (
        <View
          style={[
            styles.consequences,
            {
              backgroundColor: colors.dangerFill,
              borderColor: colors.dangerBorder,
            },
          ]}
        >
          {consequences.map(line => (
            <View key={line} style={styles.consequence}>
              <View
                style={[styles.bullet, { backgroundColor: colors.danger }]}
              />
              <Text size={12.5} leading={1.3} tone="soft" style={styles.grow}>
                {line}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {confirmPhrase ? (
        <View style={styles.field}>
          <AdminEyebrow tone="muted">Type the name to confirm</AdminEyebrow>
          <View
            style={[
              styles.confirmInput,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
              },
            ]}
          >
            <TextInput
              value={typed}
              onChangeText={setTyped}
              placeholder={confirmPhrase}
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.confirmInputText,
                { color: colors.ink, fontFamily: sansFamily('400') },
              ]}
            />
          </View>
        </View>
      ) : null}

      <View style={styles.confirmActions}>
        <View style={styles.grow}>
          <AdminButton
            label={cancelLabel}
            variant="secondary"
            onPress={onCancel}
          />
        </View>
        <View style={styles.grow}>
          <AdminButton
            label={confirmLabel}
            variant={destructive ? 'destructive' : 'primary'}
            loading={loading}
            disabled={!armed}
            onPress={onConfirm}
          />
        </View>
      </View>

      {footnote ? (
        <Text size={11.5} leading={1.4} align="center" tone="faint">
          {footnote}
        </Text>
      ) : null}
    </Sheet>
  );
});

/** A sheet body wrapper, so a screen can compose its own bottom sheet. */
export const AdminSheetBlock = memo(function AdminSheetBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.filterGroup}>
      <AdminEyebrow>{title}</AdminEyebrow>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  // The same height as the dense `SearchField` it sits beside.
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  activeFilter: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  filterGroup: {
    gap: 9,
  },
  field: {
    gap: 8,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    paddingTop: 2,
  },
  tagField: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 15,
    borderRadius: radius.field,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  tagInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    includeFontPadding: false,
  },
  pickerList: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  pickerRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
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
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    paddingTop: 2,
  },
  sheetEmpty: {
    paddingVertical: 30,
  },
  sheetSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  sheetFootnote: {
    paddingTop: 10,
    paddingHorizontal: 12,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  swatchRing: {
    padding: 2,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 9,
  },
  hexField: {
    width: 52,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 2,
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
  confirmHead: {
    gap: 8,
  },
  consequences: {
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  consequence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  confirmInput: {
    height: 46,
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: radius.field,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  confirmInputText: {
    fontSize: 14,
    padding: 0,
    includeFontPadding: false,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.75,
  },
});
