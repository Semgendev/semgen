// Keeps every caption inside the safe zone of the video: the text is never cut by the frame nor
// hidden under the TikTok / Reels buttons. Too long → the whole caption gets a bit smaller (the
// hierarchy between the words stays the same).

// The caption block never goes above / below these lines (% of the frame height).
export const SAFE_TOP_PCT = 10;
export const SAFE_BOTTOM_PCT = 86;
// and never takes more than this share of the height
export const MAX_BLOCK_HEIGHT_PCT = 38;

export type BlockSize = { width: number; height: number };

// Scale (≤ 1) that makes a block fit in the space it has.
export function fitScale(block: BlockSize, room: BlockSize): number {
  if (block.width <= 0 || block.height <= 0) return 1;
  return Math.min(1, room.width / block.width, room.height / block.height);
}

// Centre of the block (in px from the top) moved just enough to stay between the safe lines.
export function safeCenterY(wantedY: number, blockHeight: number, frameHeight: number): number {
  const top = (SAFE_TOP_PCT / 100) * frameHeight + blockHeight / 2;
  const bottom = (SAFE_BOTTOM_PCT / 100) * frameHeight - blockHeight / 2;
  if (top > bottom) return frameHeight / 2;
  return Math.min(bottom, Math.max(top, wantedY));
}

// Average width of a letter, in em, when the real font cannot be measured (tests, server).
const FALLBACK_EM_PER_CHAR = 0.56;

let context: CanvasRenderingContext2D | null | undefined;
const cache = new Map<string, number>();

function canvasContext(): CanvasRenderingContext2D | null {
  if (context !== undefined) return context;
  context =
    typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  return context;
}

// Width of a text in px, measured with the real font once it is loaded (the same in the preview and
// in the export, which both run in Chrome).
export function measureText(text: string, font: string, letterSpacingPx: number): number {
  const chars = Array.from(text).length;
  const key = `${font}|${text}`;
  const known = cache.get(key);
  if (known !== undefined) return known + letterSpacingPx * chars;
  const ctx = canvasContext();
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 16);
  if (!ctx) return chars * size * FALLBACK_EM_PER_CHAR + letterSpacingPx * chars;
  ctx.font = font;
  const width = ctx.measureText(text).width;
  // cache only real measures: before the font is loaded, the fallback font is measured
  if (typeof document !== "undefined" && document.fonts?.check(font)) cache.set(key, width);
  return width + letterSpacingPx * chars;
}
