import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import Pdf, { type PdfRef } from 'react-native-pdf';

import type { BookPdfSource } from '@/constants/books';
import { MAX_SCALE, MIN_SCALE, PAGE_FILL_LIMIT } from '@/features/reader/constants';
import { useThemeStore } from '@/stores/themeStore';
import { useReaderSurface } from '@/features/reader/useReaderSurface';
import { usePageTurn, type TurnDirection } from '@/features/reader/usePageTurn';

export type BookPageFlipHandle = {
  turn: (dir: TurnDirection) => void;
  /** Jumps to a page, under the stage's own dip. */
  goTo: (page: number) => void;
};

type BookPageFlipProps = {
  source: BookPdfSource;
  /** The reader's chosen zoom. The only zoom the controls know about. */
  scale: number;
  onLoadComplete: (totalPages: number) => void;
  onLoadProgress?: (percent: number) => void;
  onError: (message?: string) => void;
  onPageChanged: (page: number, totalPages: number) => void;
  /** A tap on the page, which the screen uses to show its chrome. */
  onSingleTap?: () => void;
};

/** Past this, the reader is looking at part of a page rather than at a page. */
const ZOOM_EPS = 0.02;

/** The gap between pages while scrolling. Enough to see the seam, no more. */
const PAGE_GAP = 8;

function clampScale(value: number) {
  if (!Number.isFinite(value)) return MIN_SCALE;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

type Box = { width: number; height: number };

/**
 * How large to draw the page, given the shape of the page and of the screen.
 *
 * The page is drawn as wide as the frame at least, and wider — up to the fill
 * limit — while that buys height. Anything past the frame's edge is the page's
 * margin, and the stage clips it.
 */
function pageBox(frame: Box, aspect: number): Box | null {
  if (frame.width <= 0 || frame.height <= 0 || !Number.isFinite(aspect) || aspect <= 0) {
    return null;
  }

  // What it would take to fill the height outright, and what we will allow.
  const toFill = (frame.height * aspect) / frame.width;
  const fill = Math.min(Math.max(toFill, 1), PAGE_FILL_LIMIT);
  const width = frame.width * fill;
  const height = Math.min(frame.height, width / aspect);

  // A page wider than it is tall fits the frame with room to spare, and is
  // better left alone than blown past the edges.
  return height >= frame.height
    ? { width: frame.height * aspect, height: frame.height }
    : { width, height };
}

/** Identity of a document, so a new one remounts rather than mutating in place. */
function sourceKey(source: BookPdfSource) {
  return typeof source === 'number' ? `asset:${source}` : source.uri;
}

function errorMessage(error: unknown) {
  const raw =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : typeof error === 'string'
      ? error
      : '';
  return raw.trim() || 'This PDF could not be displayed.';
}

/**
 * The reading stage.
 *
 * One native document view, and only one. `react-native-pdf` reloads the whole
 * file on any prop change and keeps its zoom limits in process-wide statics, so
 * a second live instance over the same book races the first inside Pdfium and
 * takes the app down with it. Page jumps therefore go through the imperative
 * `setPage` command — which moves the native pager without a reload — and every
 * other prop is memoised so a parent re-render never touches the native view.
 *
 * The swipe is the document view's own pager, and nothing here is allowed near
 * it. It is what carries the page leaving and the page arriving past each other
 * under the finger with real type on both, and it is what a reader has in their
 * hand for hours — so it stays as smooth as it ships. `usePageTurn` only
 * watches the swipe, never takes it, and lends the pages depth as they cross.
 *
 * Scroll reading runs the book as a single column and is left to the document
 * view entirely. Zooming in stops the turn either way, because then a drag is
 * how the reader moves around the part of the page they zoomed in for.
 */
export const BookPageFlip = memo(
  forwardRef<BookPageFlipHandle, BookPageFlipProps>(function BookPageFlip(
    { source, scale, onLoadComplete, onLoadProgress, onError, onPageChanged, onSingleTap },
    ref,
  ) {
    // The stage behind a rendering page is the reader's chosen tone, so there
    // is no flash of the wrong colour while a page paints, and the strips
    // either side of a page that does not fill the frame belong to the tone
    // rather than to the app.
    const { stage, wash } = useReaderSurface();
    const readingMode = useThemeStore(state => state.readingMode);

    const pdfRef = useRef<PdfRef>(null);
    const pageRef = useRef(1);
    const totalPagesRef = useRef(0);
    const readyRef = useRef(false);
    /** A page asked for by name rather than by direction, e.g. "go to 42". */
    const targetRef = useRef<number | null>(null);

    // Callbacks are read through a ref so the props handed to the native view
    // keep their identity, which is what stops it reloading the file.
    const handlers = useRef({
      onLoadComplete,
      onLoadProgress,
      onError,
      onPageChanged,
      onSingleTap,
    });
    handlers.current = {
      onLoadComplete,
      onLoadProgress,
      onError,
      onPageChanged,
      onSingleTap,
    };

    const zoom = clampScale(scale);
    const zoomed = zoom > MIN_SCALE + ZOOM_EPS;
    const paged = readingMode !== 'scroll';

    // The stage, and the shape of the page the book reported. Together they
    // decide how large the page is drawn.
    const [frame, setFrame] = useState<Box>({ width: 0, height: 0 });
    const [aspect, setAspect] = useState(0);

    const onStageLayout = useCallback((event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setFrame(current =>
        Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1
          ? current
          : { width, height },
      );
    }, []);

    /**
     * A tap belongs to the chrome, and only to the chrome. Turning pages on a
     * tap put a page turn one stray thumb away from every reader.
     */
    const handleSingleTap = useCallback(() => {
      handlers.current.onSingleTap?.();
    }, []);

    /** Moves the document view. Nothing here animates; the stage does that. */
    const applyPage = useCallback((target: number) => {
      const page = Math.round(Number(target));
      if (!Number.isFinite(page)) return;

      const total = totalPagesRef.current;
      const next = Math.min(Math.max(page, 1), total > 0 ? total : page);
      if (!readyRef.current || next === pageRef.current) return;

      pageRef.current = next;
      try {
        pdfRef.current?.setPage(next);
      } catch {
        // A page command can only fail once the view is gone; the next
        // `onPageChanged` resyncs us either way.
      }
    }, []);

    /** Called under the dip, with the stage bare. */
    const jumpPage = useCallback(
      (dir: TurnDirection) => {
        const target = targetRef.current;
        targetRef.current = null;
        applyPage(target ?? pageRef.current + dir);
      },
      [applyPage],
    );

    const pageTurn = usePageTurn({
      enabled: paged && !zoomed,
      onJump: jumpPage,
      onTap: handleSingleTap,
    });
    const { setBounds, setZoom, settle, start: startTurn } = pageTurn;

    // The turn reads the zoom on the UI thread, so it knows to leave a zoomed
    // page to the document view without waiting on a render.
    useEffect(() => {
      setZoom(zoom);
    }, [setZoom, zoom]);

    const turnPage = useCallback(
      (dir: TurnDirection) => {
        if (!readyRef.current) return;
        const total = totalPagesRef.current;
        const next = pageRef.current + dir;
        if (next < 1 || (total > 0 && next > total)) return;
        targetRef.current = null;
        startTurn(dir);
      },
      [startTurn],
    );

    const goToPage = useCallback(
      (target: number) => {
        const page = Math.round(Number(target));
        if (!Number.isFinite(page) || !readyRef.current) return;

        const total = totalPagesRef.current;
        const next = Math.min(Math.max(page, 1), total > 0 ? total : page);
        if (next === pageRef.current) return;

        // A jump still travels: forwards if the page is ahead, back if behind,
        // so the movement agrees with what the reader asked for.
        targetRef.current = next;
        startTurn(next > pageRef.current ? 1 : -1);
      },
      [startTurn],
    );

    useImperativeHandle(ref, () => ({ turn: turnPage, goTo: goToPage }), [goToPage, turnPage]);

    const handleLoadComplete = useCallback(
      (numberOfPages: number, _path: string, size?: Box) => {
        const total = Number.isFinite(numberOfPages) ? Math.max(0, Math.floor(numberOfPages)) : 0;
        totalPagesRef.current = total;
        readyRef.current = true;
        setBounds(pageRef.current, total);

        // The book's own page shape, which is what the stage is sized from.
        const width = Number(size?.width);
        const height = Number(size?.height);
        if (width > 0 && height > 0) {
          setAspect(current =>
            Math.abs(current - width / height) < 0.001 ? current : width / height,
          );
        }

        handlers.current.onLoadComplete(total);
        handlers.current.onPageChanged(pageRef.current, total);
      },
      [setBounds],
    );

    const handlePageChanged = useCallback(
      (page: number, numberOfPages: number) => {
        if (!Number.isFinite(page) || page < 1) return;
        const total = Number.isFinite(numberOfPages)
          ? Math.max(0, Math.floor(numberOfPages))
          : totalPagesRef.current;
        pageRef.current = Math.floor(page);
        totalPagesRef.current = total;
        setBounds(pageRef.current, total);
        // The new page is here. A turn still drawn back from a flick grows it
        // in from this, rather than guessing at when the pager would land.
        settle();
        handlers.current.onPageChanged(pageRef.current, total);
      },
      [setBounds, settle],
    );

    const handleLoadProgress = useCallback((percent: number) => {
      if (!Number.isFinite(percent)) return;
      handlers.current.onLoadProgress?.(percent);
    }, []);

    const handleError = useCallback((error: unknown) => {
      handlers.current.onError(errorMessage(error));
    }, []);

    const pdfStyle = useMemo(() => [styles.pdf, { backgroundColor: stage }], [stage]);

    const renderActivityIndicator = useCallback(() => <View style={styles.pdf} />, []);

    // Scrolling runs the book as one column, which fills the screen by itself;
    // a page turned on its own gets drawn to the shape of the page.
    const box = paged ? pageBox(frame, aspect) : null;

    return (
      <View style={[styles.stage, { backgroundColor: stage }]} onLayout={onStageLayout}>
        <GestureDetector gesture={pageTurn.gesture}>
          {/* The margin above and below a fitted page is the reader's to tap
              as much as the page is, and their swipe to start in as much as
              the page is. Both are gestures on this one view, so neither can
              take a touch off the other or off the pager underneath. */}
          <View
            style={styles.frame}
            onLayout={pageTurn.onLayout}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Show reading controls"
            onAccessibilityTap={handleSingleTap}>
            {/* The depth, and nothing else: a plain transform on the plane the
                page sits on, with no shadow or corner to recompute per frame. */}
            <Animated.View pointerEvents="box-none" style={[styles.layer, pageTurn.style]}>
              <View
                style={[
                  box ? { width: box.width, height: box.height } : styles.fill,
                  { backgroundColor: stage },
                ]}>
                <Pdf
                  key={sourceKey(source)}
                  ref={pdfRef}
                  source={source}
                  style={pdfStyle}
                  horizontal={paged}
                  enablePaging={paged && !zoomed}
                  scrollEnabled
                  singlePage={false}
                  scale={zoom}
                  minScale={MIN_SCALE}
                  maxScale={MAX_SCALE}
                  // Scrolling reads as one column: pages fill the width, with a
                  // hair of sky between them so a page break is still a break.
                  spacing={paged ? 0 : PAGE_GAP}
                  fitPolicy={paged ? 2 : 0}
                  enableAntialiasing
                  enableDoubleTapZoom
                  enableAnnotationRendering={false}
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                  trustAllCerts
                  onLoadComplete={handleLoadComplete}
                  onLoadProgress={handleLoadProgress}
                  onPageChanged={handlePageChanged}
                  onPageSingleTap={handleSingleTap}
                  onError={handleError}
                  renderActivityIndicator={renderActivityIndicator}
                />

                {/* The tone, laid over the rendered page. Never over the
                    chrome. */}
                {wash ? (
                  <View pointerEvents="none" style={[styles.wash, { backgroundColor: wash }]} />
                ) : null}
              </View>
            </Animated.View>
          </View>
        </GestureDetector>
      </View>
    );
  }),
);
BookPageFlip.displayName = 'BookPageFlip';

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    // What the page is drawn past, and clipped by.
    overflow: 'hidden',
  },
  frame: {
    flex: 1,
  },
  /** The plane the page sits on. Transformed whole, so it scales about itself. */
  layer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    alignSelf: 'stretch',
    flex: 1,
  },
  pdf: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
  wash: {
    ...StyleSheet.absoluteFill,
  },
});
