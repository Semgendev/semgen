import { Easing, interpolate, spring } from "remotion";

import type { AnimationIn, AnimationOut, CaptionStyle } from "./style";
import { TEXT_LEAD_MS, type CaptionPage, type CaptionWord } from "./paginate";

// How a word looks at one instant. Pure: the same time always gives the same picture, which is what
// makes the preview and the exported video identical.
export type WordMotion = {
  opacity: number;
  translateYEm: number;
  scale: number;
  blurEm: number;
  // share of the word that is visible, from the left (typewriter) or from the bottom (mask)
  reveal: number;
  // extra space pushed between the letters (track), in em
  spreadEm: number;
  // distance of the coloured copies from the word (split), in em
  splitEm: number;
  // strength of the light (neon flicker): 1 = normal
  light: number;
};

export const RESTING: WordMotion = {
  opacity: 1,
  translateYEm: 0,
  scale: 1,
  blurEm: 0,
  reveal: 1,
  spreadEm: 0,
  splitEm: 0,
  light: 1,
};

type SpringConfig = { stiffness: number; damping: number; mass: number };
// Starting points from motion design practice, tuned by eye (docs/features/captions-animations.md §2.3).
export const SPRINGS = {
  pop: { stiffness: 220, damping: 14, mass: 0.6 },
  soft: { stiffness: 120, damping: 18, mass: 1 },
  snap: { stiffness: 300, damping: 12, mass: 0.5 },
} satisfies Record<string, SpringConfig>;

export type MotionOptions = { spring?: SpringConfig; seed?: number; index?: number };

// Deterministic "random" number in [0, 1) from a seed and an index (same input → same output, so
// the preview and the export always match).
export function seeded(seed: number, index: number): number {
  let x = (seed * 374761393 + index * 668265263) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

// Neon tube sputtering on: two short dips of light at seeded moments during the entrance, then
// steady. Two dips in under a second stay below the 3 flashes per second safety limit (WCAG 2.3.1).
export function flickerAt(t: number, durationMs: number, seed: number): number {
  if (t <= 0) return 0;
  if (t >= durationMs) return 1;
  const base = interpolate(t, [0, durationMs * 0.25], [0, 1], clamp);
  let light = base;
  for (let dip = 0; dip < 2; dip++) {
    const at = durationMs * (0.3 + 0.4 * seeded(seed, dip * 2) + dip * 0.05);
    const depth = 0.45 + 0.35 * seeded(seed, dip * 2 + 1);
    const width = 45;
    const distance = Math.abs(t - at);
    if (distance < width) light *= 1 - depth * (1 - distance / width);
  }
  return light;
}

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOutExpo = Easing.out(Easing.exp);

// A real spring (mass, stiffness, damping) that settles exactly at `durationMs`. Time is passed in
// ms with fps = 1000, so the curve does not depend on the frame rate of the video.
export function springAt(
  t: number,
  durationMs: number,
  config: { stiffness: number; damping: number; mass: number },
): number {
  if (t <= 0) return 0;
  if (t >= durationMs) return 1;
  return spring({ frame: t, fps: 1000, config, durationInFrames: durationMs });
}

// Opacity rises in a straight, fast line while the movement is still settling: the word is
// readable almost at once (what motion designers do).
function quickOpacity(t: number, durationMs: number): number {
  return interpolate(t, [0, Math.min(160, durationMs * 0.5)], [0, 1], clamp);
}

// `t` = time since the word started to appear, in ms.
export function motionIn(
  kind: AnimationIn,
  t: number,
  durationMs: number,
  options: MotionOptions = {},
): WordMotion {
  if (kind === "none" || durationMs <= 0) return t < 0 ? { ...RESTING, opacity: 0 } : RESTING;
  if (t < 0) return { ...RESTING, opacity: 0, reveal: 0 };
  const p = interpolate(t, [0, durationMs], [0, 1], clamp);
  switch (kind) {
    case "fade":
      return { ...RESTING, opacity: Easing.out(Easing.quad)(p) };
    case "pop": {
      // grows past its size (~8 %) then settles, on a spring
      const s = springAt(t, durationMs, options.spring ?? SPRINGS.pop);
      return { ...RESTING, opacity: quickOpacity(t, durationMs), scale: 0.6 + 0.4 * s };
    }
    case "rise": {
      const eased = easeOutExpo(p);
      return { ...RESTING, opacity: quickOpacity(t, durationMs), translateYEm: (1 - eased) * 0.45 };
    }
    case "blur": {
      const eased = easeOutExpo(p);
      return {
        ...RESTING,
        opacity: quickOpacity(t, durationMs),
        blurEm: (1 - eased) * 0.25,
        scale: 1 + (1 - eased) * 0.12,
      };
    }
    case "typewriter":
      return { ...RESTING, reveal: p };
    case "track": {
      // letters start far apart and slightly blurred, then close in softly (cinema titles)
      const s = springAt(t, durationMs, options.spring ?? SPRINGS.soft);
      return {
        ...RESTING,
        opacity: interpolate(t, [0, durationMs * 0.6], [0, 1], clamp),
        spreadEm: (1 - s) * 0.14,
        blurEm: (1 - s) * 0.06,
      };
    }
    case "flicker": {
      // same seed for the whole caption: its words sputter together (one flicker, not many)
      const light = flickerAt(t, durationMs, options.seed ?? 1);
      return { ...RESTING, opacity: light, light };
    }
    case "split": {
      // three coloured copies snap together on a spring, with a small punch of scale
      const s = springAt(t, durationMs, options.spring ?? SPRINGS.snap);
      return {
        ...RESTING,
        opacity: quickOpacity(t, durationMs),
        splitEm: (1 - s) * 0.18,
        scale: 1.06 - 0.06 * s,
      };
    }
    case "mask": {
      const eased = Easing.out(Easing.exp)(p);
      return { ...RESTING, reveal: eased, translateYEm: (1 - eased) * 0.35 };
    }
  }
}

// `t` = time since the caption started to leave, in ms.
export function motionOut(kind: AnimationOut, t: number, durationMs: number): WordMotion {
  if (kind === "none" || durationMs <= 0 || t <= 0) return RESTING;
  // the movement accelerates away, the opacity drops a bit earlier: a clean, quick exit
  const p = interpolate(t, [0, durationMs], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const opacity = 1 - interpolate(t, [0, durationMs * 0.85], [0, 1], clamp);
  switch (kind) {
    case "fade":
      return { ...RESTING, opacity };
    case "sink":
      return { ...RESTING, opacity, translateYEm: p * 0.3 };
    case "blur":
      return { ...RESTING, opacity, blurEm: p * 0.2, translateYEm: -p * 0.12 };
  }
}

export function combine(a: WordMotion, b: WordMotion): WordMotion {
  return {
    opacity: a.opacity * b.opacity,
    translateYEm: a.translateYEm + b.translateYEm,
    scale: a.scale * b.scale,
    blurEm: a.blurEm + b.blurEm,
    reveal: Math.min(a.reveal, b.reveal),
    spreadEm: a.spreadEm + b.spreadEm,
    splitEm: a.splitEm + b.splitEm,
    light: a.light * b.light,
  };
}

// When each word of a caption starts to appear.
export function wordAppearAt(
  page: CaptionPage,
  wordIndex: number,
  style: Pick<CaptionStyle, "reveal" | "animation">,
): number {
  const word = page.words[wordIndex];
  if (!word) return page.start;
  // Slightly ahead of the voice, so the word is readable when it is heard.
  if (style.reveal === "word") return Math.max(page.start, word.start - TEXT_LEAD_MS);
  return page.start + wordIndex * style.animation.staggerMs;
}

// The caption leaves once its time is over, and its exit overlaps the entrance of the next one: the
// two cross over smoothly instead of the text being swapped from one frame to the next.
export function exitMs(style: Pick<CaptionStyle, "animation">): number {
  return style.animation.out === "none" ? 0 : style.animation.outMs;
}

// Most of the exit happens just before the next caption shows up (never before the last word is
// said), so the two only overlap for a few frames and never read as a jumble of letters.
const EXIT_LEAD_SHARE = 0.6;

function leaveWindow(page: CaptionPage, outMs: number): { at: number; duration: number } {
  const at = Math.max(page.speechEnd, page.end - outMs * EXIT_LEAD_SHARE);
  return { at, duration: Math.max(0, page.end + outMs * (1 - EXIT_LEAD_SHARE) - at) };
}

// Full motion of one word at `timeMs`.
export function wordMotionAt(
  page: CaptionPage,
  wordIndex: number,
  timeMs: number,
  style: Pick<CaptionStyle, "reveal" | "animation" | "seed">,
): WordMotion {
  const appear = motionIn(
    style.animation.in,
    timeMs - wordAppearAt(page, wordIndex, style),
    style.animation.inMs,
    { spring: style.animation.spring, seed: (style.seed ?? 1) + page.start, index: wordIndex },
  );
  const leave = leaveWindow(page, exitMs(style));
  return combine(appear, motionOut(style.animation.out, timeMs - leave.at, leave.duration));
}

// How "on" the highlight of a word is (0 → 1). It lights up in a few frames and fades out a bit
// more slowly, so it glides from one word to the next instead of blinking.
const ACTIVE_RAMP_IN_MS = 90;
const ACTIVE_RAMP_OUT_MS = 140;

export function activeAmount(page: CaptionPage, wordIndex: number, timeMs: number): number {
  const window = activeWindow(page, wordIndex);
  const on = interpolate(timeMs, [window.start, window.start + ACTIVE_RAMP_IN_MS], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const off = interpolate(timeMs, [window.end, window.end + ACTIVE_RAMP_OUT_MS], [1, 0], {
    ...clamp,
    easing: Easing.inOut(Easing.quad),
  });
  return on * off;
}

// The highlight switches a hair before the voice (the eye is slower than the ear) and stays on
// through the tiny silences between words, so it never blinks off mid-sentence.
export const ACTIVE_LEAD_MS = 40;
const ACTIVE_BRIDGE_MS = 400;

export function activeWindow(page: CaptionPage, wordIndex: number): { start: number; end: number } {
  const word = page.words[wordIndex];
  if (!word) return { start: Infinity, end: -Infinity };
  const next = page.words[wordIndex + 1];
  const end =
    next && next.start - word.end <= ACTIVE_BRIDGE_MS ? next.start - ACTIVE_LEAD_MS : word.end;
  return { start: word.start - ACTIVE_LEAD_MS, end };
}

// Karaoke fill: share of the word already said (0 → 1), following its exact duration.
export function fillProgress(page: CaptionPage, wordIndex: number, timeMs: number): number {
  const word = page.words[wordIndex];
  if (!word) return 0;
  return interpolate(
    timeMs,
    [word.start - ACTIVE_LEAD_MS, word.end - ACTIVE_LEAD_MS],
    [0, 1],
    clamp,
  );
}

// Motion blur: where the word was half a frame earlier (180° shutter). When it moved enough, the
// renderer draws faint copies along the way, like a film camera does on fast motion.
export const BLUR_SAMPLES = [0.33, 0.66];

export function blurSamples(
  page: CaptionPage,
  wordIndex: number,
  timeMs: number,
  fps: number,
  style: Pick<CaptionStyle, "reveal" | "animation" | "seed">,
): WordMotion[] {
  if (!style.animation.motionBlur) return [];
  const shutter = 1000 / fps / 2;
  const now = wordMotionAt(page, wordIndex, timeMs, style);
  const before = wordMotionAt(page, wordIndex, timeMs - shutter, style);
  const moved =
    Math.abs(now.scale - before.scale) +
    Math.abs(now.translateYEm - before.translateYEm) +
    Math.abs(now.spreadEm - before.spreadEm) +
    Math.abs(now.splitEm - before.splitEm);
  if (moved < 0.012) return [];
  return BLUR_SAMPLES.map((share) =>
    wordMotionAt(page, wordIndex, timeMs - shutter * share, style),
  );
}

export function isActiveWord(page: CaptionPage, wordIndex: number, timeMs: number): boolean {
  const window = activeWindow(page, wordIndex);
  return timeMs >= window.start && timeMs < window.end;
}

export function applyCase(text: string, textCase: CaptionStyle["textCase"]): string {
  if (textCase === "upper") return text.toLocaleUpperCase();
  if (textCase === "lower") return text.toLocaleLowerCase();
  return text;
}

// Splits a caption into lines. "line": greedy fill, then balanced. "stack": words before the key
// word / the key word alone / words after it.
export function layoutLines(
  words: Pick<CaptionWord, "text" | "emphasis">[],
  style: Pick<CaptionStyle, "layout" | "maxCharsPerLine">,
): number[][] {
  const indices = words.map((_, index) => index);
  if (style.layout === "stack") {
    const key = words.findIndex((word) => word.emphasis);
    if (key < 0) return [indices];
    return [indices.slice(0, key), [key], indices.slice(key + 1)].filter((line) => line.length > 0);
  }
  const length = (line: number[]) =>
    line.reduce(
      (sum, index, position) => sum + (words[index]?.text.length ?? 0) + (position ? 1 : 0),
      0,
    );
  if (length(indices) <= style.maxCharsPerLine) return [indices];
  // two lines, cut where they are the most balanced
  let bestCut = 1;
  let bestDiff = Infinity;
  for (let cut = 1; cut < indices.length; cut++) {
    const diff = Math.abs(length(indices.slice(0, cut)) - length(indices.slice(cut)));
    if (diff < bestDiff) {
      bestDiff = diff;
      bestCut = cut;
    }
  }
  return [indices.slice(0, bestCut), indices.slice(bestCut)];
}
