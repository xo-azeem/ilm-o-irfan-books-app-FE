import { memo, useCallback } from 'react';

import { Chip, ChipRow } from '@/components/ui';

/** The shelf the reader is looking at. */
export type LibraryShelf = 'reading' | 'saved' | 'finished' | 'offline';

export const LIBRARY_SHELVES: { value: LibraryShelf; label: string }[] = [
  { value: 'reading', label: 'Reading' },
  { value: 'saved', label: 'Saved' },
  { value: 'finished', label: 'Finished' },
  { value: 'offline', label: 'Offline' },
];

/**
 * The shelf chips. Counts appear only where there is something to count, so an
 * empty shelf reads as a plain label rather than a zero.
 */
export const LibraryFilters = memo(function LibraryFilters({
  value,
  counts,
  onChange,
}: {
  value: LibraryShelf;
  counts: Partial<Record<LibraryShelf, number>>;
  onChange: (shelf: LibraryShelf) => void;
}) {
  return (
    <ChipRow>
      {LIBRARY_SHELVES.map(shelf => (
        <ShelfChip
          key={shelf.value}
          shelf={shelf.value}
          label={shelf.label}
          count={counts[shelf.value]}
          selected={value === shelf.value}
          onChange={onChange}
        />
      ))}
    </ChipRow>
  );
});

const ShelfChip = memo(function ShelfChip({
  shelf,
  label,
  count,
  selected,
  onChange,
}: {
  shelf: LibraryShelf;
  label: string;
  count?: number;
  selected: boolean;
  onChange: (shelf: LibraryShelf) => void;
}) {
  const handlePress = useCallback(() => onChange(shelf), [onChange, shelf]);

  return (
    <Chip
      label={count ? `${label} · ${count}` : label}
      selected={selected}
      size="sm"
      onPress={handlePress}
    />
  );
});
