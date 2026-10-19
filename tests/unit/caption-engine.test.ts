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
import { PROTOTYPE_IDS, PROTOTYPE_PRESETS } from "@/features/captions/presets";
import { captionStyleSchema } from "@/features/captions/style";

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

describe("prototype styles", () => {
  it("are all valid styles", () => {
    for (const id of PROTOTYPE_IDS) {
      expect(captionStyleSchema.safeParse(PROTOTYPE_PRESETS[id]).success, id).toBe(true);
    }
  });

  it("end every entrance exactly at rest (no leftover offset, spread or split)", () => {
    for (const kind of ["pop", "track", "split", "flicker"] as const) {
      const end = motionIn(kind, 600, 600, { seed: 3 });
      expect(end.opacity, kind).toBeCloseTo(1);
      expect(end.scale, kind).toBeCloseTo(1);
      expect(end.spreadEm, kind).toBeCloseTo(0);
      expect(end.splitEm, kind).toBeCloseTo(0);
    }
  });
});

describe("visual safety", () => {
  it("neon flicker stays at or under 3 flashes per second, whatever the seed", () => {
    for (let seed = 0; seed < 50; seed++) {
      const rate = flashesPerSecond((t) => flickerAt(t, 650, seed), 1000);
      expect(rate, `seed ${seed}`).toBeLessThanOrEqual(3);
    }
  });

  it("the whole neon caption sputters together, not word after word", () => {
    const style = PROTOTYPE_PRESETS.flicker;
    const page = paginate(demoWords(), style)[0]!;
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

  it("draws every prototype frame identically twice", () => {
    for (const id of PROTOTYPE_IDS) {
      const style = PROTOTYPE_PRESETS[id];
      const page = paginate(demoWords(), style)[1]!;
      for (const t of [page.start, page.start + 50, page.start + 200, page.end + 60]) {
        expect(wordMotionAt(page, 0, t, style), id).toEqual(wordMotionAt(page, 0, t, style));
      }
    }
  });
});

describe("karaoke fill", () => {
  it("follows the exact duration of the word", () => {
    const page = paginate(demoWords(), PROTOTYPE_PRESETS.fill)[0]!;
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
    const style = PROTOTYPE_PRESETS.spring;
    const page = paginate(demoWords(), style)[0]!;
    const appear = page.words[0]!.start - 120;
    expect(blurSamples(page, 0, appear + 40, 60, style).length).toBeGreaterThan(0);
    expect(blurSamples(page, 0, appear + 1500, 60, style)).toEqual([]);
    expect(blurSamples(page, 0, appear + 40, 60, PROTOTYPE_PRESETS.fill)).toEqual([]);
  });
});
