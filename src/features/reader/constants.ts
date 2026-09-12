export const MIN_SCALE = 1;
export const MAX_SCALE = 4;
export const SCALE_STEP = 0.25;

/**
 * How far past the frame a page may be drawn to fill more of the screen.
 *
 * A book page is about 2:3 and a phone about 9:19.5, so a page fitted whole
 * leaves a third of the screen empty above and below it. Drawing it wider than
 * the frame and letting the screen clip the overflow spends that space on the
 * page instead — but only the page's own margins may go, never a line of type,
 * which is what this ceiling is for: 1.18 puts roughly 8% of the width past
 * each edge, inside the margin of every book we carry.
 */
export const PAGE_FILL_LIMIT = 1.18;

/**
 * The stage's own furniture, which is on screen whether the chrome is or not:
 * the progress rule, and the line of status under it. `ReaderChrome` draws the
 * rule this far above the foot of the screen, and the status line sits in the
 * band between — one line of small capitals, and no more room than it needs,
 * because every point here is a point of glass over the page.
 */
export const READER_RULE_INSET = 22;

/** The same with the rule itself, which is what a page has to keep clear of. */
export const READER_FOOT = READER_RULE_INSET + 2;

/**
 * The page turn.
 *
 * Two pages move, and they move differently: the page being left behind draws
 * back and shrinks a little where it is, and the page arriving comes in from
 * the edge small and grows to full size over it. That asymmetry is the whole
 * effect, and it is why the stage carries two page surfaces — one transform
 * cannot scale two pages by different amounts.
 *
 * The numbers only make sense together, so they live together.
 */
export const PAGE_TURN = {
  /** How long a touch may rest before it stops being a tap. */
  tapMs: 400,
  /** Travel before a touch reads as a drag rather than a tap. */
  slop: 10,
  /** How small a page gets at the middle of a turn. Subtle, on purpose. */
  liftScale: 0.92,
  /** How much of that give a page at either end of the book is allowed. */
  edgeLift: 0.3,
  /** A flick this fast (px/s) is going to turn the page, however short it was. */
  flickVelocity: 520,
  /** ...and so is a drag that has already covered this much of a page. */
  flickRatio: 0.3,
  /** The page leaving drawing back, while the pager carries the turn on. */
  shrinkMs: 130,
  /** The page arriving growing into place. Slower: an arrival, not a snap. */
  growMs: 280,
  /** How long a turn waits for its new page before growing back regardless. */
  graceMs: 240,
  /** A drag let go of short of a turn, settling back. */
  settleMs: 240,
  /** A page jumped to rather than turned: dip out, change, come back. */
  dipMs: 160,
  /** The beat with the stage bare, while the document view changes page. */
  swapMs: 70,
  riseMs: 240,
} as const;

/**
 * The paper flip.
 *
 * A different idea from `PAGE_TURN` above, and it needs different numbers. The
 * swipe borrows the document view's pager and only lends it depth; this one
 * takes the turn outright, because a leaf of paper creasing over on itself is
 * not a motion any pager can be talked into.
 *
 * Grab the sheet anywhere — corner, edge, middle — and drag. The paper folds on
 * a real crease line, the page under it shows through where the sheet has
 * lifted, and the raised leaf carries its own shadow. Drag the other way to
 * come back to the page before. Let go past a third of the way and it turns;
 * short of that it drops back.
 *
 * The geometry of all that is in `paperFold.ts`. These are the numbers that
 * decide how it feels, and they only make sense together, so they live
 * together.
 */
export const PAGE_FLIP = {
  /** How long a touch may rest before it stops being a tap. */
  tapMs: 400,
  /** Travel before a touch reads as a drag rather than a tap. */
  slop: 8,
  /**
   * How much further the corner goes than the hand that is carrying it.
   *
   * A sheet lifts further than the finger travels — the hand moves an inch and
   * the corner comes up two — and this is the whole reason the fold feels like
   * paper under the thumb rather than a slider.
   */
  amplify: 2,
  /**
   * The corner chases the finger rather than being pinned to it: it closes
   * this much of the remaining gap on every pointer report, and a little less
   * on every frame between reports. A pointer stream is coarse and arrives in
   * bursts; a leaf of paper has weight, and this is where it comes from.
   */
  followTouch: 0.42,
  followFrame: 0.3,
  /**
   * A fold let go of past this much of the way turns the page regardless.
   *
   * The corner has come a third of its way to the far edge — a good handful
   * of page in the hand, and well short of the spine. Any less and the leaf
   * drops back where it came from, and stays there.
   */
  commitRatio: 0.3,
  /** ...and so does a flick this fast (pt/ms), however short it was. */
  flickVelocity: 0.46,
  /** The least fold a flick has to have started before it counts as one. */
  flickMin: 0.06,
  /**
   * How recently (ms) the finger has to have been moving, when it lifts, for
   * its speed to count as a flick. A finger that swept the page and then
   * stopped before letting go reports the speed of the sweep and none of the
   * stop; taken at face value that turns a page the reader was putting back.
   */
  flickWindowMs: 80,
  /** How far (pt) a page at either end of the book follows the finger anyway. */
  edgeGive: 26,
  /** ...and how much of the finger's travel it follows on the way there. */
  edgeFollow: 0.12,
  /** That give coming back once the reader has let go. */
  edgeMs: 250,
  /** The leaf carrying the rest of the way over, once the reader has let go. */
  turnMs: 340,
  /** A fold let go of short of the commit, dropping back flat. */
  settleMs: 260,
  /** A whole turn run by a control rather than a finger. */
  autoMs: 420,
  /**
   * How long the stage holds the landed leaf over the document view while it
   * changes page underneath. A turn ends with the leaf lying flat across the
   * whole page, which is the one moment the page beneath it can be swapped
   * unseen — but only for as long as the leaf is still there to hide it.
   */
  graceMs: 260,
  /**
   * How long a fold going forward waits for the leaf's picture to be drawn
   * before the document view is moved on underneath it regardless. Until the
   * picture is there the flat part of the leaf is see-through, so moving the
   * view early would show the next page where this one should still be.
   */
  coverMs: 320,
  /** How hard both shadows are laid on. 1 is the design; 0 is none of it. */
  shadowStrength: 1,
  /** The lit edge of the crease on the folded half. 0 turns it off. */
  curlHighlight: 0.62,
  /** The paper the leaf is cut from, and the slightly duller back of it. */
  paper: '#FBF9F4',
  paperBack: '#F7F4EC',
  /** The ink of the book: what its shading and its texture are drawn in. */
  ink: '48,48,43',
  /** How wide the shading along the spine reaches into the page, in points. */
  spine: 30,
} as const;
