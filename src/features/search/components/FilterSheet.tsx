import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  Chip,
  ChipWrap,
  Label,
  Sheet,
  Text,
  TextButton,
  Toggle,
} from '@/components/ui';
import {
  LANGUAGES,
  LENGTHS,
  SORTS,
  type LanguageFilter,
  type LengthFilter,
  type SearchFilters,
} from '@/features/search/hooks/useSearchFilters';
import { useStrings } from '@/i18n';
import type { CatalogCategory, CatalogSort } from '@/services/catalog';
import { fontSize } from '@/theme/typography';

export type FilterSheetProps = {
  visible: boolean;
  onClose: () => void;
  filters: SearchFilters;
  /** The subjects the catalogue offers — the same list the panel draws. */
  categories: CatalogCategory[];
  /** Live count of matches, so the primary action states the outcome. */
  resultCount: number;
  onReset: () => void;
  onCategoryChange: (value: string | null) => void;
  onToggleLanguage: (value: LanguageFilter) => void;
  onToggleLength: (value: LengthFilter) => void;
  onMembershipOnlyChange: (value: boolean) => void;
  onDownloadedOnlyChange: (value: boolean) => void;
  onHighlyRatedOnlyChange: (value: boolean) => void;
  onSortChange: (value: CatalogSort | null) => void;
  /** True while there is a search term, which is what makes "Best match" real. */
  searching: boolean;
};

/**
 * The filter sheet. One pattern serves filters, sort and reading settings: a
 * grab handle, labelled groups, and a green action at the foot that states how
 * many books the current selection leaves.
 *
 * Subject sits at the top, and it is the same `categoryId` the browse drawer
 * writes — the sheet is a second way to reach one filter, not a second filter.
 *
 * Every control here narrows or orders the query itself, so the count on the
 * action is the database's own, not a tally of what survived a local pass.
 */
export const FilterSheet = memo(function FilterSheet({
  visible,
  onClose,
  filters,
  categories,
  resultCount,
  onReset,
  onCategoryChange,
  onToggleLanguage,
  onToggleLength,
  onMembershipOnlyChange,
  onDownloadedOnlyChange,
  onHighlyRatedOnlyChange,
  onSortChange,
  searching,
}: FilterSheetProps) {
  const s = useStrings();
  const words = s.catalog.discover;
  const clearCategory = useCallback(
    () => onCategoryChange(null),
    [onCategoryChange],
  );
  const clearSort = useCallback(() => onSortChange(null), [onSortChange]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={words.filters}
      headerAction={<TextButton label={words.reset} onPress={onReset} />}
      footer={
        <Button
          label={words.showBooks(
            resultCount,
            resultCount.toLocaleString('en-US'),
          )}
          onPress={onClose}
          size="md"
        />
      }
    >
      {categories.length > 0 ? (
        <View style={styles.group}>
          <Label>{words.subject}</Label>
          <ChipWrap gap={9}>
            <Chip
              label={words.allSubjects}
              selected={filters.categoryId == null}
              onPress={clearCategory}
            />
            {categories.map(category => (
              <SubjectChip
                key={category.id}
                id={category.id}
                label={category.label}
                selected={filters.categoryId === category.id}
                onToggle={onCategoryChange}
              />
            ))}
          </ChipWrap>
        </View>
      ) : null}

      <View style={styles.group}>
        <Label>{words.language}</Label>
        <ChipWrap gap={9}>
          {LANGUAGES.map(language => (
            <LanguageChip
              key={language}
              value={language}
              selected={filters.languages.includes(language)}
              onToggle={onToggleLanguage}
            />
          ))}
        </ChipWrap>
      </View>

      <View style={styles.group}>
        {/* Pages, and the backend owns what each bucket means — it reads a real
            page count where a reader has reported one. */}
        <Label>{words.length}</Label>
        <ChipWrap gap={9}>
          {LENGTHS.map(length => (
            <LengthChip
              key={length}
              value={length}
              selected={filters.lengths.includes(length)}
              onToggle={onToggleLength}
            />
          ))}
        </ChipWrap>
      </View>

      <View style={styles.access}>
        <Label>{words.access}</Label>
        <View style={styles.toggleRow}>
          <Text
            size={fontSize.body}
            leading={1.2}
            tone="soft"
            style={styles.grow}
          >
            {words.onlyInMembership}
          </Text>
          <Toggle
            value={filters.membershipOnly}
            onValueChange={onMembershipOnlyChange}
            accessibilityLabel={words.onlyInMembership}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text
            size={fontSize.body}
            leading={1.2}
            tone="soft"
            style={styles.grow}
          >
            {words.downloadedOnly}
          </Text>
          <Toggle
            value={filters.downloadedOnly}
            onValueChange={onDownloadedOnlyChange}
            accessibilityLabel={words.downloadedOnly}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text
            size={fontSize.body}
            leading={1.2}
            tone="soft"
            style={styles.grow}
          >
            {words.ratedFourUp}
          </Text>
          <Toggle
            value={filters.highlyRatedOnly}
            onValueChange={onHighlyRatedOnlyChange}
            accessibilityLabel={words.ratedFourUpA11y}
          />
        </View>
      </View>

      <View style={styles.group}>
        {/* Ordering is the database's, applied before the page is cut, so it
            reorders the whole result set and not the rows already fetched. */}
        <Label>{words.sort}</Label>
        <ChipWrap gap={9}>
          {/* Unset is the server's default: best match once the reader has
              typed, newest while they are browsing. */}
          <Chip
            label={searching ? words.sorts.relevance : words.default}
            selected={filters.sort == null}
            onPress={clearSort}
          />
          {SORTS.map(sort => (
            <SortChip
              key={sort}
              value={sort}
              selected={filters.sort === sort}
              onToggle={onSortChange}
            />
          ))}
        </ChipWrap>
      </View>
    </Sheet>
  );
});

/** Split out so each chip keeps a stable handler across sheet re-renders. */
const SubjectChip = memo(function SubjectChip({
  id,
  label,
  selected,
  onToggle,
}: {
  id: string;
  label: string;
  selected: boolean;
  onToggle: (value: string) => void;
}) {
  const handlePress = useCallback(() => onToggle(id), [id, onToggle]);
  return <Chip label={label} selected={selected} onPress={handlePress} />;
});

const LanguageChip = memo(function LanguageChip({
  value,
  selected,
  onToggle,
}: {
  value: LanguageFilter;
  selected: boolean;
  onToggle: (value: LanguageFilter) => void;
}) {
  const s = useStrings();
  const handlePress = useCallback(() => onToggle(value), [onToggle, value]);
  return (
    <Chip
      label={s.catalog.discover.languages[value]}
      selected={selected}
      onPress={handlePress}
    />
  );
});

const LengthChip = memo(function LengthChip({
  value,
  selected,
  onToggle,
}: {
  value: LengthFilter;
  selected: boolean;
  onToggle: (value: LengthFilter) => void;
}) {
  const s = useStrings();
  const handlePress = useCallback(() => onToggle(value), [onToggle, value]);
  return (
    <Chip
      label={s.catalog.discover.lengths[value]}
      selected={selected}
      onPress={handlePress}
    />
  );
});

/** Re-picking the active order returns to the server's default. */
const SortChip = memo(function SortChip({
  value,
  selected,
  onToggle,
}: {
  value: CatalogSort;
  selected: boolean;
  onToggle: (value: CatalogSort | null) => void;
}) {
  const s = useStrings();
  const handlePress = useCallback(
    () => onToggle(selected ? null : value),
    [onToggle, selected, value],
  );
  return (
    <Chip
      label={s.catalog.discover.sorts[value]}
      selected={selected}
      onPress={handlePress}
    />
  );
});

const styles = StyleSheet.create({
  group: {
    gap: 11,
  },
  access: {
    gap: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  grow: {
    flex: 1,
  },
});
