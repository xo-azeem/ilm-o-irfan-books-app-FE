import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  Button,
  Card,
  Chip,
  ChipWrap,
  Display,
  Label,
  SegmentedControl,
  Text,
} from '@/components/ui';
import { OnboardingProgress } from '@/features/onboarding/components/OnboardingProgress';
import {
  ONBOARDING_SUBJECTS,
  READING_LANGUAGES,
} from '@/features/onboarding/data/onboardingContent';
import type { OnboardingStackParamList } from '@/features/onboarding/navigation/types';
import { MIN_SUBJECTS, useOnboardingStore } from '@/stores/onboardingStore';
import { layout } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/**
 * Step one: what pulls the reader in. Home rearranges its rows around these,
 * and the language switch decides which script leads titles app-wide.
 */
export function SubjectsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const subjects = useOnboardingStore(state => state.subjects);
  const language = useOnboardingStore(state => state.language);
  const toggleSubject = useOnboardingStore(state => state.toggleSubject);
  const setLanguage = useOnboardingStore(state => state.setLanguage);

  const goNext = useCallback(() => navigation.navigate('OnboardingRhythm'), [navigation]);

  const chosen = subjects.length;
  const canContinue = chosen >= MIN_SUBJECTS;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
        <OnboardingProgress step={1} />

        <View style={styles.heading}>
          <Display size="title">Tell us what pulls you in.</Display>
          <Text size={fontSize.bodySmall} leading={1.6} tone="muted">
            Pick three or more. Home rearranges itself around them.
          </Text>
        </View>

        <ChipWrap>
          {ONBOARDING_SUBJECTS.map(subject => (
            <SubjectChip
              key={subject.id}
              id={subject.id}
              label={subject.label}
              selected={subjects.includes(subject.id)}
              onToggle={toggleSubject}
            />
          ))}
        </ChipWrap>

        <Card tone="alt" padded={18} gap={12}>
          <Label>Reading language</Label>
          <SegmentedControl
            options={READING_LANGUAGES}
            value={language}
            onChange={setLanguage}
            variant="soft"
          />
        </Card>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 20) + 18, backgroundColor: colors.background },
        ]}>
        <Button
          label={canContinue ? `Continue · ${chosen} chosen` : `Pick ${MIN_SUBJECTS - chosen} more`}
          onPress={goNext}
          disabled={!canContinue}
        />
      </View>
    </View>
  );
}

/** Split out so each chip keeps a stable handler across parent re-renders. */
function SubjectChip({
  id,
  label,
  selected,
  onToggle,
}: {
  id: string;
  label: string;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const handlePress = useCallback(() => onToggle(id), [id, onToggle]);
  return <Chip label={label} selected={selected} variant="solid" onPress={handlePress} />;
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
  footer: {
    paddingHorizontal: layout.screenPadding + 4,
    paddingTop: 12,
  },
});
