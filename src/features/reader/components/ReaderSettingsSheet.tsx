import { memo, useCallback, useEffect, useState, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Bookmark, CornerDownLeft, Download, ZoomIn, ZoomOut } from 'lucide-react-native';

import {
  Divider,
  Icon,
  IconButton,
  Label,
  SegmentedControl,
  Sheet,
  SliderTrack,
  Text,
  TextField,
  type LucideIcon,
} from '@/components/ui';
import { READING_MODE_TAGS, READING_MODES, type ReadingMode } from '@/stores/themeStore';
import { readerTones, type ReaderTone } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

const TONES: { value: ReaderTone; label: string }[] = [
  { value: 'paper', label: 'Paper' },
  { value: 'sepia', label: 'Sepia' },
  { value: 'midnight', label: 'Midnight' },
];

export type ReaderSettingsSheetProps = {
  visible: boolean;
  onClose: () => void;
  tone: ReaderTone;
  onToneChange: (tone: ReaderTone) => void;
  /** Whether the book turns a page at a time or runs as one column. */
  readingMode: ReadingMode;
  onReadingModeChange: (mode: ReadingMode) => void;
  /** 0–1. Drives the page's own dimming overlay, not the OS brightness. */
  brightness: number;
  onBrightnessChange: (value: number) => void;
  zoomPercent: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onBookmark: () => void;
  /** Jumps the book to a page the reader typed. */
  onGoToPage: (page: number) => void;
  page: number;
  totalPages: number;
  onDownload: () => void;
  isDownloading?: boolean;
};

/**
 * The reading sheet.
 *
 * A PDF page cannot reflow, so this offers only what a PDF genuinely supports:
 * page tone, brightness, zoom, and the three actions worth reaching for
 * mid-chapter. No font size, no line height — promising those would be a lie.
 */
export const ReaderSettingsSheet = memo(function ReaderSettingsSheet({
  visible,
  onClose,
  tone,
  onToneChange,
  readingMode,
  onReadingModeChange,
  brightness,
  onBrightnessChange,
  zoomPercent,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onBookmark,
  onGoToPage,
  page,
  totalPages,
  onDownload,
  isDownloading = false,
}: ReaderSettingsSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Reading">
      <View style={styles.group}>
        <View style={styles.groupHeader}>
          <Label>Reading mode</Label>
          <Label tone="primary" tracking={0.8}>
            {READING_MODE_TAGS[readingMode]}
          </Label>
        </View>
        <SegmentedControl
          options={READING_MODES}
          value={readingMode}
          onChange={onReadingModeChange}
          variant="soft"
        />
      </View>

      <View style={styles.group}>
        <Label>Page tone</Label>
        <View style={styles.row}>
          {TONES.map(option => (
            <ToneSwatch
              key={option.value}
              value={option.value}
              label={option.label}
              selected={tone === option.value}
              onSelect={onToneChange}
            />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <View style={styles.groupHeader}>
          <Label>Brightness</Label>
          <Label tone="primary" tracking={0.8}>{`${Math.round(brightness * 100)}%`}</Label>
        </View>
        <BrightnessControl value={brightness} onChange={onBrightnessChange} />
      </View>

      <View style={styles.group}>
        <View style={styles.groupHeader}>
          <Label>Zoom</Label>
          <Label tone="primary" tracking={0.8}>{`${zoomPercent}%`}</Label>
        </View>
        <View style={styles.row}>
          <ZoomButton icon={ZoomOut} label="Zoom out" disabled={!canZoomOut} onPress={onZoomOut} />
          <ZoomButton icon={ZoomIn} label="Zoom in" disabled={!canZoomIn} onPress={onZoomIn} />
        </View>
      </View>

      <View style={styles.group}>
        <View style={styles.groupHeader}>
          <Label>Go to page</Label>
          {totalPages > 0 ? (
            <Label tone="primary" tracking={0.8}>{`1 – ${totalPages}`}</Label>
          ) : null}
        </View>
        <PageJump page={page} totalPages={totalPages} onGoToPage={onGoToPage} visible={visible} />
      </View>

      <Divider />

      <View style={styles.actions}>
        <SheetAction icon={Bookmark} label="Bookmark" onPress={onBookmark} />
        <SheetAction
          icon={Download}
          label={isDownloading ? 'Saving…' : 'Download'}
          onPress={onDownload}
          disabled={isDownloading}
        />
      </View>
    </Sheet>
  );
});

/**
 * The tone swatches paint their actual page colour, so the choice is made by
 * looking rather than by reading a label.
 */
const ToneSwatch = memo(function ToneSwatch({
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
  const preview = readerTones[value];

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.swatch,
        {
          backgroundColor: preview.background,
          borderColor: selected ? colors.primaryBright : colors.borderStrong,
          borderWidth: 2,
        },
        pressed && styles.pressed,
      ]}>
      <Text
        size={fontSize.captionSmall}
        leading={1}
        weight="500"
        tone="inherit"
        style={{ color: preview.ink }}>
        {label}
      </Text>
    </Pressable>
  );
});

/**
 * The page jump.
 *
 * A typed page number, confirmed either from the keyboard or from the button
 * beside it. The field starts on the page the reader is already on, and a
 * number outside the book is simply clamped rather than refused.
 */
const PageJump = memo(function PageJump({
  page,
  totalPages,
  onGoToPage,
  visible,
}: {
  page: number;
  totalPages: number;
  onGoToPage: (page: number) => void;
  visible: boolean;
}) {
  const [draft, setDraft] = useState(() => String(page));

  // Reopening the sheet offers the page the reader is on, not the last one
  // they typed.
  useEffect(() => {
    if (visible) setDraft(String(page));
  }, [page, visible]);

  const target = Number(draft.replace(/[^0-9]/g, ''));
  const valid = Number.isFinite(target) && target >= 1;

  const submit = useCallback(() => {
    if (!valid) return;
    const clamped = totalPages > 0 ? Math.min(target, totalPages) : target;
    onGoToPage(clamped);
  }, [onGoToPage, target, totalPages, valid]);

  return (
    <View style={styles.jump}>
      <View style={styles.jumpField}>
        <TextField
          value={draft}
          onChangeText={setDraft}
          keyboardType="number-pad"
          returnKeyType="go"
          maxLength={6}
          selectTextOnFocus
          accessibilityLabel="Page number"
          placeholder={totalPages > 0 ? `1 – ${totalPages}` : 'Page number'}
          onSubmitEditing={submit}
        />
      </View>
      <IconButton
        icon={CornerDownLeft}
        onPress={submit}
        disabled={!valid}
        buttonSize={50}
        style={!valid ? styles.disabled : undefined}
        accessibilityLabel="Go to page"
      />
    </View>
  );
});

/** Minimum brightness, so the reader can never dim the page to unreadable. */
const MIN_BRIGHTNESS = 0.15;

/** A tap-and-drag track. The width is captured on layout and read from a ref. */
const BrightnessControl = memo(function BrightnessControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const width = useRef(0);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    width.current = event.nativeEvent.layout.width;
  }, []);

  const setFromX = useCallback(
    (x: number) => {
      if (width.current > 0) {
        onChange(Math.min(1, Math.max(MIN_BRIGHTNESS, x / width.current)));
      }
    },
    [onChange],
  );

  return (
    <View
      onLayout={handleLayout}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Brightness"
      accessibilityValue={{ min: 15, max: 100, now: Math.round(value * 100) }}
      accessibilityActions={ADJUST_ACTIONS}
      onAccessibilityAction={event => {
        const step = event.nativeEvent.actionName === 'increment' ? 0.1 : -0.1;
        onChange(Math.min(1, Math.max(MIN_BRIGHTNESS, value + step)));
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={event => setFromX(event.nativeEvent.locationX)}
      onResponderMove={event => setFromX(event.nativeEvent.locationX)}
      style={styles.brightness}>
      <SliderTrack value={value} />
    </View>
  );
});

const ADJUST_ACTIONS = [{ name: 'increment' }, { name: 'decrement' }] as const;

const ZoomButton = memo(function ZoomButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.zoomButton,
        { backgroundColor: colors.controlAlt, borderColor: colors.border },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      <Icon icon={icon} size={16} tone={disabled ? 'faint' : 'soft'} />
      <Text size={fontSize.caption} leading={1} weight="500" tone={disabled ? 'faint' : 'soft'}>
        {label}
      </Text>
    </Pressable>
  );
});

const SheetAction = memo(function SheetAction({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.action, disabled && styles.disabled, pressed && styles.pressed]}>
      <View style={[styles.actionIcon, { backgroundColor: colors.primaryFillSoft }]}>
        <Icon icon={icon} size={16} tone="soft" strokeWidth={1.7} />
      </View>
      <Text size={11} leading={1} tone="muted">
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  group: {
    gap: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  brightness: {
    // A taller hit area than the 6pt track, so the drag is comfortable.
    paddingVertical: 8,
  },
  jump: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  jumpField: {
    flex: 1,
  },
  swatch: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButton: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  action: {
    alignItems: 'center',
    gap: 7,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.45,
  },
});
