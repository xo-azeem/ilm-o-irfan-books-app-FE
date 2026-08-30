import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip, ChipRow, Display } from '@/components/ui';

/** The reading moods offered on Home. Ordered calmest-last, as an evening ramp. */
export const READING_MOODS = ['Reflective', 'Curious', 'Focused', 'Calm'] as const;

export type ReadingMood = (typeof READING_MOODS)[number];

/**
 * A single-select mood rail. Picking one re-weights the recommendation rows
 * beneath it, which is why it sits above them rather than in settings.
 */
export const MoodPicker = memo(function MoodPicker({
  value,
  onChange,
  title = 'How are you reading tonight?',
}: {
  value?: ReadingMood | null;
  onChange?: (mood: ReadingMood | null) => void;
  title?: string;
}) {
  return (
    <View style={styles.root}>
      <Display size="section">{title}</Display>
      <ChipRow gap={9}>
        {READING_MOODS.map(mood => (
          <MoodChip key={mood} mood={mood} selected={value === mood} onChange={onChange} />
        ))}
      </ChipRow>
    </View>
  );
});

/** Split out so each chip keeps a stable handler across parent renders. */
const MoodChip = memo(function MoodChip({
  mood,
  selected,
  onChange,
}: {
  mood: ReadingMood;
  selected: boolean;
  onChange?: (mood: ReadingMood | null) => void;
}) {
  // Tapping the active mood clears it, so the reader can back out of a choice.
  const handlePress = useCallback(
    () => onChange?.(selected ? null : mood),
    [mood, onChange, selected],
  );

  return <Chip label={mood} selected={selected} size="sm" onPress={handlePress} />;
});

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
});
