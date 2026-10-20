import { describe, expect, it } from "vitest";

import {
  blockKey,
  captionMovesSchema,
  hasSharedMoves,
  isApart,
  layerIndex,
  lineElements,
  lostBlockKeys,
  MOVE_LIMIT_PCT,
  placementOf,
  resetElement,
  setApart,
  shiftElement,
  toggleLayer,
  withStyleMoves,
  type MoveTarget,
} from "@/features/captions/moves";
import { projectCaptionStyleSchema, resolveCaptionStyle } from "@/features/captions/project-style";

const thisBlock: MoveTarget = { key: "1200", element: "line-0", everyBlock: false };
const everyBlock: MoveTarget = { ...thisBlock, everyBlock: true };

describe("moving one block", () => {
  it("moves only the touched text of that block", () => {
    const moves = shiftElement(undefined, thisBlock, 3, -2);
    expect(placementOf(moves, "1200", "line-0")).toEqual({ x: 3, y: -2, layer: undefined });
    expect(placementOf(moves, "1200", "line-1")).toEqual({ x: 0, y: 0, layer: undefined });
    expect(placementOf(moves, "5000", "line-0")).toEqual({ x: 0, y: 0, layer: undefined });
  });

  it("adds the steps up and never leaves the frame", () => {
    let moves = shiftElement(undefined, thisBlock, 1, 0);
    moves = shiftElement(moves, thisBlock, 1, 0);
    expect(placementOf(moves, "1200", "line-0").x).toBe(2);
    moves = shiftElement(moves, thisBlock, 500, -500);
    expect(placementOf(moves, "1200", "line-0")).toMatchObject({
      x: MOVE_LIMIT_PCT,
      y: -MOVE_LIMIT_PCT,
    });
  });

  it("puts it back in its place, leaving nothing stored", () => {
    const moves = resetElement(shiftElement(undefined, thisBlock, 4, 4), thisBlock);
    expect(moves).toEqual({});
  });
});

describe("moving every block", () => {
  it("moves that text in every block, and a block's own move adds to it", () => {
    let moves = shiftElement(undefined, everyBlock, 0, -5);
    moves = shiftElement(moves, thisBlock, 2, 0);
    expect(placementOf(moves, "1200", "line-0")).toMatchObject({ x: 2, y: -5 });
    expect(placementOf(moves, "9999", "line-0")).toMatchObject({ x: 0, y: -5 });
    expect(hasSharedMoves(moves)).toBe(true);
  });

  it("a block kept apart does not follow the moves made for every block", () => {
    let moves = shiftElement(undefined, everyBlock, 0, -5);
    moves = setApart(moves, "1200", true);
    expect(isApart(moves, "1200")).toBe(true);
    expect(placementOf(moves, "1200", "line-0")).toMatchObject({ x: 0, y: 0 });
    expect(placementOf(moves, "3000", "line-0")).toMatchObject({ y: -5 });
    moves = setApart(moves, "1200", false);
    expect(placementOf(moves, "1200", "line-0")).toMatchObject({ y: -5 });
    expect(moves.blocks).toBeUndefined();
  });
});

describe("in front / behind", () => {
  it("toggles the layer, the same choice again goes back to normal", () => {
    let moves = toggleLayer(undefined, thisBlock, "back");
    expect(placementOf(moves, "1200", "line-0").layer).toBe("back");
    moves = toggleLayer(moves, thisBlock, "front");
    expect(placementOf(moves, "1200", "line-0").layer).toBe("front");
    moves = toggleLayer(moves, thisBlock, "front");
    expect(placementOf(moves, "1200", "line-0").layer).toBeUndefined();
    expect(moves).toEqual({});
  });

  it("orders the layers", () => {
    expect(layerIndex("back")).toBeLessThan(layerIndex(undefined));
    expect(layerIndex(undefined)).toBeLessThan(layerIndex("front"));
  });
});

describe("the elements of a block", () => {
  const words = [{ emphasis: false }, { emphasis: false }, { emphasis: true }, { emphasis: false }];

  it("stacked styles: the key word alone on its line is the 'emphasis' element", () => {
    expect(lineElements([[0, 1], [2], [3]], words, true)).toEqual(["line-0", "emphasis", "line-1"]);
  });

  it("one-line styles: lines are numbered, the key word moves inside its line", () => {
    expect(
      lineElements(
        [
          [0, 1],
          [2, 3],
        ],
        words,
        false,
      ),
    ).toEqual(["line-0", "line-1"]);
  });

  it("a block is known by the start of its first word", () => {
    expect(blockKey({ words: [{ start: 1234.4 }] })).toBe("1234");
  });
});

describe("saving", () => {
  it("keeps the moves of each style apart, and drops an empty one", () => {
    const moves = shiftElement(undefined, thisBlock, 1, 1);
    const all = withStyleMoves({}, "cinema", moves);
    expect(Object.keys(all)).toEqual(["cinema"]);
    expect(withStyleMoves(all, "cinema", {})).toEqual({});
  });

  it("is checked before being stored, and old projects without moves still open", () => {
    const moves = withStyleMoves({}, "minimal", shiftElement(undefined, everyBlock, 0, 3));
    expect(captionMovesSchema.safeParse(moves).success).toBe(true);
    expect(
      captionMovesSchema.safeParse({ cinema: { all: { "line-0": { x: 99, y: 0 } } } }).success,
    ).toBe(false);
    expect(captionMovesSchema.safeParse({ unknown: {} }).success).toBe(false);
    expect(projectCaptionStyleSchema.safeParse({ preset: "cinema" }).success).toBe(true);
    expect(resolveCaptionStyle({ preset: "cinema", moves }).moves).toEqual(moves);
    expect(resolveCaptionStyle({ preset: "cinema" }).moves).toEqual({});
  });
});

describe("safety", () => {
  it("a broken move never costs the style and its colours", () => {
    const resolved = resolveCaptionStyle({
      preset: "minimal",
      colors: { text: "#FF0000" },
      moves: { minimal: { all: { "line-0": { x: 999, y: 0 } } } },
    });
    expect(resolved.presetId).toBe("minimal");
    expect(resolved.colors).toEqual({ text: "#FF0000" });
    expect(resolved.moves).toEqual({});
  });

  it("past the block limit, a new block is not added but the others still move", () => {
    const blocks = Object.fromEntries(
      Array.from({ length: 3000 }, (_, index) => [String(index), { apart: true }]),
    );
    const full = { blocks };
    const next = shiftElement(full, { key: "999999", element: "line-0", everyBlock: false }, 1, 1);
    expect(next).toBe(full);
    const known = shiftElement(full, { key: "5", element: "line-0", everyBlock: false }, 1, 1);
    expect(placementOf(known, "5", "line-0")).toMatchObject({ x: 1, y: 1 });
    expect(captionMovesSchema.safeParse({ cinema: known }).success).toBe(true);
  });
});

describe("moves left behind by a change of the text", () => {
  const page = (start: number) => ({ words: [{ start }] });
  const moved = shiftElement(
    shiftElement(undefined, thisBlock, 3, 0),
    { key: "5000", element: "line-0", everyBlock: false },
    0,
    2,
  );

  it("finds nothing while every moved block is still on the video", () => {
    expect(lostBlockKeys(moved, [page(1200), page(5000)])).toEqual([]);
    expect(lostBlockKeys(undefined, [page(1200)])).toEqual([]);
  });

  it("finds a moved block whose first word is gone, never a block that was not moved", () => {
    expect(lostBlockKeys(moved, [page(1300), page(5000), page(7000)])).toEqual(["1200"]);
  });
});
