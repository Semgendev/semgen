import { describe, expect, it } from "vitest";

import { demoWords } from "@/features/captions/dev/demo-words";
import {
  blurSamples,
  fillProgress,
  flickerAt,
  motionIn,
  seeded,
  wordMotionAt,
} from "@/features/captions/motion";
import { paginate } from "@/features/captions/paginate";
import { CAPTION_PRESETS, PRESET_IDS } from "@/features/captions/presets";
import type { CaptionStyle } from "@/features/captions/style";

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
