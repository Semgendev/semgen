import { Easing, interpolate, spring } from "remotion";

import { bestCut } from "./breaks";
import type { AnimationIn, AnimationOut, CaptionStyle } from "./style";
import { TEXT_LEAD_MS, type CaptionPage, type CaptionWord } from "./paginate";

// How a word looks at one instant. Pure: the same time always gives the same picture, which is what
// makes the preview and the exported video identical.
export type WordMotion = {
  opacity: number;
  // sideways shift (whip), in em
  translateXEm: number;
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
  // share of the word written so far from the left, with a soft edge (ink)
  wipe: number;
  // progress of the letters rising one by one from behind a mask (1 = all in place)
  letters: number;
  // how open the copies of an echo column are (0 = folded into the word)
  echo: number;
  // entrance progress of the decorations drawn around the word (rays opening), 1 = in place
  grow: number;
  // progress of the letters coming out of a blur one after the other (drift), 1 = all sharp
  soft: number;
};

export const RESTING: WordMotion = {
  opacity: 1,
  translateXEm: 0,
  translateYEm: 0,
  scale: 1,
  blurEm: 0,
  reveal: 1,
  spreadEm: 0,
  splitEm: 0,
  light: 1,
  wipe: 1,
  letters: 1,
  echo: 0,
  grow: 1,
  soft: 1,
};

type SpringConfig = { stiffness: number; damping: number; mass: number };
// Starting points from motion design practice, tuned by eye (docs/features/captions-animations.md §2.3).
export const SPRINGS = {
  pop: { stiffness: 220, damping: 14, mass: 0.6 },
  soft: { stiffness: 120, damping: 18, mass: 1 },
  snap: { stiffness: 300, damping: 12, mass: 0.5 },
} satisfies Record<string, SpringConfig>;

// a light overshoot (about 6 %) that settles without bouncing back
const FLY_SPRING: SpringConfig = { stiffness: 170, damping: 15, mass: 0.8 };

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
// fast start, very long soft landing: the curve motion designers use for premium titles
const easeSilk = Easing.bezier(0.2, 0.75, 0.15, 1);

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

// How far apart (em, between two letters) a converging word starts.
export const CONVERGE_SPREAD_EM = 0.28;
// How far apart the letters of a "spread" word start (much wider: a title opening up).
export const SPREAD_START_EM = 0.6;

// `t` = time since the word started to appear, in ms.
export function motionIn(
  kind: AnimationIn,
  t: number,
  durationMs: number,
  options: MotionOptions = {},
): WordMotion {
  if (kind === "none" || durationMs <= 0) return t < 0 ? { ...RESTING, opacity: 0 } : RESTING;
  if (t < 0) return { ...RESTING, opacity: 0, reveal: 0, wipe: 0, letters: 0, grow: 0, soft: 0 };
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
    case "blurRise": {
      // comes into focus while rising a little: the word "lands" on the frame
      const eased = easeSilk(p);
      return {
        ...RESTING,
        opacity: quickOpacity(t, durationMs),
        translateYEm: (1 - eased) * 0.3,
        blurEm: (1 - eased) * 0.14,
      };
    }
    case "ink":
      // written with a pen: the visible part grows from the left, slowing down at the end
      return {
        ...RESTING,
        wipe: Easing.inOut(Easing.cubic)(p),
        opacity: interpolate(t, [0, durationMs * 0.3], [0.2, 1], clamp),
      };
    case "converge": {
      // letters far apart and out of focus gather towards the centre of the line
      const s = springAt(t, durationMs, options.spring ?? SPRINGS.soft);
      return {
        ...RESTING,
        opacity: interpolate(t, [0, durationMs * 0.45], [0, 1], clamp),
        // wide enough to read as "gathering"; the safe-zone fit makes room for it (fitPage)
        spreadEm: (1 - s) * CONVERGE_SPREAD_EM,
        blurEm: (1 - s) * 0.1,
      };
    }
    case "breathe": {
      // the letters close up gently while the word fades in
      const eased = Easing.out(Easing.cubic)(p);
      return {
        ...RESTING,
        opacity: interpolate(t, [0, durationMs * 0.7], [0, 1], { ...clamp, easing: easeSilk }),
        spreadEm: (1 - eased) * 0.1,
        blurEm: (1 - eased) * 0.04,
      };
    }
    case "riseLetters":
      // the letters are hidden under the baseline and rise one after the other (letterRiseEm)
      return { ...RESTING, letters: p };
    case "slam": {
      // rises from a little below into place, then its light swells and calms down
      const rise = easeSilk(interpolate(t, [0, Math.min(durationMs, 320)], [0, 1], clamp));
      return {
        ...RESTING,
        opacity: quickOpacity(t, durationMs),
        translateYEm: (1 - rise) * 0.45,
        light: interpolate(
          t,
          [durationMs * 0.25, durationMs * 0.5, durationMs],
          [1, 1.8, 1],
          clamp,
        ),
        grow: interpolate(t, [durationMs * 0.2, durationMs * 0.7], [0, 1], {
          ...clamp,
          easing: easeSilk,
        }),
      };
    }
    case "echo": {
      // the word settles quickly and its copies unroll in a column that stays until the caption goes
      const settle = easeOutExpo(interpolate(t, [0, durationMs * 0.5], [0, 1], clamp));
      return {
        ...RESTING,
        opacity: quickOpacity(t, durationMs),
        scale: 1.08 - 0.08 * settle,
        echo: easeSilk(p),
      };
    }
    case "whip": {
      // shoots in from the left, out of focus and a bit small, and snaps sharp in its place
      const eased = easeSilk(p);
      return {
        ...RESTING,
        opacity: quickOpacity(t, durationMs),
        translateXEm: -(1 - eased) * 0.55,
        scale: 0.85 + 0.15 * eased,
        blurEm: (1 - eased) * 0.1,
      };
    }
    case "fly": {
      // the small words come from the left, from the right or from below; a soft
      // spring carries each one a hair past its place, onto its neighbour, before it settles
      const s = springAt(t, durationMs, options.spring ?? FLY_SPRING);
      // each caption starts from another side (left, right, below), then its words take turns
      const side = ((options.index ?? 0) + Math.floor(seeded(options.seed ?? 1, 11) * 3)) % 3;
      const away = 1 - s;
      return {
        ...RESTING,
        opacity: quickOpacity(t, durationMs),
        translateXEm: side === 0 ? -away * 1.6 : side === 1 ? away * 1.6 : 0,
        translateYEm: side === 2 ? away * 1.1 : 0,
        blurEm: Math.max(0, away) * 0.16,
      };
    }
    case "rack": {
      // a focus pull: deep blur and a little small, then sharp at its size
      const eased = easeSilk(p);
      return {
        ...RESTING,
        opacity: interpolate(t, [0, durationMs * 0.5], [0, 1], clamp),
        scale: 0.9 + 0.1 * eased,
        blurEm: (1 - eased) * 0.3,
      };
    }
    case "spread": {
      // letters far apart close in on a soft spring while they come into focus
      const s = springAt(t, durationMs, options.spring ?? SPRINGS.soft);
      return {
        ...RESTING,
        opacity: interpolate(t, [0, durationMs * 0.4], [0, 1], clamp),
        spreadEm: (1 - s) * SPREAD_START_EM,
        blurEm: Math.max(0, 1 - s) * 0.08,
      };
    }
    case "drift":
      return { ...RESTING, soft: p };
    case "focus": {
      // out of a light blur, zooming back from 112 % with a small settle
      const s = springAt(t, durationMs, options.spring ?? SPRINGS.soft);
      return {
        ...RESTING,
        opacity: quickOpacity(t, durationMs),
        scale: 1.12 - 0.12 * s,
        blurEm: Math.max(0, 1 - s) * 0.08,
      };
    }
  }
}

// Each letter of a "riseLetters" word takes 45 % of the entrance; their starts are spread over the
// rest, so the word builds up from left to right like a title in a film opening.
const LETTER_SHARE = 0.45;

// How far below its place a letter still is (in em) at `progress` of the word's entrance.
export function letterRiseEm(progress: number, index: number, count: number): number {
  if (progress >= 1) return 0;
  const start = count > 1 ? (index / (count - 1)) * (1 - LETTER_SHARE) : 0;
  const local = Math.min(1, Math.max(0, (progress - start) / LETTER_SHARE));
  return (1 - easeSilk(local)) * 1.1;
}

// How far one letter of a "drift" word has come out of its blur (0 → 1): the letters start one
// after the other over the first 60 % of the entrance and each takes 40 % of it.
export function letterSoftness(progress: number, index: number, count: number): number {
  if (progress >= 1) return 1;
  const start = count > 1 ? (index / (count - 1)) * 0.6 : 0;
  return easeSilk(Math.min(1, Math.max(0, (progress - start) / 0.4)));
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
    translateXEm: a.translateXEm + b.translateXEm,
    translateYEm: a.translateYEm + b.translateYEm,
    scale: a.scale * b.scale,
    blurEm: a.blurEm + b.blurEm,
    reveal: Math.min(a.reveal, b.reveal),
    spreadEm: a.spreadEm + b.spreadEm,
    splitEm: a.splitEm + b.splitEm,
    light: a.light * b.light,
    wipe: Math.min(a.wipe, b.wipe),
    letters: Math.min(a.letters, b.letters),
    echo: a.echo + b.echo,
    grow: Math.min(a.grow, b.grow),
    soft: Math.min(a.soft, b.soft),
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

// The entrance of a caption: the style's, or one of its variants (chosen from the caption itself,
// so the preview and the export always agree).
export function entranceOf(
  page: Pick<CaptionPage, "start">,
  style: Pick<CaptionStyle, "animation" | "seed">,
): AnimationIn {
  const variants = style.animation.variants;
  if (!variants || variants.length === 0) return style.animation.in;
  const slot = Math.floor(seeded(style.seed ?? 3, Math.round(page.start / 7)) * variants.length);
  return variants[slot] ?? style.animation.in;
}

// Full motion of one word at `timeMs`.
export function wordMotionAt(
  page: CaptionPage,
  wordIndex: number,
  timeMs: number,
  style: Pick<CaptionStyle, "reveal" | "animation" | "seed">,
): WordMotion {
  // the key word may have its own entrance; styles with variants give each caption its own
  const own = page.words[wordIndex]?.emphasis ? style.animation.emphasis : undefined;
  const appear = motionIn(
    own?.in ?? entranceOf(page, style),
    timeMs - wordAppearAt(page, wordIndex, style) - (own?.delayMs ?? 0),
    own?.inMs ?? style.animation.inMs,
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

// Liquid fill: how full the word is (0 → 1). It follows the voice but never rushes: a short word
// still takes `minMs` to fill, so the liquid can be seen rising.
export function liquidLevel(
  word: Pick<CaptionWord, "start" | "end">,
  timeMs: number,
  minMs: number,
): number {
  const start = word.start - ACTIVE_LEAD_MS;
  const duration = Math.max(minMs, word.end - word.start);
  return interpolate(timeMs, [start, start + duration], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
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
    Math.abs(now.translateXEm - before.translateXEm) +
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
  const length = (line: number[]) =>
    line.reduce(
      (sum, index, position) => sum + (words[index]?.text.length ?? 0) + (position ? 1 : 0),
      0,
    );
  // one line when it fits, else lines of close length, cut where the sentence allows it
  // ("Salut, je viendrai" / "chez toi demain !", never "chez" / "toi"). A long sentence (or captions
  // glued by hand) gets three lines or more instead of two over-long ones.
  const split = (line: number[]): number[][] => {
    const count = Math.ceil(length(line) / style.maxCharsPerLine);
    if (line.length < 2 || count <= 1) return [line];
    const cut = bestCut(
      line.map((index) => words[index]?.text ?? ""),
      { balance: 12, firstShare: count > 2 ? 1 / count : undefined },
    );
    if (count <= 2) return [line.slice(0, cut), line.slice(cut)];
    return [line.slice(0, cut), ...split(line.slice(cut))];
  };
  if (style.layout === "stack") {
    // the small words around the key word get the same care: a long lead-in is set on two lines
    // instead of one tiny line
    const key = words.findIndex((word) => word.emphasis);
    if (key < 0) return split(indices);
    return [...split(indices.slice(0, key)), [key], ...split(indices.slice(key + 1))].filter(
      (line) => line.length > 0,
    );
  }
  return split(indices);
}
