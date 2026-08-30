import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Display, Text, TextButton } from '@/components/ui';
import { ChoiceCard } from '@/features/onboarding/components/ChoiceCard';
import { OnboardingProgress } from '@/features/onboarding/components/OnboardingProgress';
import { READING_RHYTHMS } from '@/features/onboarding/data/onboardingContent';
import { useOnboardingStore, type ReadingRhythm } from '@/stores/onboardingStore';
import { layout } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/**
 * Step two: how often the reader reads. This sets the daily goal on the profile
 * and the hour the app is allowed to send a reminder — both of which the reader
 * can change later in Notifications.
 */
export function RhythmScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const rhythm = useOnboardingStore(state => state.rhythm);
  const setRhythm = useOnboardingStore(state => state.setRhythm);
  const complete = useOnboardingStore(state => state.complete);

  // Completing flips the persisted flag; the root navigator swaps the stack.
  const finish = useCallback(() => complete(), [complete]);

  const handleSelect = useCallback(
    (value: ReadingRhythm) => setRhythm(value),
    [setRhythm],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
        <OnboardingProgress step={2} />

        <View style={styles.heading}>
          <Display size="title">What kind of reader are you?</Display>
          <Text size={fontSize.bodySmall} leading={1.6} tone="muted">
            Sets your daily goal and when we nudge you.
          </Text>
        </View>

        <View style={styles.choices}>
          {READING_RHYTHMS.map(option => (
            <ChoiceCard
              key={option.value}
              value={option.value}
              label={option.label}
              detail={option.detail}
              selected={rhythm === option.value}
              onSelect={handleSelect}
            />
          ))}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 20) + 18, backgroundColor: colors.background },
        ]}>
        <Button label="Continue" onPress={finish} disabled={!rhythm} />
        <TextButton label="Skip for now" tone="muted" onPress={finish} style={styles.skip} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenPadding + 4,
    paddingBottom: 32,
    gap: 24,
  },
  heading: {
    gap: 10,
  },
  choices: {
    gap: 12,
  },
  footer: {
    paddingHorizontal: layout.screenPadding + 4,
    paddingTop: 12,
    gap: 12,
  },
  skip: {
    alignSelf: 'center',
  },
});
