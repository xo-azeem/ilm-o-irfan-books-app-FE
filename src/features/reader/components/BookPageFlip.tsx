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
import {
  Image,
  Platform,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
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
import { PaperFold } from '@/features/reader/components/PaperFold';
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
  /**
   * The page the document opens on — where the reader left off. Read once, at
   * mount: a later change is not followed, because the document view would
   * take it as a jump. Use `goTo` for that.
   */
  initialPage?: number;
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
  /**
   * The page a turn carried through lands on — and the page the document
   * view is sent to for the length of the turn, either way. Going forward it
   * is the page under the leaf; coming back it is the leaf itself.
   */
  dest: number;
  forward: boolean;
  /** The page printed on the leaf: the one being left, or the one returned to. */
  leaf: number;
  /** The picture on the front of the leaf, if there is one. */
  uri: string | null;
  /**
   * The picture that hides the document view while it moves: of the page in
   * hand, either way. Going forward it is the leaf's own picture, lying flat
   * over the whole page; coming back it is laid on the lifted side of the
   * crease, where the page in hand still shows.
   */
  veil: string | null;
  /** The shutter has closed on the picture taken at touch — or there was none. */
  shot: boolean;
  /** The veil is on screen. */
  veiled: boolean;
  /** The document view has been sent to the page under the leaf. */
  covered: boolean;
  /** Coming back: the front of the leaf has been made see-through. */
  bare: boolean;
  /** The leaf has landed. Nothing about the turn moves any more. */
  landed: boolean;
};

/** What the fold draws. */
type Fold = {
  /** Bumped once per turn, so the document view moves once. */
  token: number;
  leaf: string | null;
  /** Whether the flat part of the leaf has to hide the page beneath it yet. */
  opaque: boolean;
  /** Coming back: the page in hand, as a picture, on the lifted side of the crease. */
  under: string | null;
  /** The fold can hide the document view's move, and the view may go. */
  covered: boolean;
};

/**
 * The document view's own zoom, as it reports it.
 *
 * On iOS that report is a zoom. On Android it is the drawn width of whatever
 * page was last painted over the drawn width of the first page of the book —
 * which is a zoom only in a book whose every page is cut to the same width,
 * and a scanned book is not. Read as a zoom outright, a page a few percent
 * wider than the cover would have the fold refuse to turn it.
 *
 * So the report is read against a baseline: the last report seen at a moment
 * the page is known to be unzoomed. A touch that lands on an unzoomed page is
 * such a moment, and so is a page the fold has just moved the view to.
 */
type NativeZoom = {
  /** The last ratio reported. */
  last: number;
  /** The ratio that means unzoomed, for the page now showing. */
  base: number;
  /** The view has just been moved to a page: the next report is that page's own size. */
  moved: boolean;
  /** The page changed under a zoom, so the baseline is for a page no longer showing. */
  dirty: boolean;
};

/** Past this much over the baseline the reader has zoomed. */
const NATIVE_ZOOM_EPS = 0.05;

/**
 * Whether the flip mode keeps the document view's page snap.
 *
 * On Android the view's zoom-out animation — a double-tap's — pivots on the
 * middle of the screen, so a page zoomed into on one side comes back out of
 * the zoom shifted, with a strip of the next page showing. The view's own
 * snap, which runs as the tail of that animation, is what glides it home. On
 * iOS the paging flag turns the view over to a page controller instead, and
 * PDFKit centres a page it has zoomed out of by itself.
 */
const SNAP_IN_FLIP = Platform.OS === 'android';

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
 * So one of the two is a picture, and it is always a picture of the page in
 * hand: the one page that is certainly on screen to be photographed.
 * `usePageCapture` takes it as the reader touches the page — never on a
 * timer, because a page reports itself changed long before it has been
 * painted — and the document view is moved early in the turn to the page the
 * fold is opening onto, as soon as that picture is on screen to hide the
 * move. The back of the leaf is blank paper either way.
 *
 * Going forward the picture is the leaf: it lies flat over the whole page as
 * the fold starts, and the live document view, moved on to the next page
 * underneath it, shows through wherever the sheet has lifted. Until the
 * picture is there the flat part of the leaf is left see-through, so the page
 * is never blanked while the shutter is open.
 *
 * Coming back it is the other way round. The page arriving has never been
 * photographed — the reader may have opened the book here — so it cannot be
 * the picture; instead the picture of the page in hand is laid on the lifted
 * side of the crease, where that page still shows, and the live document
 * view is moved to the page before under it and shows through the front of
 * the leaf as it unrolls from the spine. Real type on the page arriving, and
 * a turn that lands with nothing left to move.
 *
 * That is why every turn ends in one of two states and never a third. Either
 * the leaf has gone right over, and the document view is already showing the
 * page the reader asked for; or the fold is back where it started with the
 * picture across the whole page, hiding the document view while it is moved
 * back. `handleFoldEnd` is that fork, and it is the only place the page a
 * reader believes they are on changes.
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
      initialPage = 1,
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
    /** The page asked for at mount, held so a re-render cannot move the book. */
    const startPage = useRef(Math.max(1, Math.round(initialPage) || 1)).current;
    /** The page the reader believes they are on. */
    const pageRef = useRef(startPage);
    /** The page the document view is actually showing, which drifts mid-turn. */
    const docPageRef = useRef(startPage);
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
    /** The frame after which a leaf coming back is made see-through. */
    const bareRef = useRef<number | null>(null);
    /** The wait for the leaf's picture before the document view is moved. */
    const coverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const coverFrameRef = useRef<number | null>(null);

    const [fold, setFold] = useState<Fold | null>(null);
    const foldToken = useRef(0);

    /**
     * The latest picture of the page in hand, held decoded ahead of the fold
     * that will wear it. A picture that has to be decoded when the fold mounts
     * is a few frames in which the leaf cannot yet hide the page beneath it,
     * and the document view has to wait that much longer to start painting
     * the next page — which it needs every frame it can get for.
     */
    const [ready, setReady] = useState<string | null>(null);

    /** Records the document view's own zoom; true if it changed. */
    const setNativeZoom = useCallback((value: number) => {
      if (value === nativeZoomRef.current) return false;
      nativeZoomRef.current = value;
      return true;
    }, []);

    /**
     * The zoom the document view took on its own — a pinch, or a double-tap —
     * which the controls know nothing about. It reaches the gestures and the
     * camera, and nothing else: a prop that followed it would reload the book.
     */
    const nativeZoomRef = useRef(MIN_SCALE);
    const nativeRef = useRef<NativeZoom>({
      last: 1,
      base: 1,
      moved: false,
      dirty: false,
    });

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
    const zoomRef = useRef(zoom);
    zoomRef.current = zoom;
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
     * A picture has arrived. If it is of the page in hand of a fold already in
     * flight — the reader touched the page and pulled before the shutter had
     * closed — and that fold is still waiting on it, it goes onto the fold
     * now: onto the leaf going forward, under the lifted half coming back.
     *
     * Only where nothing is yet. A fold that already carries a picture keeps
     * it: swapping a picture that is on screen for a fresher one is a visible
     * flicker in the middle of a turn, for a difference nobody can see.
     */
    const handleShot = useCallback((page: number, uri: string) => {
      if (page === pageRef.current) setReady(uri);
      const turn = turnRef.current;
      if (!turn || turn.from !== page || turn.veil) return;
      turn.veil = uri;
      if (turn.forward) {
        turn.uri = uri;
        setFold(current => (current && !current.leaf ? { ...current, leaf: uri } : current));
      } else {
        setFold(current => (current && !current.under ? { ...current, under: uri } : current));
      }
    }, []);

    /** A page under any zoom, the reader's or the document view's own, is not a page. */
    const canShoot = useCallback(
      () => zoomRef.current <= MIN_SCALE + ZOOM_EPS && nativeZoomRef.current <= MIN_SCALE,
      [],
    );

    const capture = usePageCapture(shotRef, {
      onShot: handleShot,
      allow: canShoot,
    });

    // Both gesture hooks are declared further down — each needs callbacks
    // declared here — so the zoom reaches them through a fixed identity.
    const zoomSinkRef = useRef<((control: number, native: number) => void) | null>(null);

    /**
     * Whichever zoom is up counts: the reader's, from the controls, or the
     * document view's own, from a pinch or a double-tap.
     */
    const pushZoom = useCallback(() => {
      zoomSinkRef.current?.(zoomRef.current, nativeZoomRef.current);
    }, []);

    /** The document view has zoomed, or painted a page of a different size. */
    /**
     * A page pinched out again is not put back where it was.
     *
     * The document view's swipe is off in the flip mode — the fold is the
     * turn — so a pinch leaves the view scrolled to wherever the pinch's
     * pivot dragged it, and a page pinched back to its own size sits off to
     * one side with a strip of the next page showing. A fold on a page like
     * that folds the wrong paper. So once the pinch is over — the last finger
     * off the screen, with the page back at its own size — the view is asked
     * for the page again, which seats it on the page's edge.
     *
     * Not a moment sooner. Asking mid-pinch, on a timer, had the view
     * re-queue its painting under the reader's fingers every time the zoom
     * paused near the page's size, which is a stutter; the fingers lifting
     * is the one signal that the pinch is done. A double-tap's zoom-out needs
     * none of this: it is the view's own animation, and the view's own page
     * snap — kept on for this (see `SNAP_IN_FLIP`) — glides the page home as
     * the tail of it. Only a page at a time is seated: a book read as a
     * column is wherever the reader scrolled it to.
     */
    const pagedRef = useRef(paged);
    pagedRef.current = paged;
    /** The document view has zoomed since it was last seated. */
    const pinchedRef = useRef(false);
    const seatPage = useCallback(() => {
      if (!readyRef.current || !pagedRef.current || turnRef.current) return;
      if (nativeZoomRef.current > MIN_SCALE) return;
      pinchedRef.current = false;
      try {
        pdfRef.current?.setPage(pageRef.current);
      } catch {
        // As in `applyPage`: only once the view is gone.
      }
    }, []);

    /** The last finger has left the stage. */
    const handleStageTouchEnd = useCallback(
      (event: GestureResponderEvent) => {
        if (event.nativeEvent.touches.length > 0) return;
        if (pinchedRef.current) seatPage();
      },
      [seatPage],
    );

    const handleScaleChanged = useCallback(
      (ratio: number) => {
        if (!Number.isFinite(ratio) || ratio <= 0) return;
        const native = nativeRef.current;
        native.last = ratio;
        if (native.moved) {
          // The first word from a page the fold has just moved to is its size.
          native.moved = false;
          native.base = ratio;
        }
        const value = ratio / native.base;
        const next = value > MIN_SCALE + NATIVE_ZOOM_EPS ? value : MIN_SCALE;
        if (next > MIN_SCALE) pinchedRef.current = true;
        if (setNativeZoom(next)) pushZoom();
      },
      [pushZoom, setNativeZoom],
    );

    /**
     * A finger has landed. If the page is unzoomed — or the baseline belongs to
     * a page no longer showing — the last report is what unzoomed looks like
     * for this page, and a pinch or double-tap that follows is read from it.
     */
    const anchorZoom = useCallback(() => {
      const native = nativeRef.current;
      if (nativeZoomRef.current > MIN_SCALE && !native.dirty) return;
      native.base = native.last;
      native.dirty = false;
      native.moved = false;
      if (setNativeZoom(MIN_SCALE)) pushZoom();
    }, [pushZoom, setNativeZoom]);

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
      anchorZoom();
      if (!turnRef.current && canShoot()) capture.refresh(pageRef.current);
    }, [anchorZoom, canShoot, capture]);

    /** Moves the document view. Nothing here animates; the stage does that. */
    const applyPage = useCallback((target: number) => {
      const page = Math.round(Number(target));
      if (!Number.isFinite(page)) return;

      const total = totalPagesRef.current;
      const next = Math.min(Math.max(page, 1), total > 0 ? total : page);
      if (!readyRef.current || next === docPageRef.current) return;

      docPageRef.current = next;
      // The page is only ever moved unzoomed, so what the view says about the
      // page it lands on is that page's size and not a zoom.
      nativeRef.current.moved = true;
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
        if (bareRef.current !== null) {
          cancelAnimationFrame(bareRef.current);
          bareRef.current = null;
        }
        if (coverTimerRef.current) {
          clearTimeout(coverTimerRef.current);
          coverTimerRef.current = null;
        }
        if (coverFrameRef.current !== null) {
          cancelAnimationFrame(coverFrameRef.current);
          coverFrameRef.current = null;
        }
        waitRef.current = null;
        turnRef.current = null;

        const total = totalPagesRef.current;
        const landed = Math.min(Math.max(finalPage, 1), total > 0 ? total : finalPage);
        pageRef.current = landed;
        boundsRef.current?.(landed, total);
        setFold(null);
        // The page landed on may have been photographed on an earlier visit;
        // if so its picture is decoded now, ahead of the next fold.
        setReady(capture.shotOf(landed));
        // Unconditionally, and not from an effect on the layers coming down: a
        // fold that never got as far as mounting anything — a turn asked for
        // past the end of the book, say — still has to give the reader their
        // page back, and an effect that never runs would leave the book held
        // mid-turn for good.
        clearRef.current?.();
        handlers.current.onPageChanged(landed, total);
      },
      [capture],
    );

    /**
     * The leaf is covering the page, and the document view can be moved on
     * underneath it.
     *
     * Not from here directly: the leaf became opaque in a render that has not
     * been drawn yet, and a page changed under a leaf that is not yet there to
     * hide it is a page changed in plain sight. The effect below does the
     * moving, a frame after the commit.
     */
    const cover = useCallback(() => {
      const turn = turnRef.current;
      if (!turn || turn.covered || turn.landed) return;
      turn.covered = true;
      if (coverTimerRef.current) {
        clearTimeout(coverTimerRef.current);
        coverTimerRef.current = null;
      }
      setFold(current =>
        current && !current.covered ? { ...current, opaque: true, covered: true } : current,
      );
    }, []);

    /**
     * Whether the fold is ready to hide a page change: the picture of the page
     * in hand has been taken and drawn, or there is no picture coming and
     * blank paper is what it has. Called each time one of those changes, and
     * the timer above calls `cover` outright if none of them does in time.
     */
    const tryCover = useCallback(() => {
      const turn = turnRef.current;
      if (!turn || turn.covered || turn.landed || !turn.shot) return;
      if (turn.veil && !turn.veiled) return;
      cover();
    }, [cover]);

    /** The fold reports the front of its leaf on screen: the veil, going forward. */
    const handleLeafDrawn = useCallback(() => {
      const turn = turnRef.current;
      if (!turn || !turn.forward) return;
      turn.veiled = true;
      tryCover();
    }, [tryCover]);

    /** The fold reports the picture under its lifted half on screen: the veil, coming back. */
    const handleUnderDrawn = useCallback(() => {
      const turn = turnRef.current;
      if (!turn || turn.forward) return;
      turn.veiled = true;
      tryCover();
    }, [tryCover]);

    /**
     * A fold has begun.
     *
     * The picture is of the page in hand, whichever way the fold goes: on the
     * leaf going forward, under the lifted half coming back. The document view
     * is sent to the page the fold opens onto — but not yet. The picture is
     * being taken as the reader's finger lands, and a fold begun a few points
     * of travel later is usually ahead of it; until it has been drawn there is
     * nothing to hide the move behind. The view moves once there is, and
     * `PAGE_FLIP.coverMs` after the fold began at the latest.
     *
     * Going forward the wait costs nothing to look at: the flat part of the
     * leaf is see-through over the very page it is a picture of. Coming back
     * the leaf is the page before, unrolling from the spine, and its front is
     * paper until the document view is showing that page behind it — or its
     * picture from an earlier visit, if there is one, which the live page then
     * takes over from at the landing without a seam.
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
        // The picture of the page in hand — unless a newer one is on its way,
        // taken as the finger landed, which is worth the wait. A turn nobody
        // touched the page for — a control's — takes its own picture now,
        // off a page the view has not been moved from yet.
        const shooting = capture.pending();
        const veil = shooting ? null : capture.shotOf(from);
        if (!shooting && !veil) capture.refresh(from);
        const uri = forward ? veil : capture.shotOf(dest);
        const turn: Turn = {
          from,
          dest,
          forward,
          leaf: leafPage,
          uri,
          veil,
          shot: false,
          veiled: false,
          covered: false,
          bare: false,
          landed: false,
        };
        turnRef.current = turn;

        foldToken.current += 1;
        setFold({
          token: foldToken.current,
          leaf: uri,
          opaque: !forward,
          under: forward ? null : veil,
          covered: false,
        });

        // The shutter closes on the picture taken at touch, if one is still
        // being taken. Only then may the document view move: a picture is of
        // whatever the view shows when it is taken.
        void capture.settled().then(() => {
          if (turnRef.current !== turn) return;
          turn.shot = true;
          tryCover();
        });
        coverTimerRef.current = setTimeout(() => {
          coverTimerRef.current = null;
          if (turnRef.current === turn) cover();
        }, PAGE_FLIP.coverMs);
      },
      [capture, cover, tryCover],
    );

    // The document view is moved only once the picture is on screen and
    // covering it — after the commit that marked the fold covered, and then a
    // frame later again, because a view that has been laid out has not
    // necessarily been drawn.
    const coverStep = fold?.covered ? fold.token : 0;
    useEffect(() => {
      if (!coverStep || !turnRef.current) return undefined;
      coverFrameRef.current = requestAnimationFrame(() => {
        coverFrameRef.current = null;
        const turn = turnRef.current;
        if (turn && !turn.landed) applyPage(turn.dest);
      });
      return () => {
        if (coverFrameRef.current !== null) {
          cancelAnimationFrame(coverFrameRef.current);
          coverFrameRef.current = null;
        }
      };
    }, [applyPage, coverStep]);

    /**
     * The leaf has landed, turned or not.
     *
     * Either the document view is already on the page the leaf has landed on —
     * it went right over, and the view was moved mid-turn — or the fold is
     * back where it began, with the picture of the page in hand across the
     * whole page, which is the one moment the document view can be moved back
     * underneath it unseen. A turn carried through faster than its picture
     * could be drawn is the exception: the view is moved now, in the open,
     * because there is nothing left to hide it.
     */
    const handleFoldEnd = useCallback(
      (commit: boolean) => {
        const turn = turnRef.current;
        if (!turn) {
          closeFold(pageRef.current);
          return;
        }
        turn.landed = true;
        if (coverTimerRef.current) {
          clearTimeout(coverTimerRef.current);
          coverTimerRef.current = null;
        }

        const finalPage = commit ? turn.dest : turn.from;
        if (finalPage === docPageRef.current) {
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

    /**
     * The zoom, told to both on the UI thread, so each knows to leave a zoomed
     * page to the document view without waiting on a render.
     *
     * The swipe hears only the reader's own zoom, as it always has: its pager
     * is the document view's and needs no telling. The fold hears the document
     * view's zoom as well, because the fold is the one thing that would still
     * try to turn a pinched page.
     */
    const sinkZoom = useCallback(
      (control: number, native: number) => {
        setTurnZoom(control);
        setFlipZoom(Math.max(control, native));
      },
      [setFlipZoom, setTurnZoom],
    );
    zoomSinkRef.current = sinkZoom;
    useEffect(() => {
      pushZoom();
    }, [pushZoom, sinkZoom, zoom]);

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
        if (bareRef.current !== null) cancelAnimationFrame(bareRef.current);
        if (coverFrameRef.current !== null) cancelAnimationFrame(coverFrameRef.current);
        if (coverTimerRef.current) clearTimeout(coverTimerRef.current);
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
        // Not over a turn in flight. The fold would refuse to start a second
        // one, and a target left waiting here would be picked up by the
        // reader's next drag instead — a page turned by hand that landed
        // somewhere else entirely.
        if (folding && (turnRef.current || fold)) return;

        // A jump still travels: forwards if the page is ahead, back if behind,
        // so the movement agrees with what the reader asked for.
        targetRef.current = next;
        const dir: TurnDirection = next > pageRef.current ? 1 : -1;
        if (folding) startFold(dir);
        else startTurn(dir);
      },
      [fold, folding, startFold, startTurn],
    );

    useImperativeHandle(ref, () => ({ turn: turnPage, goTo: goToPage }), [goToPage, turnPage]);

    const handleLoadComplete = useCallback(
      (numberOfPages: number, _path: string, size?: Box) => {
        const total = Number.isFinite(numberOfPages) ? Math.max(0, Math.floor(numberOfPages)) : 0;
        totalPagesRef.current = total;
        readyRef.current = true;
        // A saved page from a longer edition of the file lands on the last
        // page, which is where the document view will put it too.
        if (total > 0 && pageRef.current > total) {
          pageRef.current = total;
          docPageRef.current = total;
        }
        setBounds(pageRef.current, total);
        // A freshly loaded document opens at the zoom it was asked for, and
        // nothing it did on its own before survives the reload.
        nativeRef.current = { last: 1, base: 1, moved: true, dirty: false };
        setNativeZoom(MIN_SCALE);
        pushZoom();

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
      [pushZoom, setBounds, setNativeZoom],
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
          const turn = turnRef.current;
          if (waitRef.current === landed) {
            const finalPage = landed;
            waitRef.current = null;
            landRef.current = requestAnimationFrame(() => {
              landRef.current = null;
              closeFold(finalPage);
            });
          } else if (!turn.forward && !turn.landed && !turn.bare && landed === turn.dest) {
            // Coming back, the page arriving is now behind the leaf. A leaf
            // with no picture of it has been paper until now, and is made
            // see-through so the page shows on it — a frame later, as above.
            // A leaf that has a picture keeps it: the live page is the same
            // page, and takes over from the picture at the landing.
            turn.bare = true;
            if (!turn.uri) {
              bareRef.current = requestAnimationFrame(() => {
                bareRef.current = null;
                if (turnRef.current !== turn || turn.landed) return;
                setFold(current =>
                  current && current.opaque ? { ...current, opaque: false } : current,
                );
              });
            }
          }
          return;
        }

        pageRef.current = landed;
        setBounds(landed, total);
        // A page arrived at under the document view's own zoom — panned to,
        // or paged to — makes the zoom's baseline the size of a page that has
        // gone. The next touch re-reads it.
        if (nativeZoomRef.current > MIN_SCALE) nativeRef.current.dirty = true;
        // The new page is here. A swipe still drawn back from a flick grows it
        // in from this, rather than guessing at when the pager would land.
        settleTurn();

        handlers.current.onPageChanged(landed, total);
      },
      [closeFold, setBounds, settleTurn],
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
    const readySource = useMemo(() => (ready ? { uri: ready } : null), [ready]);

    /**
     * How far the page's edges are from the stage's own: the bars, and the
     * band of stage above and below a page drawn to its shape.
     *
     * The document view is let run past the page box by that much on both
     * sides — the same on both, so that a page fitted to the view's width is
     * centred exactly on the box and nothing about the fold, the picture or
     * the touch changes. What it buys is the zoom: a page pinched larger now
     * runs out across the band and on under the chrome's glass instead of
     * stopping dead at its own edge. The box still clips the picture and
     * carries the fold; the view merely has more paper to show when the
     * reader asks for more.
     */
    const band = paged && boxHeight > 0 ? Math.max(0, (frame.height - boxHeight) / 2) : 0;
    const reach = paged && boxWidth > 0 ? Math.ceil(Math.max(insets.top, foot) + band) : 0;
    const sheetStyle = useMemo(
      () => (reach > 0 ? [styles.sheet, { top: -reach, bottom: -reach }] : styles.fill),
      [reach],
    );

    return (
      // The touch-end listeners claim nothing: they only say when the last
      // finger has gone, which is when a pinched page is seated again.
      <View
        style={[styles.stage, { backgroundColor: stage }]}
        onTouchEnd={handleStageTouchEnd}
        onTouchCancel={handleStageTouchEnd}>
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
                    // The give at either end of the book, which moves the whole
                    // page rather than folding it.
                    folding ? paperFlip.groupStyle : undefined,
                  ]}>
                  {/* The page's picture, decoded ahead of the fold that will
                      wear it. Invisible, outside what is photographed, and
                      the exact size of the leaf's face — the decoded image is
                      cached against its size, and a different size would be
                      a different decode. */}
                  {folding && readySource && boxWidth > 0 ? (
                    <Image
                      source={readySource}
                      fadeDuration={0}
                      style={[styles.decoder, { width: boxWidth, height: boxHeight }]}
                    />
                  ) : null}

                  {/* What a picture of the page is taken of, and what the fold
                      opens onto: the document view with the reader's tone over
                      it, which is the page exactly as they are reading it. */}
                  <View ref={shotRef} collapsable={false} style={styles.fill}>
                    {/* The sheet the document view is drawn on: the page box,
                        and past it above and below. A picture is of the box
                        alone; what runs past it is only ever seen under the
                        glass, and only once the reader has zoomed. */}
                    <View style={sheetStyle}>
                      <Pdf
                        key={sourceKey(source)}
                        ref={pdfRef}
                        source={source}
                        // Where the book opens. The document view clamps a
                        // page past the end and reports where it landed.
                        page={startPage}
                        style={pdfStyle}
                        horizontal={paged}
                        // The fold is the turn in this mode, so the pager's swipe
                        // is off (`scrollEnabled` below): left on, it would slide
                        // the page out from under its own leaf. On Android the
                        // pager's *snap* stays on regardless — swipe is off, so it
                        // cannot be swiped, and its snap is what carries a page the
                        // reader has zoomed back out of home to its own edge, as
                        // the tail of the zoom-out's own animation rather than as a
                        // jump after it. Scrolling comes back the moment the reader
                        // zooms in, because then a drag is how they move around
                        // the page.
                        enablePaging={paged && !zoomed && (!folding || SNAP_IN_FLIP)}
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
                        // The document view's own zoom, by pinch or double-tap,
                        // in every mode. A page it has zoomed pans under a drag
                        // whether or not its pager is on, and it reports the
                        // zoom back, which is what tells the fold to keep its
                        // hands off until the reader has zoomed out again.
                        enableDoubleTapZoom
                        enableAnnotationRendering={false}
                        showsVerticalScrollIndicator={false}
                        showsHorizontalScrollIndicator={false}
                        trustAllCerts
                        onLoadComplete={handleLoadComplete}
                        onLoadProgress={handleLoadProgress}
                        onPageChanged={handlePageChanged}
                        onPageSingleTap={handleSingleTap}
                        onScaleChanged={handleScaleChanged}
                        onError={handleError}
                        renderActivityIndicator={renderActivityIndicator}
                      />

                      {/* The tone, laid over the rendered page. Never over the
                        chrome — and inside the picture, so a leaf is folded in
                        the same paper the page under it is printed on. */}
                      {wash ? (
                        <View
                          pointerEvents="none"
                          style={[styles.wash, { backgroundColor: wash }]}
                        />
                      ) : null}
                    </View>
                  </View>

                  {/* The fold. Only while there is one: at rest the reader is
                      looking at the document view itself, at full fidelity. */}
                  {fold && boxWidth > 0 ? (
                    <PaperFold
                      width={boxWidth}
                      height={boxHeight}
                      fold={paperFlip.fold}
                      leaf={fold.leaf}
                      opaque={fold.opaque}
                      under={fold.under}
                      onLeafDrawn={handleLeafDrawn}
                      onUnderDrawn={handleUnderDrawn}
                      wash={wash}
                    />
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
  /** The document view's own extent: the page box, and past it top and bottom. */
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  /** Laid over the page box and never seen: it is there to be decoded. */
  decoder: {
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0,
  },
});
