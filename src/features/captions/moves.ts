import { z } from "zod";

import { PRESET_IDS } from "./presets";

// Texts moved by hand on the video. A caption (block) is made of elements: its lines ("line-0" is the
// top one, the key word's own line excluded) and its key word ("emphasis"). Each element can be
// shifted (in % of the frame, so it looks the same at any resolution) and put in front of / behind
// the others.
// A move is made for one block only, or for every block of the video ("all"). A block "kept apart"
// ignores the moves made for every block. Everything is stored per style: each style cuts the text
// its own way, so its blocks are not the same.

export const MOVE_LIMIT_PCT = 50;
export const MOVE_STEP_PCT = 1;
const MAX_LINES = 6;
const MAX_BLOCKS = 3000;

// "block" is the whole caption (all its lines and its key word) moved as one. Once a block is split,
// "text" (all its lines but the key word) and "emphasis" (the key word) move on their own.
export const ELEMENT_IDS = [
  "block",
  "text",
  "emphasis",
  ...Array.from({ length: MAX_LINES }, (_, index) => `line-${index}` as const),
] as const;
export type ElementId = (typeof ELEMENT_IDS)[number];

const offset = z.number().min(-MOVE_LIMIT_PCT).max(MOVE_LIMIT_PCT);
const moveSchema = z.object({
  x: offset,
  y: offset,
  layer: z.enum(["front", "back"]).optional(),
});
export type Move = z.infer<typeof moveSchema>;

const elementMovesSchema = z.partialRecord(z.enum(ELEMENT_IDS), moveSchema);
export type ElementMoves = z.infer<typeof elementMovesSchema>;

// the two parts of a split block
export const PART_IDS = ["text", "emphasis"] as const;
export type PartId = (typeof PART_IDS)[number];

const blockMovesSchema = z.object({
  // ignores the moves made for every block
  apart: z.boolean().optional(),
  // the block is shown as two parts (its text, its key word) that move and hide on their own
  split: z.boolean().optional(),
  // a part hidden on the video (its words stay in the transcript)
  hidden: z.object({ text: z.boolean().optional(), emphasis: z.boolean().optional() }).optional(),
  elements: elementMovesSchema.optional(),
});
export type BlockMoves = z.infer<typeof blockMovesSchema>;

export const styleMovesSchema = z.object({
  all: elementMovesSchema.optional(),
  // key = start of the block's first word, in ms (stays the same when words are corrected)
  blocks: z
    .record(z.string().regex(/^\d{1,9}$/), blockMovesSchema)
    .refine((blocks) => Object.keys(blocks).length <= MAX_BLOCKS)
    .optional(),
});
export type StyleMoves = z.infer<typeof styleMovesSchema>;

export const captionMovesSchema = z.partialRecord(z.enum(PRESET_IDS), styleMovesSchema);
export type CaptionMoves = z.infer<typeof captionMovesSchema>;

export type Placement = { x: number; y: number; layer: Move["layer"] };
const NOWHERE: Placement = { x: 0, y: 0, layer: undefined };

// The element each line of a block is: the key word alone on its line (stacked styles) is the
// "emphasis" element, the other lines are numbered from the top. Past MAX_LINES: not movable.
export function lineElements(
  lines: number[][],
  words: { emphasis: boolean }[],
  stacked: boolean,
): (ElementId | null)[] {
  let count = 0;
  return lines.map((line) => {
    const first = line[0];
    if (stacked && line.length === 1 && first !== undefined && words[first]?.emphasis) {
      return "emphasis";
    }
    const id = count < MAX_LINES ? (`line-${count}` as const) : null;
    count += 1;
    return id;
  });
}

// Stacking order of an element: behind the others, normal, in front.
export function layerIndex(layer: Move["layer"]): number {
  return layer === "back" ? 0 : layer === "front" ? 3 : 1;
}

export function blockKey(page: { words: { start: number }[] }): string {
  return String(Math.max(0, Math.round(page.words[0]?.start ?? 0)));
}

// Where an element of a block really goes: the move made for every block (unless the block is kept
// apart), plus the block's own move. The block's own layer wins.
export function placementOf(
  moves: StyleMoves | undefined,
  key: string,
  element: ElementId,
): Placement {
  if (!moves) return NOWHERE;
  const block = moves.blocks?.[key];
  const shared = block?.apart ? undefined : moves.all?.[element];
  const own = block?.elements?.[element];
  if (!shared && !own) return NOWHERE;
  return {
    x: (shared?.x ?? 0) + (own?.x ?? 0),
    y: (shared?.y ?? 0) + (own?.y ?? 0),
    layer: own?.layer ?? shared?.layer,
  };
}

const clamp = (value: number) =>
  Math.round(Math.min(MOVE_LIMIT_PCT, Math.max(-MOVE_LIMIT_PCT, value)) * 100) / 100;

function cleaned(move: Move): Move | undefined {
  return move.x === 0 && move.y === 0 && !move.layer ? undefined : move;
}

function withElement(
  elements: ElementMoves | undefined,
  element: ElementId,
  change: (move: Move) => Move | undefined,
): ElementMoves | undefined {
  const next: ElementMoves = { ...elements };
  const changed = change(next[element] ?? { x: 0, y: 0 });
  const kept = changed ? cleaned(changed) : undefined;
  if (kept) next[element] = kept;
  else delete next[element];
  return Object.keys(next).length > 0 ? next : undefined;
}

function withBlock(
  moves: StyleMoves,
  key: string,
  change: (block: BlockMoves) => BlockMoves,
): StyleMoves {
  const blocks = { ...moves.blocks };
  // full: a new block is not added (the saves of everything else must keep working)
  if (!blocks[key] && Object.keys(blocks).length >= MAX_BLOCKS) return moves;
  const block = change(blocks[key] ?? {});
  if (block.apart || block.elements || block.split || block.hidden) blocks[key] = block;
  else delete blocks[key];
  const next: StyleMoves = { ...moves, blocks };
  if (Object.keys(blocks).length === 0) delete next.blocks;
  return next;
}

export type MoveTarget = { key: string; element: ElementId; everyBlock: boolean };

function changeElement(
  moves: StyleMoves | undefined,
  target: MoveTarget,
  change: (move: Move) => Move | undefined,
): StyleMoves {
  const base = moves ?? {};
  if (target.everyBlock) {
    const all = withElement(base.all, target.element, change);
    const next: StyleMoves = { ...base, all };
    if (!all) delete next.all;
    return next;
  }
  return withBlock(base, target.key, (block) => {
    const elements = withElement(block.elements, target.element, change);
    const next: BlockMoves = { ...block, elements };
    if (!elements) delete next.elements;
    return next;
  });
}

// Shifts an element (arrows, or a drag on the video), in % of the frame.
export function shiftElement(
  moves: StyleMoves | undefined,
  target: MoveTarget,
  dx: number,
  dy: number,
): StyleMoves {
  return changeElement(moves, target, (move) => ({
    ...move,
    x: clamp(move.x + dx),
    y: clamp(move.y + dy),
  }));
}

// Front / behind; the same choice again goes back to normal.
export function toggleLayer(
  moves: StyleMoves | undefined,
  target: MoveTarget,
  layer: "front" | "back",
): StyleMoves {
  return changeElement(moves, target, (move) => {
    const next = { ...move };
    if (move.layer === layer) delete next.layer;
    else next.layer = layer;
    return next;
  });
}

// Back to its base position (the place and layer the style gives it).
export function resetElement(moves: StyleMoves | undefined, target: MoveTarget): StyleMoves {
  return changeElement(moves, target, () => undefined);
}

export function setApart(moves: StyleMoves | undefined, key: string, apart: boolean): StyleMoves {
  return withBlock(moves ?? {}, key, (block) => {
    const next = { ...block };
    if (apart) next.apart = true;
    else delete next.apart;
    return next;
  });
}

export function isSplit(moves: StyleMoves | undefined, key: string): boolean {
  return Boolean(moves?.blocks?.[key]?.split);
}

export function hiddenParts(
  moves: StyleMoves | undefined,
  key: string,
): { text: boolean; emphasis: boolean } {
  const hidden = moves?.blocks?.[key]?.hidden;
  return { text: Boolean(hidden?.text), emphasis: Boolean(hidden?.emphasis) };
}

// Splits a block in two parts, or puts it back in one (the moves and the hidden flags of the two
// parts go; the moves of the whole block stay).
export function setSplit(moves: StyleMoves | undefined, key: string, split: boolean): StyleMoves {
  return withBlock(moves ?? {}, key, (block) => {
    const next = { ...block };
    if (split) {
      next.split = true;
      return next;
    }
    delete next.split;
    delete next.hidden;
    if (next.elements) {
      const elements = { ...next.elements };
      delete elements.text;
      delete elements.emphasis;
      if (Object.keys(elements).length > 0) next.elements = elements;
      else delete next.elements;
    }
    return next;
  });
}

// Hides (or shows again) one part of a split block on the video.
export function setHidden(
  moves: StyleMoves | undefined,
  key: string,
  part: PartId,
  hidden: boolean,
): StyleMoves {
  return withBlock(moves ?? {}, key, (block) => {
    const flags = { ...block.hidden };
    if (hidden) flags[part] = true;
    else delete flags[part];
    const next = { ...block };
    if (Object.keys(flags).length > 0) next.hidden = flags;
    else delete next.hidden;
    return next;
  });
}

export function isApart(moves: StyleMoves | undefined, key: string): boolean {
  return Boolean(moves?.blocks?.[key]?.apart);
}

export function hasSharedMoves(moves: StyleMoves | undefined): boolean {
  return Boolean(moves?.all && Object.keys(moves.all).length > 0);
}

export function hasMoves(moves: StyleMoves | undefined): boolean {
  return Boolean(moves && (moves.all || moves.blocks));
}

// The blocks that have a move of their own but are no longer on the video (a cut added or taken
// away, or the first word of the block deleted, changes the key of a block).
export function lostBlockKeys(
  moves: StyleMoves | undefined,
  pages: { words: { start: number }[] }[],
): string[] {
  const saved = Object.keys(moves?.blocks ?? {});
  if (saved.length === 0) return saved;
  const present = new Set(pages.map(blockKey));
  return saved.filter((key) => !present.has(key));
}

// The moves of one style replaced in the moves of every style (an empty one is dropped).
export function withStyleMoves(
  all: CaptionMoves,
  presetId: (typeof PRESET_IDS)[number],
  moves: StyleMoves,
): CaptionMoves {
  const next: CaptionMoves = { ...all };
  if (hasMoves(moves)) next[presetId] = moves;
  else delete next[presetId];
  return next;
}
