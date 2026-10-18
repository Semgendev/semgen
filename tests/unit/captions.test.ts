import { describe, expect, it } from "vitest";

import {
  isActiveWord,
  layoutLines,
  motionIn,
  motionOut,
  wordAppearAt,
  wordMotionAt,
} from "@/features/captions/motion";
import {
  BRIDGE_GAP_MS,
  findPageIndex,
  HOLD_MS,
  MIN_PAGE_MS,
  paginate,
  pickEmphasis,
  TEXT_LEAD_MS,
} from "@/features/captions/paginate";
import { CAPTION_PRESETS, PRESET_IDS } from "@/features/captions/presets";
import { resolveCaptionStyle } from "@/features/captions/project-style";
import { captionStyleSchema } from "@/features/captions/style";
import type { TranscriptWord } from "@/features/transcription/types";

function word(
  text: string,
  start: number,
  end: number,
  speaker: string | null = null,
): TranscriptWord {
  return { text, start, end, confidence: 0.9, speaker };
}

const line = { maxWordsPerPage: 4, maxCharsPerLine: 16, layout: "line" as const };

describe("presets", () => {
  it("are all valid styles", () => {
    for (const id of PRESET_IDS) {
      expect(captionStyleSchema.safeParse(CAPTION_PRESETS[id]).success, id).toBe(true);
    }
  });

  it("falls back to the default style for missing or broken saved data", () => {
    expect(resolveCaptionStyle(null).presetId).toBe("cinema");
    expect(resolveCaptionStyle({ preset: "nope" }).presetId).toBe("cinema");
    expect(resolveCaptionStyle({ preset: "neon" }).presetId).toBe("neon");
  });
});

describe("pickEmphasis", () => {
  it("picks the most meaningful word, never a small linking word", () => {
    expect(pickEmphasis([{ text: "les" }, { text: "résultats" }, { text: "comptent" }])).toBe(1);
    expect(pickEmphasis([{ text: "et" }, { text: "de" }, { text: "voilà" }])).toBe(2);
    expect(pickEmphasis([{ text: "gagne" }, { text: "1000€" }])).toBe(1);
    expect(pickEmphasis([{ text: "..." }])).toBe(-1);
  });
});

describe("paginate", () => {
  it("cuts on word count, sentence ends and long pauses, and drops hesitations", () => {
    const pages = paginate(
      [
        word("Salut", 0, 300),
        word("euh,", 300, 500),
        word("tout", 500, 700),
        word("le", 700, 800),
        word("monde.", 800, 1200),
        word("On", 3000, 3200),
        word("commence", 3200, 3700),
      ],
      line,
    );
    expect(pages.map((page) => page.words.map((item) => item.text).join(" "))).toEqual([
      "Salut tout le monde.",
      "On commence",
    ]);
    // a single key word per caption
    expect(pages.every((page) => page.words.filter((item) => item.emphasis).length === 1)).toBe(
      true,
    );
  });

  it("shows the text slightly before the voice", () => {
    const pages = paginate([word("Bonjour", 1000, 1400), word("à", 1400, 1500)], line);
    expect(pages[0]?.start).toBe(1000 - TEXT_LEAD_MS);
  });

  it("bridges short silences so the screen never flickers empty between captions", () => {
    const pages = paginate([word("Bonjour.", 0, 500), word("Merci.", 1500, 1900)], line);
    expect(pages[0]?.end).toBe(pages[1]?.start);
    expect(pages[1]?.end).toBe(1900 + HOLD_MS);
  });

  it("leaves after a long silence, but never before it could be read", () => {
    const gap = 500 + BRIDGE_GAP_MS + 1000;
    const pages = paginate([word("Oui.", 0, 200), word("Bien.", gap, gap + 300)], line);
    expect(pages[0]!.end - pages[0]!.start).toBeGreaterThanOrEqual(MIN_PAGE_MS);
    expect(pages[0]!.end).toBeLessThan(pages[1]!.start);
  });

  it("never cuts a caption before its last word is said", () => {
    const pages = paginate(
      [word("Vite.", 0, 300), word("Très", 320, 500), word("vite.", 500, 800)],
      line,
    );
    expect(pages[0]!.end).toBeGreaterThanOrEqual(300);
  });

  it("glues a lonely word to its neighbour instead of flashing it alone", () => {
    const words = [
      word("Salut", 0, 300),
      word("Claude,", 300, 700),
      word("j'espère", 700, 1100),
      word("que", 1100, 1300),
      word("bien.", 1300, 1700),
    ];
    const texts = paginate(words, line).map((page) => page.words.map((item) => item.text));
    expect(texts.every((group) => group.length > 1)).toBe(true);
  });

  it("starts a new caption when the speaker changes", () => {
    const pages = paginate([word("Oui", 0, 200, "A"), word("Non", 250, 400, "B")], line);
    expect(pages).toHaveLength(2);
  });
});

describe("findPageIndex", () => {
  const pages = [
    { start: 0, end: 1000 },
    { start: 2000, end: 3000 },
  ];
  it("finds the caption on screen, or none in the gaps", () => {
    expect(findPageIndex(pages, 500)).toBe(0);
    expect(findPageIndex(pages, 1500)).toBe(-1);
    expect(findPageIndex(pages, 2999)).toBe(1);
    expect(findPageIndex(pages, 3000)).toBe(-1);
  });
});

describe("motion", () => {
  it("is hidden before the start and at rest at the end of every entrance", () => {
    for (const kind of ["fade", "pop", "rise", "blur", "typewriter", "mask"] as const) {
      expect(motionIn(kind, -10, 300).opacity * motionIn(kind, -10, 300).reveal, kind).toBe(0);
      const end = motionIn(kind, 300, 300);
      expect(end.opacity, kind).toBeCloseTo(1);
      expect(end.scale, kind).toBeCloseTo(1);
      expect(end.translateYEm, kind).toBeCloseTo(0);
      expect(end.reveal, kind).toBeCloseTo(1);
    }
  });

  it("pops past its size before settling", () => {
    const peak = Math.max(...[60, 120, 180, 240].map((t) => motionIn("pop", t, 300).scale));
    expect(peak).toBeGreaterThan(1);
  });

  it("starts the exit only once the last word is said", () => {
    const style = CAPTION_PRESETS.cinema;
    const page = paginate([word("Fin.", 0, 500)], style)[0]!;
    expect(wordMotionAt(page, 0, 499, style).opacity).toBeCloseTo(1);
    expect(wordMotionAt(page, 0, page.end - 1, style).opacity).toBeLessThan(0.2);
  });

  it("keeps the active word lit through the tiny silences between words", () => {
    const page = paginate([word("Un", 0, 200), word("deux", 300, 500)], line)[0]!;
    expect(isActiveWord(page, 0, 250)).toBe(true);
    expect(isActiveWord(page, 1, 250)).toBe(false);
    expect(isActiveWord(page, 1, 300)).toBe(true);
  });

  it("fades out at the end of the caption", () => {
    expect(motionOut("fade", 0, 200).opacity).toBe(1);
    expect(motionOut("fade", 200, 200).opacity).toBeCloseTo(0);
  });

  it("is deterministic: same time, same picture (preview = export)", () => {
    const style = CAPTION_PRESETS.viral;
    const page = paginate([word("Encore", 0, 400), word("plus", 400, 800)], style)[0]!;
    expect(wordMotionAt(page, 1, 450, style)).toEqual(wordMotionAt(page, 1, 450, style));
  });

  it("shows words when spoken (word reveal) or one after the other (page reveal)", () => {
    const page = paginate([word("Un", 1000, 1200), word("deux", 1500, 1800)], line)[0]!;
    const byWord = { reveal: "word" as const, animation: CAPTION_PRESETS.viral.animation };
    expect(wordAppearAt(page, 1, byWord)).toBeLessThanOrEqual(1500);
    expect(wordAppearAt(page, 1, byWord)).toBeGreaterThan(1000);
    const byPage = { reveal: "page" as const, animation: CAPTION_PRESETS.cinema.animation };
    expect(wordAppearAt(page, 1, byPage)).toBe(
      page.start + CAPTION_PRESETS.cinema.animation.staggerMs,
    );
  });
});

describe("layoutLines", () => {
  const words = [
    { text: "Les", emphasis: false },
    { text: "résultats", emphasis: true },
    { text: "comptent", emphasis: false },
  ];
  it("stack: the key word alone, the others above and below", () => {
    expect(layoutLines(words, { layout: "stack", maxCharsPerLine: 16 })).toEqual([[0], [1], [2]]);
  });
  it("line: one line when it fits, else two balanced lines", () => {
    expect(layoutLines(words, { layout: "line", maxCharsPerLine: 30 })).toEqual([[0, 1, 2]]);
    expect(layoutLines(words, { layout: "line", maxCharsPerLine: 12 })).toEqual([[0, 1], [2]]);
  });
});
