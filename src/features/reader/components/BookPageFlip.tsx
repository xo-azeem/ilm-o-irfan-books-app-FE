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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Pdf, { type PdfRef } from 'react-native-pdf';

import { LinearGradient, type GradientStop } from '@/components/ui/Gradient';
import type { BookPdfSource } from '@/constants/books';
import {
  MAX_SCALE,
  MIN_SCALE,
  PAGE_FILL_LIMIT,
  PAGE_FLIP,
  READER_FOOT,
} from '@/features/reader/constants';
import { useThemeStore } from '@/stores/themeStore';
import { useReaderSurface } from '@/features/reader/useReaderSurface';
import { usePageTurn, type TurnDirection } from '@/features/reader/usePageTurn';
import { usePaperFlip } from '@/features/reader/usePaperFlip';

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

/**
 * The shading a fold is drawn with, black at the hinge and gone before the
 * free edge. One set of stops does both jobs — the crease on the leaf and the
 * shadow it throws on the sheet — because they are the same shadow seen from
 * two sides; `usePaperFlip` mirrors it to whichever edge the hinge is on.
 *
 * Declared once, at module scope: the gradient is an SVG, and it is only cheap
 * as long as nothing makes it draw itself again mid-fold.
 */
const CREASE_STOPS: GradientStop[] = [
  { offset: 0, color: '#000000', opacity: 1 },
  { offset: PAGE_FLIP.shadeSpread, color: '#000000', opacity: 0 },
];

/** The paper a fold opens onto, before the page arrived at has painted. */
const SHEET = '#FFFFFF';

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
 * There are three ways to move through a book here, and they divide on one
 * question: who owns the drag.
 *
 * Swipe is the document view's own pager, and nothing here is allowed near it.
 * It carries the page leaving and the page arriving past each other under the
 * finger with real type on both, and it is what a reader has in their hand for
 * hours — so it stays as smooth as it ships. `usePageTurn` only watches the
 * swipe, never takes it, and lends the pages depth as they cross.
 *
 * Flip is the opposite bargain. A pager slides and cannot be made to fold, so
 * `usePaperFlip` switches the pager off and takes the drag outright: the page
 * folds over on its spine, the page changes at the top of the fold where the
 * leaf is edge-on and invisible, and the new page falls open from the far edge.
 * What that costs is the blank sheet the fold has to open onto, drawn here
 * because only the stage knows what colour the paper is.
 *
 * Scroll runs the book as a single column and is left to the document view
 * entirely. Zooming in stops the turn in all three, because then a drag is how
 * the reader moves around the part of the page they zoomed in for.
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
    /** The paper flip: a page at a time, but folded rather than slid. */
    const folding = paged && readingMode === 'flip';

    // The system's own bars top and bottom, and the reader's rule and status
    // line at the foot. A page zoomed into is still a page: none of it may end
    // up behind any of them.
    const insets = useSafeAreaInsets();
    const foot = Math.max(insets.bottom, 8) + READER_FOOT;

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

    // Both page-at-a-time modes are always mounted and only one is ever live:
    // a hook cannot be called conditionally, and the reader can change mode
    // mid-book. Whichever is off holds its page flat and answers nothing.
    const pageTurn = usePageTurn({
      enabled: paged && !folding && !zoomed,
      onJump: jumpPage,
      onTap: handleSingleTap,
    });
    const paperFlip = usePaperFlip({
      enabled: folding && !zoomed,
      onSwap: jumpPage,
      onTap: handleSingleTap,
    });

    const {
      onAreaLayout: onTurnArea,
      onPageLayout: onTurnPage,
      setBounds: setTurnBounds,
      setZoom: setTurnZoom,
      settle: settleTurn,
    } = pageTurn;
    const {
      onAreaLayout: onFlipArea,
      onPageLayout: onFlipPage,
      setBounds: setFlipBounds,
      setZoom: setFlipZoom,
      settle: settleFlip,
    } = paperFlip;

    // The page is sized to this area and both modes measure it, so all three
    // read the same box: what is left of the screen once the bars have had
    // theirs, and the page centred in it.
    const handleAreaLayout = useCallback(
      (event: LayoutChangeEvent) => {
        onStageLayout(event);
        onTurnArea(event);
        onFlipArea(event);
      },
      [onFlipArea, onStageLayout, onTurnArea],
    );

    const handlePageLayout = useCallback(
      (event: LayoutChangeEvent) => {
        onTurnPage(event);
        onFlipPage(event);
      },
      [onFlipPage, onTurnPage],
    );

    /** Only the live mode moves a page. The other is told everything anyway. */
    const { start: startTurn } = folding ? paperFlip : pageTurn;

    /**
     * Where the reader is, told to both.
     *
     * A mode is switched into mid-book, not at the start of one, and a mode
     * that woke up believing the reader was on page 1 of an unknown book would
     * refuse to turn at all.
     */
    const setBounds = useCallback(
      (current: number, count: number) => {
        setTurnBounds(current, count);
        setFlipBounds(current, count);
      },
      [setFlipBounds, setTurnBounds],
    );

    /** The same with a page arriving: whichever was waiting for it acts. */
    const settle = useCallback(() => {
      settleTurn();
      settleFlip();
    }, [settleFlip, settleTurn]);

    // The turn reads the zoom on the UI thread, so it knows to leave a zoomed
    // page to the document view without waiting on a render.
    useEffect(() => {
      setTurnZoom(zoom);
      setFlipZoom(zoom);
    }, [setFlipZoom, setTurnZoom, zoom]);

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
    // Memoised on the numbers rather than on `box`, which is a fresh object
    // every render: the page's style reaches an animated view, and handing it a
    // new object per render is how a transform gets rebuilt mid-fold.
    const boxWidth = box?.width ?? 0;
    const boxHeight = box?.height ?? 0;
    const pageSize = useMemo(
      () => (boxWidth > 0 ? { width: boxWidth, height: boxHeight } : styles.fill),
      [boxHeight, boxWidth],
    );
    /** Only drawn while it can be seen: the sheet is nothing to any other mode. */
    const sheet = folding && box ? pageSize : null;

    return (
      <View style={[styles.stage, { backgroundColor: stage }]}>
        <GestureDetector gesture={folding ? paperFlip.gesture : pageTurn.gesture}>
          {/* The stage runs edge to edge — the tone belongs under the bars as
              much as anywhere. The page does not: it is drawn inside the frame,
              which keeps clear of the system bars and of the rule and status
              line that never leave, so nothing of a page can end up behind
              them at any zoom. */}
          <View
            style={[styles.frame, { paddingTop: insets.top, paddingBottom: foot }]}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Show reading controls"
            onAccessibilityTap={handleSingleTap}>
            <View style={styles.area} onLayout={handleAreaLayout}>
              {/* The sheet the fold opens onto.
                  A leaf folding away has to fold away onto something, and the
                  only page the document view can draw is the one on the leaf.
                  So underneath it lies a blank sheet in exactly the paper the
                  page is rendered on — white, under the same tone — and the
                  fold opens onto margin rather than onto the room. */}
              {sheet ? (
                <View pointerEvents="none" style={styles.layer}>
                  <View style={[sheet, styles.sheet]}>
                    {wash ? (
                      <View style={[styles.wash, { backgroundColor: wash }]} />
                    ) : null}
                    <Animated.View style={[styles.wash, paperFlip.castStyle]}>
                      <LinearGradient stops={CREASE_STOPS} angle={90} />
                    </Animated.View>
                  </View>
                </View>
              ) : null}

              {/* The depth, and nothing else: a plain transform on the plane
                  the page sits on, with no shadow or corner to recompute per
                  frame. */}
              <Animated.View pointerEvents="box-none" style={[styles.layer, pageTurn.style]}>
                <Animated.View
                  onLayout={handlePageLayout}
                  style={[
                    pageSize,
                    { backgroundColor: stage },
                    // The fold, on the page's own plane so it hinges on the
                    // edge of the paper. Left off entirely in the other modes,
                    // which have no use for a perspective matrix.
                    folding ? paperFlip.leafStyle : undefined,
                  ]}>
                  <Pdf
                    key={sourceKey(source)}
                    ref={pdfRef}
                    source={source}
                    style={pdfStyle}
                    horizontal={paged}
                    // The fold is the turn in this mode, so the pager is not:
                    // left on, it would slide the page out from under its own
                    // leaf. Scrolling comes back the moment the reader zooms in,
                    // because then a drag is how they move around the page.
                    enablePaging={paged && !folding && !zoomed}
                    scrollEnabled={!folding || zoomed}
                    singlePage={false}
                    scale={zoom}
                    minScale={MIN_SCALE}
                    maxScale={MAX_SCALE}
                    // Scrolling reads as one column: pages fill the width, with a
                    // hair of sky between them so a page break is still a break.
                    spacing={paged ? 0 : PAGE_GAP}
                    fitPolicy={paged ? 2 : 0}
                    enableAntialiasing
                    // Off while folding, and only there. Scrolling in this mode
                    // is switched on by the zoom the reader asked us for, and a
                    // zoom the document view took on its own would strand them
                    // inside a page they could no longer move around. The
                    // sheet's own zoom still works, and brings scrolling with
                    // it.
                    enableDoubleTapZoom={!folding}
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

                  {/* The crease. Over the tone as well as the page, because a
                      folded page shades the paper and the ink alike. */}
                  {folding ? (
                    <Animated.View
                      pointerEvents="none"
                      style={[styles.wash, paperFlip.creaseStyle]}>
                      <LinearGradient stops={CREASE_STOPS} angle={90} />
                    </Animated.View>
                  ) : null}
                </Animated.View>
              </Animated.View>
            </View>
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
  /** What is left of the stage for a page, once the bars have had their share. */
  area: {
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
  /** The blank paper a fold opens onto, under the leaf for the whole turn. */
  sheet: {
    backgroundColor: SHEET,
    overflow: 'hidden',
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
