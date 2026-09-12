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

import type { BookPdfSource } from '@/constants/books';
import {
  MAX_SCALE,
  MIN_SCALE,
  PAGE_FILL_LIMIT,
  PAGE_FLIP,
  READER_FOOT,
} from '@/features/reader/constants';
import { PaperFold, PaperGrain } from '@/features/reader/components/PaperFold';
import { useThemeStore } from '@/stores/themeStore';
import { useReaderSurface } from '@/features/reader/useReaderSurface';
import { usePageCapture } from '@/features/reader/usePageCapture';
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
  /** The first touch on the page, which is what retires the flip mode's hint. */
  onFirstTouch?: () => void;
};

/** Past this, the reader is looking at part of a page rather than at a page. */
const ZOOM_EPS = 0.02;

/** The gap between pages while scrolling. Enough to see the seam, no more. */
const PAGE_GAP = 8;

/**
 * The lift the design gives a page in the flip reader: the book raised off the
 * stage, with a hairline where the paper ends.
 */
const PAGE_LIFT = '0 18px 44px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.5)';

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

/** A turn in flight, and everything needed to land it. */
type Turn = {
  /** The page the reader was on when it started. */
  from: number;
  /** The page a turn carried through lands on. */
  dest: number;
  /** The page printed on the leaf: the one being left, or the one returned to. */
  leaf: number;
  /**
   * The page the document view is asked to show for the length of the turn.
   *
   * Always the one the fold opens *onto* — ahead of the reader going forward,
   * the page they are on coming back — because the document view is the page
   * underneath the leaf and the leaf is a picture.
   */
  under: number;
};

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
 * Flip is the opposite bargain, and the rest of this note is about it.
 *
 * ## How one document view draws two pages
 *
 * A folded sheet shows three surfaces at once: the part of the leaf still lying
 * flat, the part that has creased over — the same page again, mirrored — and
 * the page underneath, showing through wherever the sheet has lifted. Two
 * different pages, and one document view that can only ever draw one of them.
 *
 * So the leaf is a picture and the page underneath is real. `usePageCapture`
 * photographs each page once it settles; a fold draws both halves of its leaf
 * from that. The document view, meanwhile, is moved at the very start of the
 * turn to the page the fold is opening onto — which is safe precisely because
 * a fold starts with the leaf covering the whole page, so the change happens
 * behind it, unseen.
 *
 * That is why every turn ends in one of two states and never a third. Either
 * the leaf has gone right over, and the document view is already showing the
 * page the reader asked for; or the leaf is lying flat across the whole page,
 * hiding the document view while it is moved back. `handleFoldEnd` is that
 * fork, and it is the only place the page a reader believes they are on
 * changes.
 *
 * ## What the fold is not allowed to disturb
 *
 * The page the reader is on. The document view's page moves twice during a
 * turn and settles somewhere the reader has not agreed to yet, so nothing
 * outside this file is told about it: `pageRef` stays on the page the reader
 * believes they are on until the leaf has landed, and the header and the
 * progress rule stay with it.
 *
 * Scroll runs the book as a single column and is left to the document view
 * entirely. Zooming in stops the turn in all three, because then a drag is how
 * the reader moves around the part of the page they zoomed in for.
 */
export const BookPageFlip = memo(
  forwardRef<BookPageFlipHandle, BookPageFlipProps>(function BookPageFlip(
    {
      source,
      scale,
      onLoadComplete,
      onLoadProgress,
      onError,
      onPageChanged,
      onSingleTap,
      onFirstTouch,
    },
    ref,
  ) {
    // The stage behind a rendering page is the reader's chosen tone, so there
    // is no flash of the wrong colour while a page paints, and the strips
    // either side of a page that does not fill the frame belong to the tone
    // rather than to the app.
    const { stage, wash } = useReaderSurface();
    const readingMode = useThemeStore(state => state.readingMode);

    const pdfRef = useRef<PdfRef>(null);
    /** The page the reader believes they are on. */
    const pageRef = useRef(1);
    /** The page the document view is actually showing, which drifts mid-turn. */
    const docPageRef = useRef(1);
    const totalPagesRef = useRef(0);
    const readyRef = useRef(false);
    /** A page asked for by name rather than by direction, e.g. "go to 42". */
    const targetRef = useRef<number | null>(null);

    /** The turn in flight, if there is one. */
    const turnRef = useRef<Turn | null>(null);
    /** The page a landed leaf is waiting to be lowered onto. */
    const waitRef = useRef<number | null>(null);
    const graceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const landRef = useRef<number | null>(null);

    /** What the fold draws: bumped once per turn, so the document view moves once. */
    const [fold, setFold] = useState<{ token: number; leaf: string | null } | null>(null);
    const foldToken = useRef(0);

    // Callbacks are read through a ref so the props handed to the native view
    // keep their identity, which is what stops it reloading the file.
    const handlers = useRef({
      onLoadComplete,
      onLoadProgress,
      onError,
      onPageChanged,
      onSingleTap,
      onFirstTouch,
    });
    handlers.current = {
      onLoadComplete,
      onLoadProgress,
      onError,
      onPageChanged,
      onSingleTap,
      onFirstTouch,
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

    /** What a picture of the page is taken of: the document view and its tone. */
    const shotRef = useRef<View>(null);

    /**
     * A picture has arrived. If it is of the leaf of a fold already in flight —
     * the reader touched the page and pulled before the shutter had closed —
     * it goes onto that leaf now, over the blank paper that stood in for it.
     */
    const handleShot = useCallback((page: number, uri: string) => {
      const turn = turnRef.current;
      if (!turn || turn.leaf !== page) return;
      setFold(current => (current && current.leaf !== uri ? { ...current, leaf: uri } : current));
    }, []);

    const capture = usePageCapture(shotRef, handleShot);

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

    /**
     * A finger has landed on the page.
     *
     * This is when the page's picture is taken: the reader is looking at it,
     * so it has certainly been drawn, and the fold that may follow is still a
     * few points of travel away. A picture taken on a timer after the page
     * settled can catch the page half-rendered, or be cancelled by the very
     * drag that needs it; this one is of exactly what the reader can see.
     */
    const handleTouch = useCallback(() => {
      handlers.current.onFirstTouch?.();
      if (!turnRef.current) capture.refresh(pageRef.current);
    }, [capture]);

    /** Moves the document view. Nothing here animates; the stage does that. */
    const applyPage = useCallback((target: number) => {
      const page = Math.round(Number(target));
      if (!Number.isFinite(page)) return;

      const total = totalPagesRef.current;
      const next = Math.min(Math.max(page, 1), total > 0 ? total : page);
      if (!readyRef.current || next === docPageRef.current) return;

      docPageRef.current = next;
      try {
        pdfRef.current?.setPage(next);
      } catch {
        // A page command can only fail once the view is gone; the next
        // `onPageChanged` resyncs us either way.
      }
    }, []);

    /** Called under the swipe mode's dip, with the stage bare. */
    const jumpPage = useCallback(
      (dir: TurnDirection) => {
        const target = targetRef.current;
        targetRef.current = null;
        const next = target ?? pageRef.current + dir;
        pageRef.current = Math.max(1, next);
        applyPage(next);
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

    // The fold's own hooks are declared below the callbacks that drive them —
    // each needs the other — so the two things a landing has to reach back for
    // are held at a fixed identity here.
    const boundsRef = useRef<((current: number, count: number) => void) | null>(null);
    const clearRef = useRef<(() => void) | null>(null);

    /**
     * The leaf has landed and the page under it is the one the reader asked
     * for. This is the only place the page they believe they are on changes.
     */
    const closeFold = useCallback(
      (finalPage: number) => {
        if (graceRef.current) {
          clearTimeout(graceRef.current);
          graceRef.current = null;
        }
        if (landRef.current !== null) {
          cancelAnimationFrame(landRef.current);
          landRef.current = null;
        }
        waitRef.current = null;
        turnRef.current = null;

        const total = totalPagesRef.current;
        const landed = Math.min(Math.max(finalPage, 1), total > 0 ? total : finalPage);
        pageRef.current = landed;
        boundsRef.current?.(landed, total);
        setFold(null);
        // Unconditionally, and not from an effect on the layers coming down: a
        // fold that never got as far as mounting anything — a turn asked for
        // past the end of the book, say — still has to give the reader their
        // page back, and an effect that never runs would leave the book held
        // mid-turn for good.
        clearRef.current?.();
        handlers.current.onPageChanged(landed, total);
        capture.schedule(landed);
      },
      [capture],
    );

    /**
     * A fold has begun.
     *
     * The leaf is a picture of whichever page is on top of the fold — the one
     * being left going forward, the one being returned to coming back — and the
     * document view is sent to the page underneath it.
     */
    const handleFoldBegin = useCallback(
      (dir: TurnDirection) => {
        if (!readyRef.current) return;

        const from = pageRef.current;
        const total = totalPagesRef.current;
        const asked = targetRef.current ?? from + dir;
        targetRef.current = null;
        const dest = Math.min(Math.max(Math.round(asked), 1), total > 0 ? total : asked);
        if (dest === from) return;

        const forward = dest > from;
        const leafPage = forward ? from : dest;
        turnRef.current = { from, dest, leaf: leafPage, under: forward ? dest : from };

        capture.hold();
        foldToken.current += 1;
        setFold({ token: foldToken.current, leaf: capture.shotOf(leafPage) });
      },
      [capture],
    );

    // The document view is moved only once the leaf is on screen and covering
    // it — after the commit that mounts the fold, and then a frame later
    // again, because a leaf that has been laid out has not necessarily been
    // drawn. Doing it inside `handleFoldBegin` would change the page while
    // there was still nothing in front of it to hide the change.
    const foldStep = fold?.token ?? 0;
    useEffect(() => {
      if (!foldStep || !turnRef.current) return undefined;
      const frameId = requestAnimationFrame(() => {
        const turn = turnRef.current;
        if (turn) applyPage(turn.under);
      });
      return () => cancelAnimationFrame(frameId);
    }, [applyPage, foldStep]);

    /**
     * The leaf has landed, turned or not.
     *
     * Either it has gone right over — and the document view, moved at the start
     * of the turn, is already showing what is now the page — or it is lying
     * flat across the whole page, which is the one moment the document view can
     * be moved back underneath it unseen.
     */
    const handleFoldEnd = useCallback(
      (commit: boolean) => {
        const turn = turnRef.current;
        if (!turn) {
          closeFold(pageRef.current);
          return;
        }

        const finalPage = commit ? turn.dest : turn.from;
        if (finalPage === turn.under) {
          closeFold(finalPage);
          return;
        }

        waitRef.current = finalPage;
        applyPage(finalPage);
        // The document view usually reports back well inside this; the timer is
        // for the one that does not, so a leaf is never left lying on the book.
        graceRef.current = setTimeout(() => closeFold(finalPage), PAGE_FLIP.graceMs);
      },
      [applyPage, closeFold],
    );

    const paperFlip = usePaperFlip({
      enabled: folding && !zoomed,
      onBegin: handleFoldBegin,
      onEnd: handleFoldEnd,
      onTap: handleSingleTap,
      onTouch: handleTouch,
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
      start: startFold,
      clear: clearFold,
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
    boundsRef.current = setBounds;
    clearRef.current = clearFold;

    // The turn reads the zoom on the UI thread, so it knows to leave a zoomed
    // page to the document view without waiting on a render.
    useEffect(() => {
      setTurnZoom(zoom);
      setFlipZoom(zoom);
    }, [setFlipZoom, setTurnZoom, zoom]);

    /**
     * The reader has left the fold mid-turn — changed reading mode, or zoomed
     * in — and there is nothing left to finish it.
     *
     * The document view is somewhere the reader has not been told about, and
     * with the leaf gone it is also what they are looking at, so that is now
     * where they are. Without this the turn stays open for good and every page
     * change after it is swallowed as part of a fold that ended long ago.
     */
    useEffect(() => {
      if (folding && !zoomed) return;
      if (turnRef.current || fold) closeFold(docPageRef.current);
    }, [closeFold, fold, folding, zoomed]);

    useEffect(
      () => () => {
        if (graceRef.current) clearTimeout(graceRef.current);
        if (landRef.current !== null) cancelAnimationFrame(landRef.current);
      },
      [],
    );

    const turnPage = useCallback(
      (dir: TurnDirection) => {
        if (!readyRef.current) return;
        const total = totalPagesRef.current;
        const next = pageRef.current + dir;
        if (next < 1 || (total > 0 && next > total)) return;
        targetRef.current = null;
        if (folding) startFold(dir);
        else startTurn(dir);
      },
      [folding, startFold, startTurn],
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
        if (folding) startFold(dir);
        else startTurn(dir);
      },
      [folding, startFold, startTurn],
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
        capture.schedule(pageRef.current);
      },
      [capture, setBounds],
    );

    const handlePageChanged = useCallback(
      (page: number, numberOfPages: number) => {
        if (!Number.isFinite(page) || page < 1) return;
        const total = Number.isFinite(numberOfPages)
          ? Math.max(0, Math.floor(numberOfPages))
          : totalPagesRef.current;
        const landed = Math.floor(page);
        docPageRef.current = landed;
        totalPagesRef.current = total;

        // Mid-fold this is the document view answering a move the reader has
        // not been shown, so it is not news. The leaf comes down on it — a
        // frame later, so the page has been drawn and not merely reported.
        if (turnRef.current) {
          if (waitRef.current === landed) {
            const finalPage = landed;
            waitRef.current = null;
            landRef.current = requestAnimationFrame(() => {
              landRef.current = null;
              closeFold(finalPage);
            });
          }
          return;
        }

        pageRef.current = landed;
        setBounds(landed, total);
        // The new page is here. A swipe still drawn back from a flick grows it
        // in from this, rather than guessing at when the pager would land.
        settleTurn();

        handlers.current.onPageChanged(landed, total);
        capture.schedule(landed);
      },
      [capture, closeFold, setBounds, settleTurn],
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
    /** The book raised off the stage. The design's lift, and only in its mode. */
    const lift = useMemo(
      () => (folding && boxWidth > 0 ? { boxShadow: PAGE_LIFT } : null),
      [boxWidth, folding],
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
                  collapsable={false}
                  onLayout={handlePageLayout}
                  style={[
                    pageSize,
                    { backgroundColor: stage },
                    lift,
                    // The give at either end of the book, which moves the whole
                    // page rather than folding it.
                    folding ? paperFlip.groupStyle : undefined,
                  ]}>
                  {/* What a picture of the page is taken of, and what the fold
                      opens onto: the document view with the reader's tone over
                      it, which is the page exactly as they are reading it. */}
                  <View ref={shotRef} collapsable={false} style={styles.fill}>
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
                        chrome — and inside the picture, so a leaf is folded in
                        the same paper the page under it is printed on. */}
                    {wash ? (
                      <View pointerEvents="none" style={[styles.wash, { backgroundColor: wash }]} />
                    ) : null}
                  </View>

                  {/* The fold. Only while there is one: at rest the reader is
                      looking at the document view itself, at full fidelity. */}
                  {fold && boxWidth > 0 ? (
                    <PaperFold
                      width={boxWidth}
                      height={boxHeight}
                      fold={paperFlip.fold}
                      leaf={fold.leaf}
                      wash={wash}
                    />
                  ) : null}

                  {/* The grain of the paper, over the page and the fold alike,
                      and outside what a picture of the page is taken of. */}
                  {folding && boxWidth > 0 ? (
                    <PaperGrain width={boxWidth} height={boxHeight} />
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
  pdf: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
  wash: {
    ...StyleSheet.absoluteFill,
  },
});
