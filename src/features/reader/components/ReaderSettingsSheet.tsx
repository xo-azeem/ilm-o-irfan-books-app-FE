import { memo, useCallback, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Bookmark, Download, Hash, ZoomIn, ZoomOut } from 'lucide-react-native';

import {
  Divider,
  Icon,
  Label,
  Sheet,
  SliderTrack,
  Text,
  type LucideIcon,
} from '@/components/ui';
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
  /** 0–1. Drives the page's own dimming overlay, not the OS brightness. */
  brightness: number;
  onBrightnessChange: (value: number) => void;
  zoomPercent: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onBookmark: () => void;
  onGoToPage: () => void;
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
  brightness,
  onBrightnessChange,
  zoomPercent,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onBookmark,
  onGoToPage,
  onDownload,
  isDownloading = false,
}: ReaderSettingsSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Reading" scrollable={false}>
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

      <Divider />

      <View style={styles.actions}>
        <SheetAction icon={Bookmark} label="Bookmark" onPress={onBookmark} />
        <SheetAction icon={Hash} label="Go to page" onPress={onGoToPage} />
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
