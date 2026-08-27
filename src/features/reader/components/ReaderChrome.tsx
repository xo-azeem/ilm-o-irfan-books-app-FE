import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  EllipsisVertical,
  Highlighter,
  Minus,
  Plus,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

const HEADER_ROW = 44;
const FOOTER_ROW = 48;
const ICON_HIT = 40;
const HOLD_INITIAL_DELAY = 320;
const HOLD_REPEAT_INTERVAL = 80;

type HoldIconButtonProps = {
  onPress: () => void;
  onHoldStep?: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  children: ReactNode;
};

const HoldIconButton = memo(function HoldIconButton({
  onPress,
  onHoldStep,
  disabled = false,
  accessibilityLabel,
  children,
}: HoldIconButtonProps) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const holdTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearHold = useCallback(() => {
    if (holdTimeout.current) {
      clearTimeout(holdTimeout.current);
      holdTimeout.current = null;
    }
    if (holdInterval.current) {
      clearInterval(holdInterval.current);
      holdInterval.current = null;
    }
  }, []);

  useEffect(() => () => clearHold(), [clearHold]);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => {
        Animated.spring(pressScale, {
          toValue: 0.88,
          useNativeDriver: true,
          speed: 40,
          bounciness: 4,
        }).start();
        if (!onHoldStep) return;
        holdTimeout.current = setTimeout(() => {
          holdInterval.current = setInterval(onHoldStep, HOLD_REPEAT_INTERVAL);
        }, HOLD_INITIAL_DELAY);
      }}
      onPressOut={() => {
        Animated.spring(pressScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 40,
          bounciness: 4,
        }).start();
        clearHold();
      }}
      style={[styles.iconHit, { opacity: disabled ? 0.28 : 1 }]}>
      <Animated.View style={{ transform: [{ scale: pressScale }] }}>{children}</Animated.View>
    </Pressable>
  );
});

type MenuItemProps = {
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  onPress: () => void;
};

function MenuItem({ icon: Icon, label, disabled, onPress }: MenuItemProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.menuItem,
        { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 },
      ]}>
      <Icon size={16} color={colors.ink} strokeWidth={2} />
      <Text className="text-[14px] font-medium text-app-ink dark:text-app-ink-dark">{label}</Text>
    </Pressable>
  );
}

export type ReaderChromeProps = {
  title: string;
  page: number;
  totalPages: number;
  hasError: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
  canReset: boolean;
  zoomPercent: number;
  isDownloading: boolean;
  children: ReactNode;
  onBack: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onDownload: () => void;
  onHighlight: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
};

export const ReaderChrome = memo(function ReaderChrome({
  title,
  page,
  totalPages,
  hasError,
  canZoomIn,
  canZoomOut,
  canReset,
  zoomPercent,
  isDownloading,
  children,
  onBack,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onDownload,
  onHighlight,
  onPrevPage,
  onNextPage,
}: ReaderChromeProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);

  const bottomPad = Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 8);
  const pageLabel = totalPages > 0 ? `${page} / ${totalPages}` : '—';
  const atFirst = hasError || page <= 1;
  const atLast = hasError || totalPages <= 0 || page >= totalPages;

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const handleDownload = useCallback(() => {
    closeMenu();
    onDownload();
  }, [closeMenu, onDownload]);

  const handleHighlight = useCallback(() => {
    closeMenu();
    onHighlight();
  }, [closeMenu, onHighlight]);

  return (
    <View style={styles.shell}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            backgroundColor: colors.chrome,
            borderBottomColor: colors.chromeBorder,
          },
        ]}>
        <View style={styles.headerRow}>
          <HoldIconButton onPress={onBack} accessibilityLabel="Close reader">
            <ChevronLeft size={22} color={colors.ink} strokeWidth={2.1} />
          </HoldIconButton>

          <View style={styles.titleBlock}>
            <Text
              numberOfLines={1}
              className="text-[14px] font-semibold tracking-snug text-app-ink dark:text-app-ink-dark">
              {title}
            </Text>
            <Text className="text-[11px] font-medium tabular-nums text-app-muted dark:text-app-muted-dark">
              {pageLabel}
            </Text>
          </View>

          <HoldIconButton
            onPress={() => setMenuOpen(open => !open)}
            accessibilityLabel="More options">
            <EllipsisVertical size={18} color={colors.ink} strokeWidth={2.1} />
          </HoldIconButton>
        </View>
      </View>

      <View style={styles.stage}>{children}</View>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: bottomPad,
            backgroundColor: colors.chrome,
            borderTopColor: colors.chromeBorder,
          },
        ]}>
        <View style={styles.footerRow}>
          <HoldIconButton
            onPress={onPrevPage}
            disabled={atFirst}
            accessibilityLabel="Previous page">
            <ChevronLeft size={22} color={colors.ink} strokeWidth={2.1} />
          </HoldIconButton>

          <View style={styles.zoomGroup}>
            <HoldIconButton
              onPress={onZoomOut}
              onHoldStep={onZoomOut}
              disabled={!canZoomOut || hasError}
              accessibilityLabel="Zoom out">
              <Minus size={18} color={colors.ink} strokeWidth={2.2} />
            </HoldIconButton>

            <Text
              className="min-w-[40px] text-center text-[12px] font-semibold tabular-nums text-app-muted dark:text-app-muted-dark"
              accessibilityLabel={`Zoom ${zoomPercent} percent`}>
              {zoomPercent}%
            </Text>

            <HoldIconButton
              onPress={onZoomIn}
              onHoldStep={onZoomIn}
              disabled={!canZoomIn || hasError}
              accessibilityLabel="Zoom in">
              <Plus size={18} color={colors.ink} strokeWidth={2.2} />
            </HoldIconButton>

            <HoldIconButton
              onPress={onResetZoom}
              disabled={!canReset || hasError}
              accessibilityLabel="Reset zoom">
              <RotateCcw size={16} color={colors.ink} strokeWidth={2.1} />
            </HoldIconButton>
          </View>

          <HoldIconButton
            onPress={onNextPage}
            disabled={atLast}
            accessibilityLabel="Next page">
            <ChevronRight size={22} color={colors.ink} strokeWidth={2.1} />
          </HoldIconButton>
        </View>
      </View>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
        statusBarTranslucent>
        <View style={styles.menuRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} accessibilityLabel="Dismiss menu" />
          <View
            style={[
              styles.menu,
              {
                top: insets.top + HEADER_ROW - 4,
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                shadowColor: colors.ink,
              },
            ]}>
            <MenuItem
              icon={Download}
              label={isDownloading ? 'Downloading…' : 'Download'}
              disabled={isDownloading}
              onPress={handleDownload}
            />
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <MenuItem icon={Highlighter} label="Highlight this page" onPress={handleHighlight} />
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  stage: {
    flex: 1,
    zIndex: 0,
  },
  header: {
    zIndex: 40,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    height: HEADER_ROW,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 4,
    gap: 1,
  },
  footer: {
    zIndex: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerRow: {
    height: FOOTER_ROW,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  zoomGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconHit: {
    width: ICON_HIT,
    height: ICON_HIT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRoot: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    right: 10,
    minWidth: 196,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  menuItem: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
  },
});
