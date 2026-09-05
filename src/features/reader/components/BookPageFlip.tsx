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
import { Image, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef, releaseCapture } from 'react-native-view-shot';
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
  /** Jumps to a page, under whichever motion the reading mode owns. */
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

/** The paper of the leaf's back, laid over its mirrored front past edge-on. */
const SHEET = '#FFFFFF';

/**
 * The leaf's picture. JPEG because a page is opaque paper and the capture has
 * to be quick enough to finish inside the slop of a drag.
 */
const SNAPSHOT_OPTIONS = { format: 'jpg', quality: 0.9, result: 'tmpfile' } as const;

/** A paper flip in flight, from the moment it is asked for to its cleanup. */
type FlipTurn = {
  dir: TurnDirection;
  from: number;
  to: number;
  /** Set for a turn run by a control, which starts once its picture is up. */
  auto: boolean;
  started: boolean;
  /** Set once the leaf has lain back down and the page beneath is walking home. */
  aborting: boolean;
};

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
 * Flip is the opposite bargain. A pager slides and cannot be made to turn a
 * leaf, so `usePaperFlip` switches the pager off and takes the drag outright.
 * The moment a finger lands, the stage photographs the page; the moment a fold
 * begins, that photograph is mounted exactly over the page and the document
 * view underneath moves to the destination — so the leaf being turned is a
 * picture, and everything it uncovers from its first degree is the real next
 * page, already there the way the next page of a book is. The leaf travels the
 * whole way over its spine, back face and all, and an aborted turn lies back
 * down while the document view walks home under it.
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

    /**
     * The paper flip's moving parts on the JS side.
     *
     * The leaf is a photograph of the page, taken by `prepareFlip` the moment
     * a finger lands and mounted by `beginFlip` the moment a fold truly
     * starts. The instant the picture has painted — pixel for pixel over the
     * real page — the document view underneath moves to the destination, so
     * everything the fold reveals from its first degree is the actual next
     * page. The worklets in `usePaperFlip` drive the fold itself and report
     * back here only at the ends: committed, or lain back down.
     */
    const [leaf, setLeaf] = useState<string | null>(null);
    /** The view the photograph is of: the page box, wash and all. */
    const shotTargetRef = useRef<View>(null);
    /** The photograph taken at touch-down, racing the fold that may want it. */
    const shotRef = useRef<Promise<string | null> | null>(null);
    const flipTurnRef = useRef<FlipTurn | null>(null);
    /** The uri on the mounted leaf, so it is released and released once. */
    const leafUriRef = useRef<string | null>(null);
    const abortTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    /** The worklet-side controls, filled in just under the hook they come from. */
    const animateFlipRef = useRef<(dir: TurnDirection) => void>(() => {});
    const resetFlipRef = useRef<() => void>(() => {});

    const takeSnapshot = useCallback(() => {
      const view = shotTargetRef.current;
      if (!view) return Promise.resolve<string | null>(null);
      // A failed photograph is not an error anywhere below: the turn simply
      // happens without its leaf, as a plain page change.
      return captureRef(view, SNAPSHOT_OPTIONS).then(
        uri => uri || null,
        () => null,
      );
    }, []);

    /** A finger has landed on the page. Photograph it; a fold may follow. */
    const prepareFlip = useCallback(() => {
      if (flipTurnRef.current || !readyRef.current || totalPagesRef.current < 2) return;
      // A photograph from an earlier touch that no fold ever claimed.
      const stale = shotRef.current;
      shotRef.current = takeSnapshot();
      if (stale) {
        void stale.then(uri => {
          if (uri && uri !== leafUriRef.current) releaseCapture(uri);
        });
      }
    }, [takeSnapshot]);

    /**
     * A turn begins: by finger (`auto` false, the fold is already under it) or
     * by control (`auto` true, the fold starts once the picture is up).
     */
    const beginFlip = useCallback(
      (dir: TurnDirection, auto: boolean) => {
        if (flipTurnRef.current || !readyRef.current) return;
        const total = totalPagesRef.current;
        const named = targetRef.current;
        targetRef.current = null;
        const from = pageRef.current;
        const to = Math.min(Math.max(named ?? from + dir, 1), total > 0 ? total : 1);
        if (to === from) return;

        const turn: FlipTurn = {
          dir: to > from ? 1 : -1,
          from,
          to,
          auto,
          started: false,
          aborting: false,
        };
        flipTurnRef.current = turn;

        const shot = shotRef.current ?? takeSnapshot();
        shotRef.current = null;
        void shot.then(uri => {
          if (flipTurnRef.current !== turn || turn.aborting) {
            if (uri) releaseCapture(uri);
            return;
          }
          if (uri) {
            leafUriRef.current = uri;
            setLeaf(uri);
            // The document view moves when the picture reports painted.
          } else {
            // No picture could be taken. The page still changes — in plain
            // sight, once, rather than under a leaf.
            applyPage(turn.to);
            if (turn.auto && !turn.started) {
              turn.started = true;
              animateFlipRef.current(turn.dir);
            }
          }
        });
      },
      [applyPage, takeSnapshot],
    );

    const handleFoldStart = useCallback(
      (dir: TurnDirection) => beginFlip(dir, false),
      [beginFlip],
    );

    /**
     * The leaf's picture has painted, pixel for pixel over the real page. Only
     * now may the document view move — a moment earlier and the next page
     * shows through for a frame before the picture lands.
     */
    const handleLeafReady = useCallback(() => {
      const turn = flipTurnRef.current;
      if (!turn || turn.aborting) return;
      // A frame's grace, because `onLoad` reports the decode rather than the
      // paint: the picture must genuinely be on screen before the page under
      // it is allowed to move.
      requestAnimationFrame(() => {
        if (flipTurnRef.current !== turn || turn.aborting) return;
        applyPage(turn.to);
        if (turn.auto && !turn.started) {
          turn.started = true;
          animateFlipRef.current(turn.dir);
        }
      });
    }, [applyPage]);

    /**
     * The end of every turn, however it ended. When a leaf is up, its unmount
     * is what resets the fold — see the effect below — but a turn whose
     * picture never made it to the tree has no unmount coming, so the reset
     * happens here and now instead.
     */
    const clearFlip = useCallback(() => {
      flipTurnRef.current = null;
      if (leafUriRef.current === null) resetFlipRef.current();
      setLeaf(null);
    }, []);

    /** The leaf finished the turn. The page beneath was there all along. */
    const finishFlip = useCallback(() => {
      const turn = flipTurnRef.current;
      // Already there — unless the picture never painted, in which case the
      // page owes the reader its change now.
      if (turn) applyPage(turn.to);
      clearFlip();
    }, [applyPage, clearFlip]);

    /**
     * The leaf lay back down over the page the fold had revealed. The document
     * view walks home underneath the flat leaf, gets a beat — or its own page
     * report, whichever is first — to land, and only then is the leaf taken
     * away. Taken sooner, the reader would see the page it almost turned to.
     */
    const abortFlip = useCallback(() => {
      const turn = flipTurnRef.current;
      if (!turn) {
        clearFlip();
        return;
      }
      turn.aborting = true;
      applyPage(turn.from);
      if (abortTimer.current) clearTimeout(abortTimer.current);
      abortTimer.current = setTimeout(() => {
        abortTimer.current = null;
        if (flipTurnRef.current === turn) clearFlip();
      }, 400);
    }, [applyPage, clearFlip]);

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
      onPrepare: prepareFlip,
      onFoldStart: handleFoldStart,
      onCommit: finishFlip,
      onAbort: abortFlip,
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
      reset: resetFlip,
      animateTurn: animateFlip,
    } = paperFlip;

    useEffect(() => {
      animateFlipRef.current = animateFlip;
      resetFlipRef.current = resetFlip;
    }, [animateFlip, resetFlip]);

    /**
     * The leaf has left the tree and its unmount has painted; only now is the
     * fold's angle put back to zero. Any sooner and a flat copy of the old
     * page would lie over the new one for a frame.
     */
    useEffect(() => {
      if (leaf) return;
      resetFlip();
      if (leafUriRef.current) {
        releaseCapture(leafUriRef.current);
        leafUriRef.current = null;
      }
    }, [leaf, resetFlip]);

    // Leaving flip mode mid-turn takes the whole turn with it.
    useEffect(() => {
      if (!folding) clearFlip();
    }, [clearFlip, folding]);

    useEffect(
      () => () => {
        if (abortTimer.current) clearTimeout(abortTimer.current);
      },
      [],
    );

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

    /** The swipe mode's jump, for pages arrived at by name in that mode. */
    const { start: startTurn } = pageTurn;

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
        if (folding) beginFlip(dir, true);
        else startTurn(dir);
      },
      [beginFlip, folding, startTurn],
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
        const dir: TurnDirection = next > pageRef.current ? 1 : -1;
        if (folding) beginFlip(dir, true);
        else startTurn(dir);
      },
      [beginFlip, folding, startTurn],
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
        // The new page is here. A swipe still drawn back from a flick grows it
        // in from this, rather than guessing at when the pager would land.
        settleTurn();

        // An aborted flip was waiting on exactly this report: the document
        // view is home, so the flat leaf covering it can come down.
        const turn = flipTurnRef.current;
        if (turn?.aborting && pageRef.current === turn.from) {
          if (abortTimer.current) {
            clearTimeout(abortTimer.current);
            abortTimer.current = null;
          }
          clearFlip();
        }

        handlers.current.onPageChanged(pageRef.current, total);
      },
      [clearFlip, setBounds, settleTurn],
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
              {/* The depth, and nothing else: a plain transform on the plane
                  the page sits on, with no shadow or corner to recompute per
                  frame. */}
              <Animated.View pointerEvents="box-none" style={[styles.layer, pageTurn.style]}>
                <Animated.View
                  ref={shotTargetRef}
                  collapsable={false}
                  onLayout={handlePageLayout}
                  style={[
                    pageSize,
                    { backgroundColor: stage },
                    // The end-of-book give. The page itself never folds in
                    // flip mode — it is what the fold reveals — but it still
                    // answers a pull it cannot honour.
                    folding ? paperFlip.edgeStyle : undefined,
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

                  {/* The shadow the raised leaf throws across this page — the
                      page the fold is in the act of revealing. */}
                  {folding ? (
                    <Animated.View
                      pointerEvents="none"
                      style={[styles.wash, paperFlip.castStyle]}>
                      <LinearGradient stops={CREASE_STOPS} angle={90} />
                    </Animated.View>
                  ) : null}
                </Animated.View>
              </Animated.View>

              {/* The leaf: the photograph of the page being turned, mounted
                  the instant a fold begins and folded the whole way over its
                  hinge. Transparent until its picture paints, so its first
                  frame shows the identical page through it rather than a
                  flash of anything else. Past edge-on the renderer draws it
                  mirrored — being the back of a plane — and the paper backing
                  over it turns that into the back of a printed sheet, ghost
                  ink and all. */}
              {folding && leaf ? (
                <View pointerEvents="none" style={styles.layer}>
                  <Animated.View style={[pageSize, paperFlip.leafStyle]}>
                    <Image
                      source={{ uri: leaf }}
                      style={styles.leafImage}
                      resizeMode="stretch"
                      fadeDuration={0}
                      onLoad={handleLeafReady}
                      onError={handleLeafReady}
                    />
                    <Animated.View style={[styles.wash, styles.leafBack, paperFlip.backingStyle]}>
                      {wash ? <View style={[styles.wash, { backgroundColor: wash }]} /> : null}
                    </Animated.View>
                    <Animated.View style={[styles.wash, paperFlip.creaseStyle]}>
                      <LinearGradient stops={CREASE_STOPS} angle={90} />
                    </Animated.View>
                  </Animated.View>
                </View>
              ) : null}
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
  /** The leaf's picture, laid exactly over the page it is a picture of. */
  leafImage: {
    ...StyleSheet.absoluteFill,
  },
  /** The paper of the leaf's back. Its opacity belongs to `usePaperFlip`. */
  leafBack: {
    backgroundColor: SHEET,
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
