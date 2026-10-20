import { describe, expect, it } from "vitest";

import { layoutLines } from "@/features/captions/motion";
import { paginate } from "@/features/captions/paginate";
import { CAPTION_PRESETS, PRESET_IDS } from "@/features/captions/presets";
import { captionStyleSchema } from "@/features/captions/style";
import {
  breakBefore,
  captionLines,
  captionsForExport,
  hiddenCutCount,
  joinAt,
  restoreCuts,
} from "@/features/transcription/cuts";
import type { TranscriptDraft } from "@/features/transcription/edit";
import { buildSegments } from "@/features/transcription/logic";
import type { TranscriptWord } from "@/features/transcription/types";

// Words said one after the other, 300 ms each, without pauses.
function spoken(sentence: string, startMs = 0): TranscriptWord[] {
  return sentence.split(" ").map((text, index) => ({
    text,
    start: startMs + index * 300,
    end: startMs + index * 300 + 280,
    confidence: 0.9,
    speaker: null,
  }));
}

function draftOf(words: TranscriptWord[]): TranscriptDraft {
  return { words, segments: buildSegments(words) };
}

const cinema = CAPTION_PRESETS.cinema;
const minimal = CAPTION_PRESETS.minimal;
const SENTENCE = "Salut, j'espère que tu vas bien.";

function captionTexts(words: TranscriptWord[], style: typeof cinema, presetId: string): string[] {
  return paginate(words, style, presetId).map((page) => page.words.map((w) => w.text).join(" "));
}

describe("every style chooses how it cuts the text", () => {
  it("is required by the style schema, for every preset", () => {
    for (const id of PRESET_IDS) {
      expect(captionStyleSchema.parse(CAPTION_PRESETS[id]).grouping).toMatch(/^(sentence|phrase)$/);
    }
    const withoutGrouping: Partial<typeof cinema> = { ...cinema };
    delete withoutGrouping.grouping;
    expect(captionStyleSchema.safeParse(withoutGrouping).success).toBe(false);
  });

  it("Cinéma cuts the sentence in short pieces, Minimal keeps it whole", () => {
    const words = spoken(SENTENCE);
    expect(captionTexts(words, cinema, "cinema")).toEqual(["Salut, j'espère", "que tu vas bien."]);
    expect(captionTexts(words, minimal, "minimal")).toEqual([SENTENCE]);
  });

  it("Minimal still cuts a very long sentence where the sentence allows it", () => {
    const long =
      "Aujourd'hui je voudrais te parler de la meilleure façon de préparer ton voyage, et de tout ce qu'il faut emporter avec toi.";
    const pages = captionTexts(spoken(long), minimal, "minimal");
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.join(" ")).toBe(long);
    // never between "de" and its noun
    expect(pages.some((text) => /\b(de|la|ton)$/.test(text))).toBe(false);
  });

  it("Minimal keeps a sentence together through a short breath, Cinéma does not", () => {
    const words = [...spoken("Salut, j'espère"), ...spoken("que tu vas bien.", 1500)];
    expect(captionTexts(words, minimal, "minimal")).toHaveLength(1);
    expect(captionTexts(words, cinema, "cinema")).toHaveLength(2);
  });

  it("sets a long caption on three lines rather than two over-long ones", () => {
    const words = "un deux trois quatre cinq six sept huit neuf dix onze douze"
      .split(" ")
      .map((text) => ({ text, emphasis: false }));
    expect(layoutLines(words, { layout: "line", maxCharsPerLine: 20 }).length).toBe(3);
  });
});

describe("the transcript tab shows the captions of the style", () => {
  it("one line per caption, every word once (hesitations included)", () => {
    const words = spoken("Salut, euh j'espère que tu vas bien.");
    const lines = captionLines(paginate(words, cinema, "cinema"), words.length);
    expect(lines).toEqual([
      { word_start: 0, word_end: 2 },
      { word_start: 3, word_end: 6 },
    ]);
  });

  it("exports exactly the captions of the video", () => {
    const words = spoken("Salut, euh j'espère que tu vas bien.");
    const exported = captionsForExport(paginate(words, cinema, "cinema"));
    expect(exported.map((line) => line.text)).toEqual(["Salut, j'espère", "que tu vas bien."]);
  });

  it("has no line for an empty transcript", () => {
    expect(captionLines([], 0)).toEqual([]);
  });

  it("keeps every word in one line when only hesitations were said", () => {
    const words = spoken("euh hum euh");
    const pages = paginate(words, minimal, "minimal");
    expect(pages).toEqual([]);
    expect(captionLines(pages, words.length)).toEqual([{ word_start: 0, word_end: 2 }]);
  });

  it("never shows a lonely '!' at the very start as a caption", () => {
    const words = spoken("! Salut, j'espère que tu vas bien.");
    expect(captionTexts(words, minimal, "minimal")).toEqual([SENTENCE]);
    expect(captionLines(paginate(words, minimal, "minimal"), words.length)).toEqual([
      { word_start: 0, word_end: 6 },
    ]);
  });
});

describe("cuts made by hand", () => {
  it("a new line splits the caption in this style only", () => {
    const draft = breakBefore(draftOf(spoken(SENTENCE)), 1, "minimal");
    expect(draft).not.toBeNull();
    expect(captionTexts(draft!.words, minimal, "minimal")).toEqual([
      "Salut,",
      "j'espère que tu vas bien.",
    ]);
    // Cinéma keeps its own cuts
    expect(captionTexts(draft!.words, cinema, "cinema")).toEqual([
      "Salut, j'espère",
      "que tu vas bien.",
    ]);
    expect(hiddenCutCount(draft!.words, "cinema")).toBe(1);
  });

  it("back to my previous cuts: they apply to the new style, the rest follows the style", () => {
    const words = [...spoken(SENTENCE), ...spoken("Je t'appelle demain soir.", 2400)];
    const cut = breakBefore(draftOf(words), 1, "minimal")!;
    const restored = restoreCuts(cut, "cinema")!;
    expect(captionTexts(restored.words, cinema, "cinema")).toEqual([
      "Salut,",
      "j'espère que tu vas bien.",
      "Je t'appelle demain soir.",
    ]);
    // without the cut, Cinéma cuts the first sentence its own way
    expect(captionTexts(words, cinema, "cinema").slice(0, 2)).toEqual([
      "Salut, j'espère",
      "que tu vas bien.",
    ]);
    expect(hiddenCutCount(restored.words, "cinema")).toBe(0);
    expect(restoreCuts(restored, "cinema")).toBeNull();
    // copied, not moved: Minimal keeps its cut
    expect(captionTexts(restored.words, minimal, "minimal")[0]).toBe("Salut,");
  });

  it("merging glues two captions, whatever their length", () => {
    const words = spoken(SENTENCE);
    const second = captionLines(paginate(words, cinema, "cinema"), words.length)[1]!;
    const joined = joinAt(draftOf(words), second.word_start, cinema, "cinema")!;
    expect(captionTexts(joined.words, cinema, "cinema")).toEqual([SENTENCE]);
  });

  it("merging where I cut by hand just removes my cut", () => {
    const words = spoken(SENTENCE);
    const cut = breakBefore(draftOf(words), 1, "minimal")!;
    const joined = joinAt(cut, 1, minimal, "minimal")!;
    expect(joined.words[1]?.cuts).toBeUndefined();
    expect(captionTexts(joined.words, minimal, "minimal")).toEqual([SENTENCE]);
  });

  it("a cut before a hesitation moves to the next word shown", () => {
    const words = spoken("Salut, euh j'espère que tu vas bien.");
    const cut = breakBefore(draftOf(words), 1, "minimal")!;
    expect(captionTexts(cut.words, minimal, "minimal")).toEqual([
      "Salut,",
      "j'espère que tu vas bien.",
    ]);
  });

  it("the style cards ignore the cuts", () => {
    const cut = breakBefore(draftOf(spoken(SENTENCE)), 1, "minimal")!;
    expect(paginate(cut.words, minimal)).toHaveLength(1);
  });
});

describe("cuts are checked before saving", () => {
  it("accepts one cut per style, refuses unknown kinds and odd style names", async () => {
    const { transcriptWordSchema } = await import("@/features/transcription/types");
    const base = { text: "Salut", start: 0, end: 280, confidence: 0.9, speaker: null };
    expect(
      transcriptWordSchema.safeParse({ ...base, cuts: { cinema: "break", minimal: "join" } })
        .success,
    ).toBe(true);
    expect(transcriptWordSchema.safeParse(base).success).toBe(true);
    expect(transcriptWordSchema.safeParse({ ...base, cuts: { cinema: "cut" } }).success).toBe(
      false,
    );
    expect(transcriptWordSchema.safeParse({ ...base, cuts: { "<script>": "break" } }).success).toBe(
      false,
    );
  });
});
