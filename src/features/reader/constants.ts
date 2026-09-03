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
 * takes the turn outright, because a leaf folding about its spine is not a
 * motion any pager can be talked into.
 *
 * The turn is two folds about the same instant. The page being read folds up
 * about the spine until it is edge-on and has no width at all, the document
 * view changes page inside that instant, and the page arrived at falls open
 * from the opposite edge. Both halves are real rotations in perspective, so
 * what the reader sees is a sheet of paper rather than a slide.
 *
 * Behind the leaf, for the whole turn, is a blank sheet in the same paper —
 * without it the fold would open onto the stage, and the illusion is over.
 */
export const PAGE_FLIP = {
  /** How long a touch may rest before it stops being a tap. */
  tapMs: 400,
  /** Travel before a touch reads as a drag rather than a tap. */
  slop: 8,
  /**
   * The lens the fold is seen through, in points. Smaller is a wider angle and
   * a more theatrical fold; larger flattens it. This is close to the page's own
   * height, which is what a book held at reading distance looks like.
   */
  perspective: 1000,
  /** How much of the frame a drag covers to fold the leaf all the way up. */
  travel: 0.62,
  /**
   * How far up a finger may actually fold it, as a share of the whole fold.
   *
   * Never quite all the way: the page only changes once the reader has let go,
   * so a leaf folded flat to edge-on under the finger would leave them holding
   * a blank sheet until they did. At 0.86 there is always a sliver of the page
   * they are leaving still in view, and the last of the fold is the app's.
   */
  dragLimit: 0.86,
  /** A fold let go of past this much of the way turns the page regardless. */
  commitRatio: 0.34,
  /** ...and so does a flick this fast (px/s), however short it was. */
  flickVelocity: 460,
  /** The least fold a flick has to have started before it counts as one. */
  flickMin: 0.05,
  /** How much of the fold a page at either end of the book is allowed. */
  edgeGive: 0.16,
  /** The leaf folding the rest of the way up, once the reader has let go. */
  outMs: 190,
  /** The new leaf falling open. Slower: it is landing, not leaving. */
  inMs: 300,
  /** A fold let go of short of the commit, dropping back flat. */
  settleMs: 250,
  /** How long the flip waits edge-on for the page it asked for. */
  graceMs: 220,
  /** How dark the crease goes at the top of the fold. */
  leafShade: 0.46,
  /** ...and the shadow the raised leaf casts on the sheet under it. */
  castShade: 0.34,
  /** How far across the leaf the crease reaches before it has faded out. */
  shadeSpread: 0.72,
} as const;
