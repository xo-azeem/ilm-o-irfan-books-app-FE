import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  Card,
  Divider,
  Label,
  SegmentedControl,
  SettingsGroup,
  SettingsRow,
  Text,
  Toggle,
} from '@/components/ui';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { readerTones, theme, type ReaderTone } from '@/theme/palette';
import {
  READING_MODE_HINTS,
  READING_MODES,
  useThemeStore,
  type ThemePreference,
} from '@/stores/themeStore';
import {
  FONT_SCALES,
  FONT_SCALE_ORDER,
  fontSize,
  type FontScale,
} from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
];

const TONES: { value: ReaderTone; label: string }[] = [
  { value: 'paper', label: 'Paper' },
  { value: 'sepia', label: 'Sepia' },
  { value: 'midnight', label: 'Midnight' },
];

/**
 * Appearance.
 *
 * A live preview sits above the three choices, and the reader's page tone is
 * pulled up here so it is not buried in the reader's own sheet.
 *
 * The text-size selector needs no preview of its own: the choice applies to
 * every glyph in the app, so this screen resizes under the reader's finger as
 * they tap through the steps.
 */
export function AppearanceScreen() {
  const themePreference = useThemeStore(state => state.themePreference);
  const setThemePreference = useThemeStore(state => state.setThemePreference);
  const fontScale = useThemeStore(state => state.fontScale);
  const setFontScale = useThemeStore(state => state.setFontScale);
  const pageTone = useThemeStore(state => state.pageTone);
  const setPageTone = useThemeStore(state => state.setPageTone);
  const readingMode = useThemeStore(state => state.readingMode);
  const setReadingMode = useThemeStore(state => state.setReadingMode);
  const keepScreenAwake = useThemeStore(state => state.keepScreenAwake);
  const setKeepScreenAwake = useThemeStore(state => state.setKeepScreenAwake);

  return (
    <ProfileSubScreenLayout
      title="Appearance"
      subtitle="Choose how the app looks on this device.">
      <View style={styles.previews}>
        {THEME_OPTIONS.map(option => (
          <ThemePreview
            key={option.id}
            id={option.id}
            label={option.label}
            selected={themePreference === option.id}
            onSelect={setThemePreference}
          />
        ))}
      </View>

      <SettingsGroup>
        <SettingsRow
          title="Match device settings"
          subtitle="Follows your system theme"
          selected={themePreference === 'system'}
          onPress={() => setThemePreference('system')}
        />
        <SettingsRow
          title="Always use light mode"
          subtitle="Better in daylight"
          selected={themePreference === 'light'}
          onPress={() => setThemePreference('light')}
        />
        <SettingsRow
          title="Always use dark mode"
          subtitle="Recommended for night reading"
          selected={themePreference === 'dark'}
          onPress={() => setThemePreference('dark')}
        />
      </SettingsGroup>

      <View style={styles.section}>
        <Label size={fontSize.labelSmall + 0.5} tracking={1.5}>
          Text size
        </Label>
        <Card tone="surface" padded={15} gap={14}>
          <View style={styles.row}>
            <View style={styles.rowBody}>
              <Text size={fontSize.body} leading={1}>
                App text size
              </Text>
              <Text size={12.5} leading={1.2} tone="muted">
                Applied to every screen
              </Text>
            </View>
            <Text size={fontSize.caption} leading={1} weight="600" tone="primary">
              {FONT_SCALES[fontScale].label}
            </Text>
          </View>

          <View style={styles.scaleRow}>
            {FONT_SCALE_ORDER.map(step => (
              <TextSizeStep
                key={step}
                step={step}
                selected={fontScale === step}
                onSelect={setFontScale}
              />
            ))}
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Label size={fontSize.labelSmall + 0.5} tracking={1.5}>
          Reading defaults
        </Label>
        <Card tone="surface" padded={15} gap={16}>
          <View style={styles.row}>
            <View style={styles.rowBody}>
              <Text size={fontSize.body} leading={1}>
                Page tone
              </Text>
              <Text size={12.5} leading={1.2} tone="muted">
                Applied to every book you open
              </Text>
            </View>
            <View style={styles.toneRow}>
              {TONES.map(tone => (
                <ToneChip
                  key={tone.value}
                  value={tone.value}
                  label={tone.label}
                  selected={pageTone === tone.value}
                  onSelect={setPageTone}
                />
              ))}
            </View>
          </View>

          <Divider />

          <View style={styles.modeRow}>
            <View style={styles.rowBody}>
              <Text size={fontSize.body} leading={1}>
                Reading mode
              </Text>
              <Text size={12.5} leading={1.2} tone="muted">
                {READING_MODE_HINTS[readingMode]}
              </Text>
            </View>
            <SegmentedControl
              options={READING_MODES}
              value={readingMode}
              onChange={setReadingMode}
              variant="soft"
            />
          </View>

          <Divider />

          <View style={styles.row}>
            <View style={styles.rowBody}>
              <Text size={fontSize.body} leading={1}>
                Keep screen awake
              </Text>
              <Text size={12.5} leading={1.2} tone="muted">
                While the reader is open
              </Text>
            </View>
            <Toggle
              value={keepScreenAwake}
              onValueChange={setKeepScreenAwake}
              accessibilityLabel="Keep screen awake"
            />
          </View>
        </Card>
      </View>
    </ProfileSubScreenLayout>
  );
}

/**
 * A miniature of the app in each theme. Painted from the real palette, so it
 * can never drift from what the reader will actually get.
 */
const ThemePreview = memo(function ThemePreview({
  id,
  label,
  selected,
  onSelect,
}: {
  id: ThemePreference;
  label: string;
  selected: boolean;
  onSelect: (preference: ThemePreference) => void;
}) {
  const { colors } = useTheme();
  const handlePress = useCallback(() => onSelect(id), [id, onSelect]);

  const light = theme.light;
  const dark = theme.dark;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={handlePress}
      style={({ pressed }) => [styles.preview, pressed && styles.pressed]}>
      <View
        style={[
          styles.previewFrame,
          {
            borderColor: selected ? colors.primaryBright : colors.borderStrong,
            borderWidth: selected ? 2 : 1,
          },
        ]}>
        {id === 'system' ? (
          <View style={styles.previewSplit}>
            <View style={[styles.previewHalf, { backgroundColor: light.background }]} />
            <View style={[styles.previewHalf, { backgroundColor: dark.background }]} />
          </View>
        ) : (
          <PreviewContent palette={id === 'light' ? light : dark} />
        )}
      </View>
      <Text
        size={fontSize.caption}
        leading={1}
        weight={selected ? '600' : '500'}
        tone={selected ? 'primary' : 'soft'}>
        {label}
      </Text>
    </Pressable>
  );
});

function PreviewContent({ palette }: { palette: typeof theme.light | typeof theme.dark }) {
  return (
    <View style={[styles.previewBody, { backgroundColor: palette.background }]}>
      <View style={[styles.previewTitle, { backgroundColor: palette.primary }]} />
      <View style={[styles.previewLine, { backgroundColor: palette.border }]} />
      <View style={[styles.previewLine, styles.previewLineShort, { backgroundColor: palette.border }]} />
      <View style={[styles.previewButton, { backgroundColor: palette.primaryFill }]} />
    </View>
  );
}

/** The glyph drawn on each step — the ramp made visible, not the resulting size. */
const STEP_GLYPH_SIZE: Record<FontScale, number> = {
  small: 12,
  default: 15,
  large: 18,
  xlarge: 21,
};

/**
 * One step on the text-size ramp. The "A" is drawn at the step's own place on
 * that ramp — and, because `Text` is already scaled app-wide, the whole row
 * grows as the reader moves up it, which is the clearest possible confirmation
 * that the choice reaches beyond this card.
 */
const TextSizeStep = memo(function TextSizeStep({
  step,
  selected,
  onSelect,
}: {
  step: FontScale;
  selected: boolean;
  onSelect: (step: FontScale) => void;
}) {
  const { colors } = useTheme();
  const handlePress = useCallback(() => onSelect(step), [onSelect, step]);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${FONT_SCALES[step].label} text size`}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.scaleStep,
        {
          backgroundColor: selected ? colors.primaryFillSoft : 'transparent',
          borderColor: selected ? colors.primaryBright : colors.borderStrong,
          borderWidth: selected ? 2 : 1,
        },
        pressed && styles.pressed,
      ]}>
      <Text
        size={STEP_GLYPH_SIZE[step]}
        leading={1.1}
        weight={selected ? '600' : '400'}
        tone={selected ? 'primary' : 'soft'}>
        A
      </Text>
    </Pressable>
  );
});

const ToneChip = memo(function ToneChip({
  value,
  label,
  selected,
  onSelect,
}: {
  value: ReaderTone;
  label: string;
  selected: boolean;
  onSelect: (tone: ReaderTone) => void;
}) {
  const { colors } = useTheme();
  const handlePress = useCallback(() => onSelect(value), [onSelect, value]);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} page tone`}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.toneChip,
        {
          backgroundColor: readerTones[value].background,
          borderColor: selected ? colors.primaryBright : colors.borderStrong,
          borderWidth: selected ? 2 : 1,
        },
        pressed && styles.pressed,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  previews: {
    flexDirection: 'row',
    gap: 11,
  },
  preview: {
    flex: 1,
    alignItems: 'center',
    gap: 9,
  },
  previewFrame: {
    width: '100%',
    height: 112,
    borderRadius: 14,
    overflow: 'hidden',
  },
  previewSplit: {
    flex: 1,
    flexDirection: 'row',
  },
  previewHalf: {
    flex: 1,
  },
  previewBody: {
    flex: 1,
    padding: 9,
    gap: 5,
  },
  previewTitle: {
    height: 8,
    width: '60%',
    borderRadius: 4,
  },
  previewLine: {
    height: 6,
    borderRadius: 3,
  },
  previewLineShort: {
    width: '80%',
  },
  previewButton: {
    marginTop: 'auto',
    height: 20,
    borderRadius: 10,
  },
  section: {
    gap: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  // The segments need the full width, so this row stacks rather than sits side
  // by side like the others.
  modeRow: {
    gap: 12,
  },
  toneRow: {
    flexDirection: 'row',
    gap: 7,
  },
  toneChip: {
    width: 26,
    height: 26,
    borderRadius: 9,
  },
  scaleRow: {
    flexDirection: 'row',
    gap: 9,
  },
  scaleStep: {
    // Equal columns rather than fixed widths, so the row still fits when the
    // largest step widens the glyph inside it.
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  pressed: {
    opacity: 0.75,
  },
});
