import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Download, Highlighter, Minus, Plus, RotateCcw } from 'lucide-react-native';

import type { RootStackParamList } from '@/app/navigation/types';
import { Text } from '@/components/ui';
import type { BookPdfSource } from '@/constants/books';
import { ROUTES } from '@/constants/routes';
import { BookPageFlip, type BookPageFlipHandle } from '@/features/reader/components/BookPageFlip';
import { MAX_SCALE, MIN_SCALE, SCALE_STEP } from '@/features/reader/constants';
import { useHighlightMutation, useHighlights, useProgressMutation } from '@/hooks/useAccount';
import { downloadPdf, resolvePdfSource } from '@/services/pdf';
import { useAccess } from '@/lib/access';
import { palette } from '@/theme/palette';

type BookReaderRouteProp = RouteProp<RootStackParamList, 'BookReader'>;
type BookReaderNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BookReader'>;

const EDGE_MARGIN = 16;
const BACK_BUTTON_SIZE = 48;
const PAGE_NAV_SIZE = 40;
const DOCK_BUTTON_HEIGHT = 46;
const DOCK_WIDTH = 50;

// Continuous zoom (press-and-hold) tuning
const HOLD_INITIAL_DELAY = 320; // ms before continuous zoom kicks in
const HOLD_REPEAT_INTERVAL = 80; // ms between steps while held
const ZOOM_BADGE_HIDE_DELAY = 1000; // ms of inactivity before the % badge fades out

type GlassTokens = {
  fill: string;
  tint: string;
  border: string;
  rim: string;
  divider: string;
  shadow: string;
};

function getGlassTokens(isDark: boolean): GlassTokens {
  return isDark
    ? {
        fill: 'rgba(22, 28, 22, 0.88)',
        tint: 'rgba(255, 255, 255, 0.06)',
        border: 'rgba(255, 255, 255, 0.14)',
        rim: 'rgba(255, 255, 255, 0.22)',
        divider: 'rgba(255, 255, 255, 0.10)',
        shadow: 'rgba(0, 0, 0, 0.45)',
      }
    : {
        fill: 'rgba(255, 255, 255, 0.84)',
        tint: 'rgba(255, 255, 255, 0.42)',
        border: 'rgba(20, 40, 24, 0.08)',
        rim: 'rgba(255, 255, 255, 0.95)',
        divider: 'rgba(20, 40, 24, 0.08)',
        shadow: 'rgba(20, 40, 24, 0.16)',
      };
}

/* ---------------------------------- Glass ---------------------------------- */

type GlassSurfaceProps = {
  isDark: boolean;
  children: ReactNode;
  style?: object;
  radius?: number;
};

function GlassSurface({ isDark, children, style, radius = 999 }: GlassSurfaceProps) {
  const glass = getGlassTokens(isDark);

  return (
    <View
      style={[
        styles.glassSurface,
        {
          borderRadius: radius,
          backgroundColor: glass.fill,
          borderColor: glass.border,
          shadowColor: glass.shadow,
        },
        style,
      ]}>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            backgroundColor: glass.tint,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.glassHighlight,
          {
            borderRadius: Math.max(radius - 1, 0),
            backgroundColor: glass.rim,
          },
        ]}
      />
      {children}
    </View>
  );
}

/* ------------------------------- Icon button -------------------------------- */

type GlassIconButtonProps = {
  onPress: () => void;
  onHoldStep?: () => void; // called repeatedly while pressed & held
  disabled?: boolean;
  accessibilityLabel: string;
  children: ReactNode;
  height?: number;
};

function GlassIconButton({
  onPress,
  onHoldStep,
  disabled = false,
  accessibilityLabel,
  children,
  height = DOCK_BUTTON_HEIGHT,
}: GlassIconButtonProps) {
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

  const handlePressIn = useCallback(() => {
    Animated.spring(pressScale, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();

    if (onHoldStep) {
      holdTimeout.current = setTimeout(() => {
        holdInterval.current = setInterval(() => {
          onHoldStep();
        }, HOLD_REPEAT_INTERVAL);
      }, HOLD_INITIAL_DELAY);
    }
  }, [onHoldStep, pressScale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
    clearHold();
  }, [clearHold, pressScale]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.glassIconButton, { height, opacity: disabled ? 0.32 : 1 }]}>
      <Animated.View style={{ transform: [{ scale: pressScale }] }}>{children}</Animated.View>
    </Pressable>
  );
}

/* ---------------------------------- Chrome ----------------------------------- */

type ReaderChromeProps = {
  isDark: boolean;
  iconColor: string;
  page: number;
  totalPages: number;
  hasError: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
  canReset: boolean;
  zoomPercent: number;
  zoomBadgeOpacity: Animated.Value;
  onBack: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onDownload: () => void;
  onHighlight: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  isDownloading: boolean;
  insetTop: number;
  insetRight: number;
  insetBottom: number;
  insetLeft: number;
};

function ReaderChrome({
  isDark,
  iconColor,
  page,
  totalPages,
  hasError,
  canZoomIn,
  canZoomOut,
  canReset,
  zoomPercent,
  zoomBadgeOpacity,
  onBack,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onDownload,
  onHighlight,
  onPrevPage,
  onNextPage,
  isDownloading,
  insetTop,
  insetRight,
  insetBottom,
  insetLeft,
}: ReaderChromeProps) {
  const glass = getGlassTokens(isDark);

  return (
    <View
      pointerEvents="box-none"
      style={[
        StyleSheet.absoluteFill,
        styles.chromeRoot,
        {
          paddingTop: insetTop + EDGE_MARGIN,
          paddingRight: insetRight + EDGE_MARGIN,
          paddingBottom: insetBottom + EDGE_MARGIN,
          paddingLeft: insetLeft + EDGE_MARGIN,
        },
      ]}>
      <View pointerEvents="box-none" style={styles.chromeColumn}>
        <View style={styles.leftCluster}>
          <GlassSurface isDark={isDark} radius={BACK_BUTTON_SIZE / 2} style={styles.backButton}>
            <GlassIconButton
              onPress={onBack}
              accessibilityLabel="Close reader"
              height={BACK_BUTTON_SIZE}>
              <ChevronLeft size={22} color={iconColor} strokeWidth={2.25} />
            </GlassIconButton>
          </GlassSurface>
          <GlassSurface isDark={isDark} radius={BACK_BUTTON_SIZE / 2} style={styles.toolButton}>
            <GlassIconButton
              onPress={onDownload}
              disabled={isDownloading}
              accessibilityLabel="Download for offline reading"
              height={BACK_BUTTON_SIZE}>
              <Download size={20} color={iconColor} strokeWidth={2.25} />
            </GlassIconButton>
          </GlassSurface>
          <GlassSurface isDark={isDark} radius={BACK_BUTTON_SIZE / 2} style={styles.toolButton}>
            <GlassIconButton
              onPress={onHighlight}
              accessibilityLabel="Save current page highlight"
              height={BACK_BUTTON_SIZE}>
              <Highlighter size={20} color={iconColor} strokeWidth={2.25} />
            </GlassIconButton>
          </GlassSurface>
        </View>

        <View pointerEvents="box-none" style={styles.bottomCluster}>
          {totalPages > 0 ? (
            <View style={styles.pageNav}>
              <GlassSurface isDark={isDark} radius={PAGE_NAV_SIZE / 2} style={styles.pageNavButton}>
                <GlassIconButton
                  onPress={onPrevPage}
                  disabled={hasError || page <= 1}
                  accessibilityLabel="Previous page"
                  height={PAGE_NAV_SIZE}>
                  <ChevronLeft size={20} color={iconColor} strokeWidth={2.25} />
                </GlassIconButton>
              </GlassSurface>

              <GlassSurface isDark={isDark} style={styles.pagePill}>
                <Text className="px-3.5 py-2 text-[12px] font-semibold tabular-nums text-app-ink dark:text-app-ink-dark">
                  {page} / {totalPages}
                </Text>
              </GlassSurface>

              <GlassSurface isDark={isDark} radius={PAGE_NAV_SIZE / 2} style={styles.pageNavButton}>
                <GlassIconButton
                  onPress={onNextPage}
                  disabled={hasError || page >= totalPages}
                  accessibilityLabel="Next page"
                  height={PAGE_NAV_SIZE}>
                  <ChevronRight size={20} color={iconColor} strokeWidth={2.25} />
                </GlassIconButton>
              </GlassSurface>
            </View>
          ) : null}

          <View pointerEvents="box-none" style={styles.zoomCluster}>
            <Animated.View
              pointerEvents="none"
              style={[styles.zoomBadgeWrap, { opacity: zoomBadgeOpacity }]}>
              <GlassSurface isDark={isDark} style={styles.zoomBadge}>
                <Text className="px-3 py-1.5 text-[11px] font-semibold tabular-nums text-app-ink dark:text-app-ink-dark">
                  {zoomPercent}%
                </Text>
              </GlassSurface>
            </Animated.View>

            <GlassSurface isDark={isDark} radius={DOCK_WIDTH / 2} style={styles.zoomDock}>
              <GlassIconButton
                onPress={onZoomIn}
                onHoldStep={onZoomIn}
                disabled={!canZoomIn || hasError}
                accessibilityLabel="Zoom in">
                <Plus size={20} color={iconColor} strokeWidth={2.25} />
              </GlassIconButton>

              <View style={[styles.dockDivider, { backgroundColor: glass.divider }]} />

              <GlassIconButton
                onPress={onResetZoom}
                disabled={!canReset || hasError}
                accessibilityLabel="Reset zoom">
                <RotateCcw size={17} color={iconColor} strokeWidth={2.25} />
              </GlassIconButton>

              <View style={[styles.dockDivider, { backgroundColor: glass.divider }]} />

              <GlassIconButton
                onPress={onZoomOut}
                onHoldStep={onZoomOut}
                disabled={!canZoomOut || hasError}
                accessibilityLabel="Zoom out">
                <Minus size={20} color={iconColor} strokeWidth={2.25} />
              </GlassIconButton>
            </GlassSurface>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ---------------------------------- Screen ------------------------------------ */

export function BookReaderScreen() {
  const navigation = useNavigation<BookReaderNavigationProp>();
  const route = useRoute<BookReaderRouteProp>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const [pdfSource, setPdfSource] = useState<BookPdfSource | null>(null);
  const [sourceError, setSourceError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const scaleRef = useRef(1);
  const scaleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [controlScale, setControlScale] = useState(MIN_SCALE);
  const [scaleSnapshot, setScaleSnapshot] = useState(MIN_SCALE);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const { canOpenBooks, isAuthenticated, isSubscriptionLoading } = useAccess();
  const progressMutation = useProgressMutation();
  const highlightMutation = useHighlightMutation(route.params.bookId);
  useHighlights(route.params.bookId);
  const pendingProgress = useRef<{ page: number; totalPages: number } | null>(null);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flipRef = useRef<BookPageFlipHandle>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigation.replace(ROUTES.LOGIN, { returnTo: { bookId: route.params.bookId } });
      return;
    }
    if (isSubscriptionLoading) {
      return;
    }
    if (!canOpenBooks) {
      navigation.replace(ROUTES.BOOK_DETAIL, { bookId: route.params.bookId });
      return;
    }

    let active = true;
    setPdfSource(null);
    setSourceError(false);
    setPage(1);
    setTotalPages(0);
    setIsLoading(true);
    setHasError(false);
    scaleRef.current = MIN_SCALE;
    setControlScale(MIN_SCALE);
    setScaleSnapshot(MIN_SCALE);
    void resolvePdfSource(route.params.bookId, { allowDevBundle: true })
      .then(source => {
        if (active) setPdfSource(source);
      })
      .catch(() => {
        if (active) {
          setSourceError(true);
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [
    canOpenBooks,
    isAuthenticated,
    isSubscriptionLoading,
    navigation,
    route.params.bookId,
  ]);

  const flushProgress = useCallback(() => {
    const value = pendingProgress.current;
    if (!value?.totalPages) return;
    progressMutation.mutate({ bookId: route.params.bookId, ...value });
    pendingProgress.current = null;
  }, [progressMutation, route.params.bookId]);

  useEffect(() => () => {
    if (progressTimer.current) {
      clearTimeout(progressTimer.current);
    }
    flushProgress();
  }, [flushProgress]);

  // Live zoom % badge — fades in on change, fades out after inactivity
  const zoomBadgeOpacity = useRef(new Animated.Value(0)).current;
  const zoomBadgeHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashZoomBadge = useCallback(() => {
    if (zoomBadgeHideTimer.current) {
      clearTimeout(zoomBadgeHideTimer.current);
    }
    Animated.timing(zoomBadgeOpacity, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
    zoomBadgeHideTimer.current = setTimeout(() => {
      Animated.timing(zoomBadgeOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }, ZOOM_BADGE_HIDE_DELAY);
  }, [zoomBadgeOpacity]);

  useEffect(() => {
    return () => {
      if (zoomBadgeHideTimer.current) {
        clearTimeout(zoomBadgeHideTimer.current);
      }
    };
  }, []);

  const handleScaleChanged = useCallback(
    (scale: number) => {
      scaleRef.current = scale;

      if (scaleDebounceRef.current) {
        clearTimeout(scaleDebounceRef.current);
      }

      scaleDebounceRef.current = setTimeout(() => {
        setScaleSnapshot(scale);
      }, 120);

      flashZoomBadge();
    },
    [flashZoomBadge]
  );

  useEffect(() => {
    return () => {
      if (scaleDebounceRef.current) {
        clearTimeout(scaleDebounceRef.current);
      }
    };
  }, []);

  const handleLoadComplete = useCallback((numberOfPages: number) => {
    setTotalPages(numberOfPages);
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handlePageChanged = useCallback((currentPage: number, numberOfPages: number) => {
    setPage(currentPage);
    setTotalPages(numberOfPages);
    pendingProgress.current = { page: currentPage, totalPages: numberOfPages };
    if (progressTimer.current) {
      clearTimeout(progressTimer.current);
    }
    progressTimer.current = setTimeout(flushProgress, 1500);
  }, [flushProgress]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
  }, []);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      const uri = await downloadPdf(route.params.bookId);
      setPdfSource({ uri, cache: true, cacheFileName: `${route.params.bookId}.pdf` });
    } catch {
      // Keep the open document visible if an offline download fails.
    } finally {
      setIsDownloading(false);
    }
  }, [route.params.bookId]);

  const handleHighlight = useCallback(() => {
    if (page > 0) {
      highlightMutation.mutate(page);
    }
  }, [highlightMutation, page]);

  const applyScale = useCallback(
    (next: number) => {
      const clamped = Number(Math.min(Math.max(next, MIN_SCALE), MAX_SCALE).toFixed(2));
      scaleRef.current = clamped;
      setScaleSnapshot(clamped);
      setControlScale(clamped);
      flashZoomBadge();
    },
    [flashZoomBadge]
  );

  const handleZoomIn = useCallback(() => {
    applyScale(scaleRef.current + SCALE_STEP);
  }, [applyScale]);

  const handleZoomOut = useCallback(() => {
    applyScale(scaleRef.current - SCALE_STEP);
  }, [applyScale]);

  const handleResetZoom = useCallback(() => {
    if (scaleRef.current === MIN_SCALE) return;
    applyScale(MIN_SCALE);
  }, [applyScale]);

  const handlePrevPage = useCallback(() => {
    flipRef.current?.turn(-1);
  }, []);

  const handleNextPage = useCallback(() => {
    flipRef.current?.turn(1);
  }, []);

  const iconColor = isDark ? palette.chartreuse : palette.green;
  const canZoomOut = scaleSnapshot > MIN_SCALE;
  const canZoomIn = scaleSnapshot < MAX_SCALE;
  const canReset = scaleSnapshot !== MIN_SCALE;
  const zoomPercent = Math.round(scaleSnapshot * 100);

  return (
    <View className="flex-1 bg-[#ECECEB] dark:bg-[#101410]">
      {hasError || sourceError ? (
        <View
          className="flex-1 items-center justify-center px-8"
          style={{
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          }}>
          <Text className="text-center text-[15px] text-app-muted dark:text-app-muted-dark">
            Unable to open this book. An active subscription is required.
          </Text>
        </View>
      ) : pdfSource ? (
        <BookPageFlip
          ref={flipRef}
          key={route.params.bookId}
          source={pdfSource}
          scale={controlScale}
          onLoadComplete={handleLoadComplete}
          onError={handleError}
          onPageChanged={handlePageChanged}
          onScaleChanged={handleScaleChanged}
          onApplyScale={applyScale}
          onResetZoom={handleResetZoom}
        />
      ) : null}

      <ReaderChrome
        isDark={isDark}
        iconColor={iconColor}
        page={page}
        totalPages={totalPages}
        hasError={hasError}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        canReset={canReset}
        zoomPercent={zoomPercent}
        zoomBadgeOpacity={zoomBadgeOpacity}
        onBack={() => navigation.goBack()}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onDownload={() => { void handleDownload(); }}
        onHighlight={handleHighlight}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        isDownloading={isDownloading}
        insetTop={insets.top}
        insetRight={insets.right}
        insetBottom={insets.bottom}
        insetLeft={insets.left}
      />

      {isLoading && !hasError ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.loaderOverlay]}
          className="items-center justify-center bg-[#ECECEB]/70 dark:bg-[#101410]/70">
          <ActivityIndicator color={iconColor} size="large" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chromeRoot: {
    zIndex: 50,
    elevation: 24,
  },
  loaderOverlay: {
    zIndex: 20,
    elevation: 8,
  },
  chromeColumn: {
    flex: 1,
    justifyContent: 'space-between',
  },
  leftCluster: {
    alignSelf: 'flex-start',
    gap: 10,
  },
  bottomCluster: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    gap: 10,
  },
  zoomCluster: {
    alignItems: 'center',
    gap: 8,
  },
  glassSurface: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 24,
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    height: 1,
    opacity: 0.6,
  },
  glassIconButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    width: BACK_BUTTON_SIZE,
    height: BACK_BUTTON_SIZE,
    alignSelf: 'flex-start',
  },
  toolButton: {
    width: BACK_BUTTON_SIZE,
    height: BACK_BUTTON_SIZE,
    alignSelf: 'flex-start',
  },
  pageNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageNavButton: {
    width: PAGE_NAV_SIZE,
    height: PAGE_NAV_SIZE,
  },
  pagePill: {
    minWidth: 72,
    alignItems: 'center',
  },
  zoomBadgeWrap: {
    alignSelf: 'center',
  },
  zoomBadge: {
    minWidth: 44,
    alignItems: 'center',
  },
  zoomDock: {
    width: DOCK_WIDTH,
    overflow: 'hidden',
  },
  dockDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
  },
});