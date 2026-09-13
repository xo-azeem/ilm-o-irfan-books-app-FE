import {
  memo,
  useCallback,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import {
  Bookmark,
  CornerDownLeft,
  Download,
  Minus,
  Plus,
  Sun,
  SunDim,
} from 'lucide-react-native';

import {
  Icon,
  IconButton,
  Label,
  SaveGlyph,
  SegmentedControl,
  Sheet,
  SliderTrack,
  Text,
  TextField,
  useSavePhase,
  type LucideIcon,
} from '@/components/ui';
import {
  READING_MODE_HINTS,
  READING_MODE_TAGS,
  READING_MODES,
  type ReadingMode,
} from '@/stores/themeStore';
import { readerTones, type ReaderTone } from '@/theme/palette';
import { fontSize } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

const TONES: { value: ReaderTone; label: string }[] = [
  { value: 'paper', label: 'Paper' },
  { value: 'sepia', label: 'Sepia' },
  { value: 'midnight', label: 'Midnight' },
];

/** How long the bookmark tile's tick stays before the glyph returns. */
const TICK_HOLD_MS = 1100;

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
  /** Whether the page in view is already bookmarked — the action toggles. */
  isBookmarked?: boolean;
  /** The bookmark is on its way to the server; the tile spins meanwhile. */
  isBookmarking?: boolean;
  /** Jumps the book to a page the reader typed. */
  onGoToPage: (page: number) => void;
  page: number;
  totalPages: number;
  /** Keeps the book offline — or, once it is kept, offers to remove it. */
  onDownload: () => void;
  isDownloading?: boolean;
  /** The book is sealed on this device and listed on the Offline shelf. */
  isDownloaded?: boolean;
  /** 0–100 while `isDownloading`; null when there is nothing to report. */
  downloadProgress?: number | null;
};

/**
 * The reading sheet.
 *
 * A PDF page cannot reflow, so this offers only what a PDF genuinely supports:
 * page tone, brightness, zoom, and the two actions worth reaching for
 * mid-chapter, which sit first. No font size, no line height — promising
 * those would be a lie.
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
  isBookmarked = false,
  isBookmarking = false,
  onGoToPage,
  page,
  totalPages,
  onDownload,
  isDownloading = false,
  isDownloaded = false,
  downloadProgress = null,
}: ReaderSettingsSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Reading"
      headerAction={
        totalPages > 0 ? (
          <Label tracking={0.9}>{`P. ${page} OF ${totalPages}`}</Label>
        ) : null
      }
    >
      <View style={styles.tiles}>
        <BookmarkTile
          page={page}
          saved={isBookmarked}
          saving={isBookmarking}
          onPress={onBookmark}
        />
        <DownloadTile
          downloaded={isDownloaded}
          downloading={isDownloading}
          progress={downloadProgress}
          onPress={onDownload}
        />
      </View>

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
        <Text size={fontSize.captionSmall} leading={1.4} tone="faint">
          {READING_MODE_HINTS[readingMode]}
        </Text>
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
          <Label
            tone="primary"
            tracking={0.8}
          >{`${Math.round(brightness * 100)}%`}</Label>
        </View>
        <View style={styles.brightnessRow}>
          <Icon icon={SunDim} size={15} tone="faint" />
          <BrightnessControl value={brightness} onChange={onBrightnessChange} />
          <Icon icon={Sun} size={15} tone="faint" />
        </View>
      </View>

      <View style={styles.groupHeader}>
        <Label>Zoom</Label>
        <View style={styles.stepper}>
          <StepButton
            icon={Minus}
            label="Zoom out"
            disabled={!canZoomOut}
            onPress={onZoomOut}
          />
          <Text
            size={fontSize.caption}
            leading={1}
            weight="600"
            tone="soft"
            align="center"
            style={styles.stepperValue}
          >
            {`${zoomPercent}%`}
          </Text>
          <StepButton
            icon={Plus}
            label="Zoom in"
            disabled={!canZoomIn}
            onPress={onZoomIn}
          />
        </View>
      </View>

      <View style={styles.group}>
        <View style={styles.groupHeader}>
          <Label>Go to page</Label>
          {totalPages > 0 ? (
            <Label tone="primary" tracking={0.8}>{`1 – ${totalPages}`}</Label>
          ) : null}
        </View>
        <PageJump
          page={page}
          totalPages={totalPages}
          onGoToPage={onGoToPage}
          visible={visible}
        />
      </View>
    </Sheet>
  );
});

/**
 * One of the two actions at the head of the sheet — a glyph in a soft square,
 * a name, and a line under it saying what the action leaves behind.
 */
const ActionTile = memo(function ActionTile({
  icon,
  label,
  detail,
  busy = false,
  active = false,
  glyph,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
  busy?: boolean;
  /** Tints the tile green — the action has already been taken. */
  active?: boolean;
  /** Replaces the plain icon, for a tile that animates its own state. */
  glyph?: ReactNode;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy, selected: active }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: active ? colors.primaryFillSoft : colors.controlAlt,
          borderColor: active ? colors.selectedBorder : colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.tileGlyph,
          {
            backgroundColor: active
              ? colors.primaryFill
              : colors.primaryFillSoft,
          },
        ]}
      >
        {glyph ??
          (busy ? (
            <ActivityIndicator size="small" color={colors.inkSoft} />
          ) : (
            <Icon icon={icon} size={16} tone="soft" strokeWidth={1.7} />
          ))}
      </View>
      <View style={styles.tileText}>
        <Text
          size={fontSize.caption}
          leading={1.2}
          weight="600"
          tone={active ? 'primary' : 'ink'}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text
          size={fontSize.captionSmall - 1}
          leading={1.3}
          tone="faint"
          numberOfLines={1}
        >
          {detail}
        </Text>
      </View>
    </Pressable>
  );
});

/**
 * The bookmark tile. The glyph spins while the toggle is away and draws its
 * tick as a bookmark lands, then settles on the filled mark.
 */
const BookmarkTile = memo(function BookmarkTile({
  page,
  saved,
  saving,
  onPress,
}: {
  page: number;
  saved: boolean;
  saving: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const phase = useSavePhase(saving, saved, TICK_HOLD_MS);
  const showSaved = saved && phase !== 'saving';

  return (
    <ActionTile
      icon={Bookmark}
      label={showSaved ? 'Bookmarked' : 'Bookmark'}
      detail={page > 0 ? `Page ${page}` : 'This page'}
      busy={phase === 'saving'}
      active={showSaved}
      glyph={
        <SaveGlyph
          phase={phase}
          saved={showSaved}
          size={16}
          color={showSaved ? colors.primarySoft : colors.inkSoft}
        />
      }
      onPress={onPress}
    />
  );
});

/**
 * The download tile. Spins with a live percentage while the book is sealed
 * onto the device, draws its tick as it lands, then rests as "Downloaded";
 * a tap on a downloaded book offers to remove it.
 */
const DownloadTile = memo(function DownloadTile({
  downloaded,
  downloading,
  progress,
  onPress,
}: {
  downloaded: boolean;
  downloading: boolean;
  progress: number | null;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const phase = useSavePhase(downloading, downloaded, TICK_HOLD_MS);
  const showKept = downloaded && phase !== 'saving';

  return (
    <ActionTile
      icon={Download}
      label={
        phase === 'saving'
          ? 'Downloading…'
          : showKept
            ? 'Downloaded'
            : 'Download'
      }
      detail={
        phase === 'saving'
          ? progress != null
            ? `${progress}%`
            : 'Preparing…'
          : showKept
            ? 'On this device'
            : 'Keep a copy offline'
      }
      busy={phase === 'saving'}
      active={showKept}
      glyph={
        <SaveGlyph
          icon={Download}
          phase={phase}
          saved={false}
          size={16}
          color={showKept ? colors.primarySoft : colors.inkSoft}
        />
      }
      onPress={onPress}
    />
  );
});

/**
 * The tone swatches paint their actual page colour, so the choice is made by
 * looking rather than by reading a label. The chosen one carries a green dot.
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
          borderColor: selected ? colors.primaryBright : colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      {selected ? (
        <View
          style={[styles.swatchDot, { backgroundColor: colors.primaryBright }]}
        />
      ) : null}
      <Text
        size={fontSize.captionSmall}
        leading={1}
        weight={selected ? '600' : '500'}
        tone="inherit"
        style={{ color: preview.ink }}
      >
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
      style={styles.brightness}
    >
      <SliderTrack value={value} />
    </View>
  );
});

const ADJUST_ACTIONS = [{ name: 'increment' }, { name: 'decrement' }] as const;

/** One end of the zoom stepper. */
const StepButton = memo(function StepButton({
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
      hitSlop={6}
      style={({ pressed }) => [
        styles.stepButton,
        { backgroundColor: colors.controlAlt, borderColor: colors.border },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Icon
        icon={icon}
        size={14}
        tone={disabled ? 'faint' : 'soft'}
        strokeWidth={2.2}
      />
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
  tiles: {
    flexDirection: 'row',
    gap: 10,
  },
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  tileGlyph: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    flex: 1,
    gap: 3,
  },
  brightnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brightness: {
    flex: 1,
    // A taller hit area than the 6pt track, so the drag is comfortable.
    paddingVertical: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperValue: {
    minWidth: 44,
  },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
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
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.45,
  },
});
