import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, ChipWrap, Label, Sheet, Text, TextButton, Toggle } from '@/components/ui';
import {
  LANGUAGE_LABELS,
  LENGTH_LABELS,
  type LanguageFilter,
  type LengthFilter,
  type SearchFilters,
} from '@/features/search/hooks/useSearchFilters';
import { fontSize } from '@/theme/typography';

const LANGUAGES: LanguageFilter[] = ['urdu', 'english'];
const LENGTHS: LengthFilter[] = ['short', 'medium', 'long'];

export type FilterSheetProps = {
  visible: boolean;
  onClose: () => void;
  filters: SearchFilters;
  /** Live count of matches, so the primary action states the outcome. */
  resultCount: number;
  onReset: () => void;
  onToggleLanguage: (value: LanguageFilter) => void;
  onToggleLength: (value: LengthFilter) => void;
  onMembershipOnlyChange: (value: boolean) => void;
  onDownloadedOnlyChange: (value: boolean) => void;
};

/**
 * The filter sheet. One pattern serves filters, sort and reading settings: a
 * grab handle, labelled groups, and a green action at the foot that states how
 * many books the current selection leaves.
 */
export const FilterSheet = memo(function FilterSheet({
  visible,
  onClose,
  filters,
  resultCount,
  onReset,
  onToggleLanguage,
  onToggleLength,
  onMembershipOnlyChange,
  onDownloadedOnlyChange,
}: FilterSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Filters"
      headerAction={<TextButton label="Reset" onPress={onReset} />}
      footer={
        <Button
          label={
            resultCount === 1 ? 'Show 1 book' : `Show ${resultCount.toLocaleString('en-US')} books`
          }
          onPress={onClose}
          size="md"
        />
      }>
      <View style={styles.group}>
        <Label>Language</Label>
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
        <Label>Length</Label>
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
        <Label>Access</Label>
        <View style={styles.toggleRow}>
          <Text size={fontSize.body} leading={1.2} tone="soft" style={styles.grow}>
            Only books in my membership
          </Text>
          <Toggle
            value={filters.membershipOnly}
            onValueChange={onMembershipOnlyChange}
            accessibilityLabel="Only books in my membership"
          />
        </View>
        <View style={styles.toggleRow}>
          <Text size={fontSize.body} leading={1.2} tone="soft" style={styles.grow}>
            Downloaded only
          </Text>
          <Toggle
            value={filters.downloadedOnly}
            onValueChange={onDownloadedOnlyChange}
            accessibilityLabel="Downloaded only"
          />
        </View>
      </View>
    </Sheet>
  );
});

/** Split out so each chip keeps a stable handler across sheet re-renders. */
const LanguageChip = memo(function LanguageChip({
  value,
  selected,
  onToggle,
}: {
  value: LanguageFilter;
  selected: boolean;
  onToggle: (value: LanguageFilter) => void;
}) {
  const handlePress = useCallback(() => onToggle(value), [onToggle, value]);
  return <Chip label={LANGUAGE_LABELS[value]} selected={selected} onPress={handlePress} />;
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
  const handlePress = useCallback(() => onToggle(value), [onToggle, value]);
  return <Chip label={LENGTH_LABELS[value]} selected={selected} onPress={handlePress} />;
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
