/**
 * How large to draw the page, given the shape of the page and of the screen.
 *
 * Nothing here is a pixel anybody typed. The frame is what the stage measured
 * on this device, at this orientation, this second; the aspect is the book's
 * own page; the fill limit is a fraction of the page's width, learnt from the
 * page's margins (`pageInk.ts`). So the same arithmetic gives a phone, a
 * tablet, a split screen and a rotation each their own answer, and a screen
 * nobody has seen yet gets a sensible one too.
 *
 * The page is drawn as wide as the frame at least, and wider — up to the fill
 * limit, and never wider than it takes to fill the height — while that buys
 * height. Anything past the frame's edge is the page's own margin, and the
 * stage clips it.
 *
 * Pure, and separate from the stage, so the shapes below can be checked
 * without a screen.
 */

export type Box = { width: number; height: number };

export function pageBox(
  frame: Box,
  aspect: number,
  fillLimit: number,
): Box | null {
  if (
    frame.width <= 0 ||
    frame.height <= 0 ||
    !Number.isFinite(aspect) ||
    aspect <= 0
  ) {
    return null;
  }

  // What it would take to fill the height outright, and what we will allow.
  const toFill = (frame.height * aspect) / frame.width;
  const fill = Math.min(Math.max(toFill, 1), fillLimit);
  const width = frame.width * fill;
  const height = Math.min(frame.height, width / aspect);

  // A page wider than it is tall fits the frame with room to spare, and is
  // better left alone than blown past the edges.
  return height >= frame.height
    ? { width: frame.height * aspect, height: frame.height }
    : { width, height };
}
