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
