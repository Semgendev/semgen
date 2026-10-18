import { describe, expect, it } from "vitest";

import {
  countMatches,
  deleteWord,
  editWord,
  findMatchIndices,
  isValidDraft,
  mergeWithPrevious,
  replaceAll,
  replaceAt,
  splitSegmentAt,
  type TranscriptDraft,
} from "@/features/transcription/edit";
import { buildSegments } from "@/features/transcription/logic";
import type { TranscriptWord } from "@/features/transcription/types";

function word(text: string, start: number, end: number): TranscriptWord {
  return { text, start, end, confidence: 0.9, speaker: null };
}

function makeDraft(): TranscriptDraft {
  const words = [
    word("Les", 0, 200),
    word("meilleur", 200, 600),
    word("idées.", 600, 1000),
    word("Merci", 3000, 3400),
    word("beaucoup", 3400, 4000),
  ];
  return { words, segments: buildSegments(words) };
}

describe("editWord", () => {
  it("fixes a word and keeps its timing", () => {
    const next = editWord(makeDraft(), 1, "  meilleures ");
    expect(next?.words[1]).toMatchObject({ text: "meilleures", start: 200, end: 600 });
    expect(next?.segments[0]?.text).toBe("Les meilleures idées.");
  });

  it("returns null for empty or unchanged text", () => {
    expect(editWord(makeDraft(), 1, "   ")).toBeNull();
    expect(editWord(makeDraft(), 1, "meilleur")).toBeNull();
    expect(editWord(makeDraft(), 99, "x")).toBeNull();
  });

  it("splits time between several typed words and shifts the next lines", () => {
    const next = editWord(makeDraft(), 1, "très bons");
    expect(next?.words.map((item) => item.text)).toEqual([
      "Les",
      "très",
      "bons",
      "idées.",
      "Merci",
      "beaucoup",
    ]);
    expect(next?.words[1]).toMatchObject({ start: 200, end: 400 });
    expect(next?.words[2]).toMatchObject({ start: 400, end: 600 });
    expect(next?.segments.map((segment) => [segment.word_start, segment.word_end])).toEqual([
      [0, 3],
      [4, 5],
    ]);
    expect(next && isValidDraft(next)).toBe(true);
  });
});

describe("mergeWithPrevious / splitSegmentAt", () => {
  it("merges a line into the previous one", () => {
    const merged = mergeWithPrevious(makeDraft(), 1);
    expect(merged?.segments).toHaveLength(1);
    expect(merged?.segments[0]).toMatchObject({ start: 0, end: 4000, word_start: 0, word_end: 4 });
    expect(mergeWithPrevious(makeDraft(), 0)).toBeNull();
  });

  it("splits a line before a word, and merging again restores it", () => {
    const split = splitSegmentAt(makeDraft(), 2);
    expect(split?.segments.map((segment) => segment.text)).toEqual([
      "Les meilleur",
      "idées.",
      "Merci beaucoup",
    ]);
    expect(split && mergeWithPrevious(split, 1)?.segments[0]?.text).toBe("Les meilleur idées.");
    expect(splitSegmentAt(makeDraft(), 0)).toBeNull();
  });
});

describe("findMatchIndices", () => {
  it("lists the words containing the text, case-insensitive by default", () => {
    const { words } = makeDraft();
    expect(findMatchIndices(words, "ME", false)).toEqual([1, 3]);
    expect(findMatchIndices(words, "ME", true)).toEqual([]);
    expect(findMatchIndices(words, "", false)).toEqual([]);
  });
});

describe("replaceAll", () => {
  it("counts and replaces matches inside words, ignoring case by default", () => {
    expect(countMatches(makeDraft().words, "MEILLEUR", false)).toBe(1);
    expect(countMatches(makeDraft().words, "MEILLEUR", true)).toBe(0);
    const result = replaceAll(makeDraft(), "meilleur", "meilleurs", false);
    expect(result.count).toBe(1);
    expect(result.draft.segments[0]?.text).toBe("Les meilleurs idées.");
  });

  it("never turns a word into an empty or multi-word text", () => {
    expect(replaceAll(makeDraft(), "Merci", "", false).count).toBe(0);
    expect(replaceAll(makeDraft(), "Merci", "a b", false).count).toBe(0);
  });

  it("treats the search text literally (no regex)", () => {
    expect(replaceAll(makeDraft(), ".*", "x", false).count).toBe(0);
    expect(replaceAll(makeDraft(), ".", "!", false).draft.words[2]?.text).toBe("idées!");
  });
});

describe("isValidDraft", () => {
  it("accepts a built draft and rejects broken lines", () => {
    const draft = makeDraft();
    expect(isValidDraft(draft)).toBe(true);
    const gap = { ...draft, segments: draft.segments.slice(1) };
    expect(isValidDraft(gap)).toBe(false);
    expect(isValidDraft({ words: [], segments: [] })).toBe(false);
  });
});

describe("deleteWord / replaceAt", () => {
  it("removes a word and keeps lines consistent", () => {
    const next = deleteWord(makeDraft(), 1);
    expect(next?.segments[0]?.text).toBe("Les idées.");
    expect(next?.segments.map((segment) => [segment.word_start, segment.word_end])).toEqual([
      [0, 1],
      [2, 3],
    ]);
    expect(next && isValidDraft(next)).toBe(true);
  });

  it("drops a line that becomes empty, but never the last word", () => {
    const single = deleteWord(makeDraft(), 2);
    const alone = deleteWord(deleteWord(single!, 0)!, 0);
    expect(alone?.segments).toHaveLength(1);
    expect(alone?.words).toHaveLength(2);
    const lonely = {
      words: [word("Seul", 0, 100)],
      segments: buildSegments([word("Seul", 0, 100)]),
    };
    expect(deleteWord(lonely, 0)).toBeNull();
  });

  it("replaces one result only", () => {
    const draft = {
      words: [word("Claude", 0, 100), word("claude.", 100, 200)],
      segments: buildSegments([word("Claude", 0, 100), word("claude.", 100, 200)]),
    };
    const one = replaceAt(draft, 1, "claude", "CLAUDE", false);
    expect(one?.words.map((item) => item.text)).toEqual(["Claude", "CLAUDE."]);
    expect(replaceAt(draft, 0, "zzz", "x", false)).toBeNull();
    const all = replaceAll(draft, "claude", "CLAUDE", false);
    expect(all.count).toBe(2);
    expect(all.draft.words.map((item) => item.text)).toEqual(["CLAUDE", "CLAUDE."]);
  });
});
