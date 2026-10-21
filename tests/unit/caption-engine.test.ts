import { describe, expect, it } from "vitest";

import { demoWords } from "@/features/captions/dev/demo-words";
import {
  blurSamples,
  fillProgress,
  flickerAt,
  entranceOf,
  letterSoftness,
  motionIn,
  seeded,
  wordMotionAt,
} from "@/features/captions/motion";
import { paginate } from "@/features/captions/paginate";
import {
  closingIndex,
  countedText,
  initialOf,
  ringPath,
  vignetteAmount,
} from "@/features/captions/remotion/captioned-video";
import { applyTweaks, hasEcho, hasLight } from "@/features/captions/tweaks";
import { CAPTION_PRESETS, NEW_PRESETS, PRESET_IDS } from "@/features/captions/presets";
import { captionStyleSchema, type CaptionStyle } from "@/features/captions/style";

// Counts flashes the WCAG way: a flash is a pair of opposing changes (down then up) of at least
// 20 % of the light, inside one second.
function flashesPerSecond(light: (t: number) => number, durationMs: number): number {
  const samples = Array.from({ length: Math.ceil(durationMs / 5) + 1 }, (_, i) => light(i * 5));
  let flashes = 0;
  let peak = samples[0] ?? 0;
  let dipping = false;
  let trough = peak;
  for (const value of samples) {
    if (!dipping) {
      if (value > peak) peak = value;
      if (peak - value >= 0.2) {
        dipping = true;
        trough = value;
      }
    } else {
      trough = Math.min(trough, value);
      if (value - trough >= 0.2) {
        flashes += 1;
        dipping = false;
        peak = value;
      }
    }
  }
  return flashes / Math.max(1, durationMs / 1000);
}

describe("entrances", () => {
  it("end every entrance exactly at rest (no leftover offset, blur, spread, split or wipe)", () => {
    const kinds = [
      "pop",
      "track",
      "split",
      "flicker",
      "blurRise",
      "ink",
      "converge",
      "breathe",
      "riseLetters",
    ] as const;
    for (const kind of kinds) {
      const end = motionIn(kind, 900, 900, { seed: 3 });
      expect(end.opacity, kind).toBeCloseTo(1);
      expect(end.scale, kind).toBeCloseTo(1);
      expect(end.translateYEm, kind).toBeCloseTo(0);
      expect(end.blurEm, kind).toBeCloseTo(0);
      expect(end.spreadEm, kind).toBeCloseTo(0);
      expect(end.splitEm, kind).toBeCloseTo(0);
      expect(end.wipe, kind).toBeCloseTo(1);
    }
  });

  it("writes ink from the left, slowly at the start and the end", () => {
    expect(motionIn("ink", 0, 800).wipe).toBeCloseTo(0);
    expect(motionIn("ink", 400, 800).wipe).toBeCloseTo(0.5);
    expect(motionIn("ink", 100, 800).wipe).toBeLessThan(0.125);
  });

  it("gathers the letters of a converging word from far apart", () => {
    expect(motionIn("converge", 30, 900).spreadEm).toBeGreaterThan(0.2);
    expect(motionIn("breathe", 30, 700).spreadEm).toBeLessThan(0.12);
  });

  it("gives the key word its own entrance when the style asks for it", () => {
    const style = CAPTION_PRESETS.converge;
    const page = paginate(demoWords(), style).find((item) => item.words.length > 1)!;
    const key = page.words.findIndex((word) => word.emphasis);
    const other = key === 0 ? 1 : 0;
    const at = (index: number) => Math.max(page.start, page.words[index]!.start - 120) + 40;
    expect(wordMotionAt(page, key, at(key), style).spreadEm).toBeGreaterThan(0.2);
    expect(wordMotionAt(page, other, at(other), style).spreadEm).toBe(0);
  });
});

describe("visual safety", () => {
  it("neon flicker stays at or under 3 flashes per second, whatever the seed", () => {
    for (let seed = 0; seed < 50; seed++) {
      const rate = flashesPerSecond((t) => flickerAt(t, 650, seed), 1000);
      expect(rate, `seed ${seed}`).toBeLessThanOrEqual(3);
    }
  });

  it("a flickering caption sputters as a whole, not word after word", () => {
    const style: CaptionStyle = {
      ...CAPTION_PRESETS.cinema,
      animation: { in: "flicker", inMs: 650, staggerMs: 0, out: "fade", outMs: 150 },
      seed: 7,
    };
    const page = paginate(demoWords(), style)[1]!;
    const at = page.start + 300;
    expect(wordMotionAt(page, 0, at, style).light).toBe(wordMotionAt(page, 1, at, style).light);
  });
});

describe("determinism (preview = export)", () => {
  it("gives the same 'random' number for the same seed", () => {
    expect(seeded(7, 3)).toBe(seeded(7, 3));
    expect(seeded(7, 3)).not.toBe(seeded(8, 3));
    expect(seeded(7, 3)).toBeGreaterThanOrEqual(0);
    expect(seeded(7, 3)).toBeLessThan(1);
  });

  it("draws every style frame identically twice", () => {
    for (const id of PRESET_IDS) {
      const style = CAPTION_PRESETS[id];
      const page = paginate(demoWords(), style)[1]!;
      for (const t of [page.start, page.start + 50, page.start + 200, page.end + 60]) {
        expect(wordMotionAt(page, 0, t, style), id).toEqual(wordMotionAt(page, 0, t, style));
      }
    }
  });
});

describe("karaoke fill", () => {
  it("follows the exact duration of the word", () => {
    const page = paginate(demoWords(), CAPTION_PRESETS.minimal)[0]!;
    const word = page.words[0]!;
    expect(fillProgress(page, 0, word.start - 200)).toBe(0);
    const middle = fillProgress(page, 0, (word.start + word.end) / 2);
    expect(middle).toBeGreaterThan(0.3);
    expect(middle).toBeLessThan(0.7);
    expect(fillProgress(page, 0, word.end)).toBe(1);
  });
});

describe("motion blur", () => {
  it("adds trail copies only while the word moves fast", () => {
    const style = CAPTION_PRESETS.pop;
    const page = paginate(demoWords(), style)[0]!;
    const appear = page.words[0]!.start - 120;
    expect(blurSamples(page, 0, appear + 40, 60, style).length).toBeGreaterThan(0);
    expect(blurSamples(page, 0, appear + 600, 60, style)).toEqual([]);
    expect(blurSamples(page, 0, appear + 40, 60, CAPTION_PRESETS.minimal)).toEqual([]);
  });
});

describe("styles of the reference videos", () => {
  it("are valid styles", () => {
    for (const id of PRESET_IDS) {
      expect(captionStyleSchema.safeParse(CAPTION_PRESETS[id]).success, id).toBe(true);
    }
  });

  it("end the new entrances exactly at rest", () => {
    for (const kind of ["slam", "echo", "whip", "focus"] as const) {
      const end = motionIn(kind, 1000, 1000);
      expect(end.opacity, kind).toBeCloseTo(1);
      expect(end.scale, kind).toBeCloseTo(1);
      expect(end.translateXEm, kind).toBeCloseTo(0);
      expect(end.blurEm, kind).toBeCloseTo(0);
      expect(end.echo, kind).toBeCloseTo(kind === "echo" ? 1 : 0);
      expect(end.light, kind).toBeCloseTo(1);
      expect(end.grow, kind).toBeCloseTo(1);
    }
  });

  it("slam rises into place, then its light swells and calms down", () => {
    expect(motionIn("slam", 20, 560).translateYEm).toBeGreaterThan(0.3);
    expect(motionIn("slam", 280, 560).light).toBeGreaterThan(1.7);
    expect(motionIn("slam", 560, 560).light).toBeCloseTo(1);
  });

  it("echo unrolls its column and keeps it", () => {
    expect(motionIn("echo", 30, 420).echo).toBeLessThan(0.5);
    expect(motionIn("echo", 420, 420).echo).toBeCloseTo(1);
  });

  it("whip comes in from the left", () => {
    expect(motionIn("whip", 10, 400).translateXEm).toBeLessThan(-0.4);
  });

  it("draws every frame identically twice", () => {
    for (const id of PRESET_IDS) {
      const style = CAPTION_PRESETS[id];
      const page = paginate(demoWords(), style)[1]!;
      for (const t of [page.start, page.start + 50, page.start + 200, page.end + 60]) {
        expect(wordMotionAt(page, 0, t, style), id).toEqual(wordMotionAt(page, 0, t, style));
      }
    }
  });
});

describe("second round of the new styles", () => {
  it("fly brings the small words from the left, the right and below", () => {
    const at = (index: number) => motionIn("fly", 10, 500, { index, seed: 4 });
    const sides = [0, 1, 2].map((index) => {
      const m = at(index);
      return m.translateXEm < -0.6
        ? "left"
        : m.translateXEm > 0.6
          ? "right"
          : m.translateYEm > 0.4
            ? "below"
            : "?";
    });
    expect(new Set(sides)).toEqual(new Set(["left", "right", "below"]));
    expect(motionIn("fly", 500, 500, { index: 2, seed: 4 }).translateXEm).toBeCloseTo(0);
  });

  it("drift sharpens the letters one after the other", () => {
    expect(letterSoftness(0.3, 0, 6)).toBeGreaterThan(letterSoftness(0.3, 5, 6));
    expect(letterSoftness(1, 5, 6)).toBe(1);
    expect(motionIn("drift", 900, 900).soft).toBeCloseTo(1);
  });

  it("the glow setting makes the light softer or stronger", () => {
    const spotlight = CAPTION_PRESETS.spotlight;
    const soft = applyTweaks(spotlight, { glow: 50 });
    const strong = applyTweaks(spotlight, { glow: 200 });
    expect(soft.emphasis.deepGlow?.intensity).toBeCloseTo(
      (spotlight.emphasis.deepGlow?.intensity ?? 0) / 2,
    );
    expect(strong.emphasis.deepGlow?.intensity).toBeGreaterThan(
      spotlight.emphasis.deepGlow?.intensity ?? 0,
    );
    expect(applyTweaks(spotlight, { glow: 0 }).emphasis.rays?.color.endsWith("00")).toBe(true);
    expect(hasLight(spotlight)).toBe(true);
    expect(hasLight(CAPTION_PRESETS.whisper)).toBe(false);
  });
});

describe("echo column", () => {
  it("lets the user make the copies more or less visible", () => {
    expect(applyTweaks(CAPTION_PRESETS.echo, { echo: 40 }).emphasis.echo?.opacity).toBeCloseTo(0.4);
    expect(hasEcho(CAPTION_PRESETS.echo)).toBe(true);
    expect(hasEcho(CAPTION_PRESETS.duo)).toBe(false);
  });
});

describe("second wave", () => {
  it("counts a number up to its value, keeping what is around it", () => {
    expect(countedText("15 000", 0.5)).toBe("7 500");
    expect(countedText("$100", 0)).toBe("$0");
    expect(countedText("4%", 1)).toBe("4%");
    expect(countedText("demain", 0.3)).toBe("demain");
  });

  it("gives the third family to a weighty last word only", () => {
    const page = (texts: string[]) => ({
      words: texts.map((text, index) => ({
        text,
        start: index,
        end: index,
        emphasis: index === 1,
      })),
    });
    const poster = CAPTION_PRESETS.poster;
    expect(closingIndex(page(["meet", "people", "behind", "shoes"]), poster)).toBe(3);
    expect(closingIndex(page(["bien", "regarde", "ce", "qui"]), poster)).toBe(-1);
    expect(closingIndex(page(["meet", "people", "shoes"]), CAPTION_PRESETS.duo)).toBe(-1);
  });

  it("keeps single words on their own for rapid styles", () => {
    const pages = paginate(demoWords(), CAPTION_PRESETS.burst);
    expect(pages.every((page) => page.words.length <= 2)).toBe(true);
    expect(pages.some((page) => page.words.length === 1)).toBe(true);
  });

  it("makes the number the key word when the style asks for it", () => {
    const pages = paginate(demoWords(), CAPTION_PRESETS.number);
    const withNumber = pages.find((page) => page.words.some((word) => /\d/.test(word.text)))!;
    expect(withNumber.words.find((word) => word.emphasis)?.text).toMatch(/\d/);
  });

  it("gives each caption one of the style's entrances", () => {
    const style = CAPTION_PRESETS.burst;
    const kinds = new Set(paginate(demoWords(), style).map((page) => entranceOf(page, style)));
    expect(kinds.size).toBeGreaterThan(2);
  });
});

describe("third wave", () => {
  it("draws the ring of a word little by little, always the same for the same word", () => {
    const empty = ringPath(1200, 0);
    const half = ringPath(1200, 0.5);
    const full = ringPath(1200, 1);
    expect(empty.split("L")).toHaveLength(1);
    expect(half.split("L").length).toBeLessThan(full.split("L").length);
    expect(full).toBe(ringPath(1200, 1));
    expect(full).not.toBe(ringPath(4800, 1));
  });

  it("darkens the edges only while a key word is on screen", () => {
    const style = NEW_PRESETS.acid;
    const pages = paginate(demoWords(), style);
    const page = pages.find((one) => one.words.some((word) => word.emphasis))!;
    const key = page.words.find((word) => word.emphasis)!;
    expect(vignetteAmount(pages, style, key.start + 600)).toBeCloseTo(style.vignette ?? 0, 2);
    expect(vignetteAmount(pages, style, 0)).toBe(0);
    expect(vignetteAmount(pages, CAPTION_PRESETS.cinema, key.start + 600)).toBe(0);
  });

  it("writes the key word in capitals when its own case says so", () => {
    expect(NEW_PRESETS.acid.emphasis.textCase).toBe("upper");
    expect(captionStyleSchema.safeParse(NEW_PRESETS.acid).success).toBe(true);
    expect(captionStyleSchema.safeParse(NEW_PRESETS.circle).success).toBe(true);
  });
});

describe("third wave, second step", () => {
  it("spells a key word out from its boxed capital", () => {
    const look = NEW_PRESETS.initials.emphasis;
    const start = initialOf(look, "demain", 1000, 900);
    expect(start?.first).toBe("D");
    expect(start?.others).toBe("emain");
    expect(start?.lock).toBe(0);
    const done = initialOf(look, "demain", 1000, 2000);
    expect(done?.lock).toBeCloseTo(1);
    expect(done?.rest).toBeCloseTo(1);
  });

  it("keeps joined scripts and words without letters whole", () => {
    const look = NEW_PRESETS.initials.emphasis;
    expect(initialOf(look, "مرحبًا", 0, 500)).toBeNull();
    expect(initialOf(look, "!", 0, 500)).toBeNull();
    expect(initialOf(CAPTION_PRESETS.cinema.emphasis, "demain", 0, 500)).toBeNull();
  });

  it("mixes the blend style with the video", () => {
    expect(NEW_PRESETS.blend.blend).toBe("difference");
    expect(captionStyleSchema.safeParse(NEW_PRESETS.blend).success).toBe(true);
    expect(captionStyleSchema.safeParse(NEW_PRESETS.initials).success).toBe(true);
  });
});
