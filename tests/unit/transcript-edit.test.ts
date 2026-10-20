import { describe, expect, it } from "vitest";

import {
  countMatches,
  deleteRange,
  deleteWord,
  editWord,
  findMatchIndices,
  isValidDraft,
  replaceAll,
  replaceAt,
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

describe("cuts made by hand follow the words", () => {
  const cuts = { cinema: "break" as const };

  it("keeps the cut before the first word when one word becomes several", () => {
    const draft = makeDraft();
    draft.words[2] = { ...draft.words[2]!, cuts };
    const next = editWord(draft, 2, "grandes idées.");
    expect(next?.words[2]?.cuts).toEqual(cuts);
    expect(next?.words[3]?.cuts).toBeUndefined();
  });

  it("moves the cut to the next word when its word is deleted", () => {
    const draft = makeDraft();
    draft.words[2] = { ...draft.words[2]!, cuts };
    const next = deleteWord(draft, 2);
    expect(next?.words[2]?.text).toBe("Merci");
    expect(next?.words[2]?.cuts).toEqual(cuts);
  });

  it("keeps both cuts when the next word already has its own", () => {
    const draft = makeDraft();
    draft.words[2] = { ...draft.words[2]!, cuts: { cinema: "break", minimal: "break" } };
    draft.words[3] = { ...draft.words[3]!, cuts: { cinema: "join" } };
    expect(deleteWord(draft, 2)?.words[2]?.cuts).toEqual({ cinema: "join", minimal: "break" });
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

describe("deleteRange (the cross on a block of the video)", () => {
  it("removes a whole run of words and keeps the segments in step", () => {
    const next = deleteRange(makeDraft(), 0, 2);
    expect(next?.words.map((one) => one.text)).toEqual(["Merci", "beaucoup"]);
    expect(next && isValidDraft(next)).toBe(true);
  });

  it("never empties the transcript: one word always stays", () => {
    const next = deleteRange(makeDraft(), 0, 4);
    expect(next?.words).toHaveLength(1);
  });

  it("returns null when nothing can be removed", () => {
    const one = {
      words: [word("Salut", 0, 300)],
      segments: buildSegments([word("Salut", 0, 300)]),
    };
    expect(deleteRange(one, 0, 0)).toBeNull();
    expect(deleteRange(makeDraft(), 9, 12)).toBeNull();
  });
});
