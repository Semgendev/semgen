import { describe, expect, it } from "vitest";

import { bestCut, breakScore, gluePunctuation } from "@/features/captions/breaks";
import { fitScale, safeCenterY } from "@/features/captions/fit";
import { layoutLines } from "@/features/captions/motion";
import { paginate } from "@/features/captions/paginate";
import type { TranscriptWord } from "@/features/transcription/types";

const NBSP = " ";

function spoken(text: string, gapMs = 40): TranscriptWord[] {
  let time = 0;
  return text.split(" ").map((word) => {
    const item = { text: word, start: time, end: time + 250, confidence: 1, speaker: null };
    time += 250 + gapMs;
    return item;
  });
}

const texts = (words: { text: string }[]) => words.map((word) => word.text).join(" ");

describe("punctuation", () => {
  it("glues a lonely '!' to the word before with a no-break space", () => {
    const glued = gluePunctuation(spoken("chez toi demain !"));
    expect(glued.map((word) => word.text)).toEqual(["chez", "toi", `demain${NBSP}!`]);
    expect(glued[2]!.end).toBe(spoken("chez toi demain !")[3]!.end);
  });

  it("glues French quotes inside, and commas without a space", () => {
    const glued = gluePunctuation(spoken("il a dit « bonjour » , puis"));
    expect(glued.map((word) => word.text)).toEqual([
      "il",
      "a",
      "dit",
      `«${NBSP}bonjour${NBSP}»,`,
      "puis",
    ]);
  });
});

describe("where to cut", () => {
  it("prefers sentence ends, then commas, then before a linking word", () => {
    expect(breakScore("demain.", "On")).toBeGreaterThan(breakScore("Salut,", "je"));
    expect(breakScore("Salut,", "je")).toBeGreaterThan(breakScore("vite", "et"));
    expect(breakScore("vite", "et")).toBeGreaterThan(breakScore("vite", "maison"));
  });

  it("never cuts between a small binding word and the next one", () => {
    expect(breakScore("chez", "toi")).toBeLessThan(0);
    expect(breakScore("la", "qualité")).toBeLessThan(0);
    expect(breakScore("l'", "école")).toBeLessThan(0);
  });

  it("balances two lines at a natural place", () => {
    const words = ["Salut,", "je", "viendrai", "chez", "toi", `demain${NBSP}!`];
    expect(bestCut(words, { balance: 12 })).toBe(3);
  });
});

describe("paginate with sentence-aware cuts", () => {
  it("never separates 'chez' from 'toi', nor leaves '!' alone", () => {
    const pages = paginate(spoken("Salut, je viendrai chez toi demain !"), {
      maxWordsPerPage: 4,
      maxCharsPerLine: 14,
      layout: "line",
      grouping: "phrase",
    });
    const all = pages.map((page) => texts(page.words));
    expect(all.some((text) => /chez$/.test(text))).toBe(false);
    expect(all.some((text) => text.trim() === "!")).toBe(false);
    expect(all.join(" ")).toBe(`Salut, je viendrai chez toi demain${NBSP}!`);
  });

  it("cuts a long sentence after its comma rather than in the middle of a phrase", () => {
    const pages = paginate(spoken("Quand tu viendras demain matin, on ira voir la mer ensemble"), {
      maxWordsPerPage: 6,
      maxCharsPerLine: 18,
      layout: "line",
      grouping: "phrase",
    });
    expect(texts(pages[0]!.words)).toBe("Quand tu viendras demain matin,");
  });
});

describe("lines", () => {
  it("puts the '!' on the same line as its word", () => {
    const words = gluePunctuation(spoken("Salut, je viendrai chez toi demain !")).map((word) => ({
      text: word.text,
      emphasis: false,
    }));
    const lines = layoutLines(words, { layout: "line", maxCharsPerLine: 20 });
    expect(lines).toEqual([
      [0, 1, 2],
      [3, 4, 5],
    ]);
  });
});

describe("safe zone", () => {
  it("shrinks a caption that is too wide or too tall, never enlarges it", () => {
    expect(fitScale({ width: 500, height: 100 }, { width: 900, height: 700 })).toBe(1);
    expect(fitScale({ width: 1800, height: 100 }, { width: 900, height: 700 })).toBe(0.5);
    expect(fitScale({ width: 400, height: 1400 }, { width: 900, height: 700 })).toBe(0.5);
  });

  it("moves the caption just enough to stay between the safe lines", () => {
    expect(safeCenterY(1000, 200, 1920)).toBe(1000);
    // too low: its bottom would go under the TikTok / Reels buttons
    expect(safeCenterY(1900, 200, 1920)).toBeCloseTo(1920 * 0.86 - 100);
    // too high
    expect(safeCenterY(0, 200, 1920)).toBeCloseTo(1920 * 0.1 + 100);
  });
});
