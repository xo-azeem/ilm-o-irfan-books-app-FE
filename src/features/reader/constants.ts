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
 * rule this far above the foot of the screen.
 */
export const READER_RULE_INSET = 44;

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
 * takes the turn outright, because a leaf of paper turning over its spine is
 * not a motion any pager can be talked into.
 *
 * The leaf is a picture of the page taken the moment a finger comes down, laid
 * exactly over the real one. The document view underneath moves to the next
 * page the instant the fold begins, so what the fold reveals is the next page
 * itself, already there — the way the next page of a book is under the leaf
 * before anyone turns it. The picture then travels the whole way over: front
 * to ninety degrees, the back of the sheet from ninety to one-eighty, and off
 * the spine edge. Let go early and it lies back down; the document view goes
 * back to the page it left, under cover of the flat leaf.
 *
 * The numbers only make sense together, so they live together.
 */
export const PAGE_FLIP = {
  /** How long a touch may rest before it stops being a tap. */
  tapMs: 400,
  /** Travel before a touch reads as a drag rather than a tap. */
  slop: 8,
  /**
   * The lens the fold is seen through, in points. Smaller is a wider angle and
   * a more theatrical fold; larger flattens it. About the height of the page,
   * which is what a book held at reading distance looks like.
   */
  perspective: 1200,
  /** How much of the frame a drag covers to carry the leaf the whole way over. */
  travel: 0.6,
  /** A fold let go of past this much of the way over turns the page anyway. */
  commitRatio: 0.25,
  /** ...and so does a flick this fast (px/s), however short it was. */
  flickVelocity: 460,
  /** The least fold a flick has to have started before it counts as one. */
  flickMin: 0.04,
  /** How far (pt) a page at either end of the book follows the finger anyway. */
  edgeGive: 26,
  /** Finishing a fold the reader let go of. Scaled by how much is left. */
  commitMs: 340,
  /** The least of that finish, so the last degrees never snap. */
  commitMinMs: 140,
  /** A fold let go of short of the commit, lying back down. */
  settleMs: 260,
  /** A whole turn run by a control rather than a finger. */
  autoMs: 460,
  /**
   * How far off vertical the leaf tips when grabbed off-centre, in degrees.
   * Grabbed at the middle it turns square; grabbed at a corner it turns the
   * way a corner-grabbed page does, leading with the edge in the hand.
   */
  tiltDeg: 4.5,
  /**
   * How much paper the back of the leaf is. What is left over is the front's
   * ink showing through in mirror, which is what the back of a printed sheet
   * actually looks like.
   */
  backOpacity: 0.93,
  /** How dark the crease on the leaf goes, at the steepest of the fold. */
  leafShade: 0.42,
  /** ...and the shadow the raised leaf throws on the page beneath it. */
  castShade: 0.3,
  /** How far across the sheet the crease reaches before it has faded out. */
  shadeSpread: 0.72,
} as const;
